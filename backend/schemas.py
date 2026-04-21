from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    timezone: str = "UTC"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    timezone: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReminderCreate(BaseModel):
    message_text: str
    alarm_at: datetime
    repeat_type: str = "once"
    device_token: Optional[str] = None


class ReminderUpdate(BaseModel):
    is_active: Optional[bool] = None
    alarm_at: Optional[datetime] = None
    repeat_type: Optional[str] = None
    device_token: Optional[str] = None


class ReminderOut(BaseModel):
    id: str
    user_id: str
    message_text: str
    audio_url: Optional[str]
    alarm_at: datetime
    repeat_type: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
