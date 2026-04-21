# VoiceReminder

A mobile app where you type a custom message, set a time, and the app speaks it back as a voice alarm at the exact scheduled moment.

## Architecture

```
┌─────────────────┐    HTTPS     ┌──────────────────────────┐
│  React Native   │◄────────────►│  FastAPI on Azure App     │
│  (Expo)         │              │  Service B1               │
└─────────────────┘              └──────────┬───────────────┘
        │                                   │
        │ FCM Push                          │ Azure Cognitive
        │                          ┌────────┴───────────┐
        │                          │  Services (TTS)     │
        │                          └────────┬───────────┘
        │                                   │ MP3
        │                          ┌────────▼───────────┐
        │                          │  Azure Blob Storage │
        │                          └────────────────────┘
        │
        │  ┌──────────────────────────────────────────┐
        └──┤  Azure Function (timer, every 60s)        │
           │  → queries Azure SQL                      │
           │  → sends FCM push with audio_url          │
           └──────────────────────────────────────────┘
```

## Repository Layout

```
Voice-Reminder/
├── backend/                  # FastAPI Python app
│   ├── main.py               # All API endpoints
│   ├── models.py             # SQLAlchemy ORM models
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── auth.py               # JWT helpers
│   ├── tts.py                # Azure Neural TTS synthesis
│   ├── storage.py            # Azure Blob Storage upload
│   ├── database.py           # DB engine + session
│   ├── requirements.txt
│   └── Dockerfile
├── alarm-scheduler/          # Azure Function (timer trigger)
│   ├── function_app.py       # Timer function: query DB → FCM push
│   ├── requirements.txt
│   ├── host.json
│   └── local.settings.json   # (git-ignored, use .env.example)
└── mobile/                   # React Native Expo (TypeScript)
    ├── app/                  # Expo Router file-based navigation
    │   ├── _layout.tsx       # Root layout + auth gate
    │   ├── index.tsx         # Redirect to login
    │   ├── (auth)/           # Login / Register screens
    │   └── (app)/            # Home + Create screens (protected)
    ├── src/
    │   ├── screens/          # Screen components
    │   ├── services/         # api.ts, auth.ts, notifications.ts
    │   ├── store/            # Zustand stores (auth, reminders)
    │   └── types/            # Shared TypeScript types
    ├── app.json
    ├── package.json
    └── tsconfig.json
```

## Database Schema

| Table | Key Columns |
|---|---|
| `users` | id, name, email, password_hash, device_token, timezone |
| `reminders` | id, user_id, message_text, audio_url, alarm_at, repeat_type, is_active |
| `alarm_logs` | id, reminder_id, fired_at, status (delivered/missed/snoozed) |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Create user, returns JWT |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/reminders` | JWT | List active reminders |
| POST | `/api/reminders` | JWT | Create reminder → TTS → Blob → DB |
| PATCH | `/api/reminders/{id}` | JWT | Toggle active / update fields |
| DELETE | `/api/reminders/{id}` | JWT | Soft-delete (is_active = false) |
| GET | `/health` | — | Health check |

## Setup

### 1. Copy environment variables
```bash
cp .env.example .env
# Fill in all values
```

### 2. Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### 3. Azure Function (local)
```bash
cd alarm-scheduler
pip install -r requirements.txt
func start
```

### 4. Mobile
```bash
cd mobile
npm install
# Create mobile/.env with EXPO_PUBLIC_API_URL=http://localhost:8000
npx expo start
```

## Alarm Flow

1. User creates a reminder — backend calls Azure TTS, uploads MP3 to Blob Storage, saves row.
2. Azure Function runs every 60 s, finds reminders with `alarm_at` in the upcoming window.
3. Sends FCM data-push `{ type: "alarm", audio_url, message_text }` to the user's device.
4. Mobile app receives the push and plays the MP3 via `expo-av`.
5. `alarm_at` is advanced for repeating reminders (`daily`, `weekdays`, `weekends`).

## Environment Variables

See `.env.example` for the full list with descriptions.
