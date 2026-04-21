import os
import json
import uuid
import logging
from datetime import datetime, timedelta

import azure.functions as func
import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ["DATABASE_URL"]
FIREBASE_CREDENTIALS_JSON = os.environ["FIREBASE_CREDENTIALS_JSON"]

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# Initialize Firebase once
_firebase_app = None


def _get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        cred_dict = json.loads(FIREBASE_CREDENTIALS_JSON)
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


app = func.FunctionApp()


@app.timer_trigger(
    schedule="0 */1 * * * *",   # every 60 seconds
    arg_name="timer",
    run_on_startup=False,
)
def alarm_scheduler(timer: func.TimerRequest) -> None:
    _get_firebase_app()
    now = datetime.utcnow()
    window_end = now + timedelta(seconds=60)

    with Session() as db:
        rows = db.execute(
            text(
                """
                SELECT r.id, r.user_id, r.message_text, r.audio_url,
                       r.alarm_at, r.repeat_type, u.device_token
                FROM reminders r
                JOIN users u ON u.id = r.user_id
                WHERE r.alarm_at >= :now
                  AND r.alarm_at < :window_end
                  AND r.is_active = 1
                  AND u.device_token IS NOT NULL
                """
            ),
            {"now": now, "window_end": window_end},
        ).fetchall()

        for row in rows:
            reminder_id = row.id
            device_token = row.device_token

            try:
                message = messaging.Message(
                    token=device_token,
                    data={
                        "type": "alarm",
                        "reminder_id": reminder_id,
                        "audio_url": row.audio_url or "",
                        "message_text": row.message_text,
                    },
                    android=messaging.AndroidConfig(priority="high"),
                    apns=messaging.APNSConfig(
                        headers={"apns-priority": "10"},
                        payload=messaging.APNSPayload(
                            aps=messaging.Aps(content_available=True)
                        ),
                    ),
                )
                messaging.send(message)
                log_status = "delivered"
                logging.info("FCM sent for reminder %s", reminder_id)
            except Exception as exc:
                log_status = "missed"
                logging.error("FCM failed for reminder %s: %s", reminder_id, exc)

            # Write alarm log
            db.execute(
                text(
                    """
                    INSERT INTO alarm_logs (id, reminder_id, fired_at, status)
                    VALUES (:id, :reminder_id, :fired_at, :status)
                    """
                ),
                {
                    "id": str(uuid.uuid4()),
                    "reminder_id": reminder_id,
                    "fired_at": now,
                    "status": log_status,
                },
            )

            # Advance alarm_at for repeating reminders
            new_alarm_at = _next_alarm(row.alarm_at, row.repeat_type)
            if new_alarm_at:
                db.execute(
                    text(
                        "UPDATE reminders SET alarm_at = :alarm_at WHERE id = :id"
                    ),
                    {"alarm_at": new_alarm_at, "id": reminder_id},
                )
            elif row.repeat_type == "once":
                db.execute(
                    text("UPDATE reminders SET is_active = 0 WHERE id = :id"),
                    {"id": reminder_id},
                )

        db.commit()


def _next_alarm(alarm_at: datetime, repeat_type: str):
    """Return next alarm datetime for repeating reminders, or None."""
    if repeat_type == "once":
        return None
    if repeat_type == "daily":
        return alarm_at + timedelta(days=1)
    if repeat_type == "weekdays":
        next_dt = alarm_at + timedelta(days=1)
        # Skip Saturday (5) and Sunday (6)
        while next_dt.weekday() >= 5:
            next_dt += timedelta(days=1)
        return next_dt
    if repeat_type == "weekends":
        next_dt = alarm_at + timedelta(days=1)
        while next_dt.weekday() < 5:
            next_dt += timedelta(days=1)
        return next_dt
    return None
