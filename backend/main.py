import uuid
import base64
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
import auth
import tts
import storage
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="VoiceReminder API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ──────────────────────────────────────────────────────────────────────

@app.post("/api/auth/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        name=payload.name,
        email=payload.email,
        password_hash=auth.hash_password(payload.password),
        timezone=payload.timezone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": auth.create_access_token(user.id)}


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not auth.verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": auth.create_access_token(user.id)}


# ── TTS Preview ───────────────────────────────────────────────────────────────

@app.post("/api/tts/preview")
def preview_tts(
    payload: schemas.TtsPreviewRequest,
    current_user: models.User = Depends(auth.get_current_user),
):
    if not payload.message_text.strip():
        raise HTTPException(status_code=400, detail="Message text is required")
    try:
        mp3_bytes = tts.synthesize_to_mp3(payload.message_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return {"audio_base64": base64.b64encode(mp3_bytes).decode()}


# ── Reminders ─────────────────────────────────────────────────────────────────

@app.get("/api/reminders", response_model=list[schemas.ReminderOut])
def list_reminders(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Reminder)
        .filter(
            models.Reminder.user_id == current_user.id,
            models.Reminder.is_active == True,
        )
        .order_by(models.Reminder.alarm_at)
        .all()
    )


@app.post("/api/reminders", response_model=schemas.ReminderOut, status_code=201)
def create_reminder(
    payload: schemas.ReminderCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    # Update device token if provided
    if payload.device_token:
        current_user.device_token = payload.device_token
        db.add(current_user)

    # Synthesize speech
    try:
        mp3_bytes = tts.synthesize_to_mp3(payload.message_text)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    # Upload to Blob Storage
    file_name = f"{uuid.uuid4()}.mp3"
    try:
        audio_url = storage.upload_mp3(mp3_bytes, current_user.id, file_name)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {exc}")

    reminder = models.Reminder(
        user_id=current_user.id,
        message_text=payload.message_text,
        audio_url=audio_url,
        alarm_at=payload.alarm_at,
        repeat_type=payload.repeat_type,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


@app.patch("/api/reminders/{reminder_id}", response_model=schemas.ReminderOut)
def update_reminder(
    reminder_id: str,
    payload: schemas.ReminderUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    reminder = _get_owned_reminder(reminder_id, current_user.id, db)
    for field, value in payload.model_dump(exclude_none=True).items():
        if field == "device_token":
            current_user.device_token = value
            db.add(current_user)
        else:
            setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


@app.delete("/api/reminders/{reminder_id}", status_code=204)
def delete_reminder(
    reminder_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    reminder = _get_owned_reminder(reminder_id, current_user.id, db)
    reminder.is_active = False
    db.commit()


def _get_owned_reminder(reminder_id: str, user_id: str, db: Session) -> models.Reminder:
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    if reminder.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your reminder")
    return reminder


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}
