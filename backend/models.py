import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from database import Base


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    device_token = Column(String(512), nullable=True)
    timezone = Column(String(64), default="UTC")
    created_at = Column(DateTime, default=datetime.utcnow)

    reminders = relationship("Reminder", back_populates="user")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    message_text = Column(String(1000), nullable=False)
    audio_url = Column(String(1000), nullable=True)
    alarm_at = Column(DateTime, nullable=False)
    repeat_type = Column(
        SAEnum("once", "daily", "weekdays", "weekends", name="repeat_type"),
        default="once",
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="reminders")
    logs = relationship("AlarmLog", back_populates="reminder")


class AlarmLog(Base):
    __tablename__ = "alarm_logs"

    id = Column(String(36), primary_key=True, default=_uuid)
    reminder_id = Column(String(36), ForeignKey("reminders.id"), nullable=False)
    fired_at = Column(DateTime, default=datetime.utcnow)
    status = Column(
        SAEnum("delivered", "missed", "snoozed", name="alarm_status"),
        nullable=False,
    )

    reminder = relationship("Reminder", back_populates="logs")
