# Provify

**Automated bug verification for Android apps using AI agents.**

Provify uses [DroidRun](https://github.com/droidrun/droidrun) to automatically reproduce user-reported bugs on real Android devices — no more manual testing.

---

## Quick Start

### 1. Backend (FastAPI)

```bash
cd Provify-Backend
pip install -r requirements.txt
set GEMINI_API_KEY=your_key_here
python -m uvicorn api:app --reload --port 8000
```

### 2. Frontend (React + Vite)

```bash
cd Provify-Frontend
npm install
npm run dev
```

### 3. Open in Browser
http://localhost:5173


## The Problem

- Users report bugs with vague descriptions
- Developers spend hours trying to reproduce them
- 30% of bugs can't be reproduced manually
- Testing across 24,000+ Android devices is impossible

## The Solution

```
Bug Report → AI Agent → Real Device → Verified
```

Provify takes a bug description like *"app crashes when uploading photo"* and uses an AI agent to actually reproduce it on a connected Android device.

---

## Features

| Feature | Description |
|---------|-------------|
| AI Bug Reproduction | Describe bugs in plain English, AI figures out the steps |
| Auto Package Detection | Just type "Instagram", AI resolves to `com.instagram.android` |
| Smart Deduplication | Similar bugs are merged automatically |
| Real Device Testing | Works with emulators or USB-connected devices |
| Verification Workflow | Pending → Verified → Fixed → Re-verified |

---

## Project Structure

```
Provify/
├── Provify-Backend/       # FastAPI + DroidRun
│   ├── api.py            # REST endpoints
│   ├── bug_verifier.py   # AI verification logic
│   ├── issue_manager.py  # Bug storage & deduplication
│   └── models.py         # Pydantic models
│
└── Provify-Frontend/      # React + Vite + shadcn/ui
    └── src/
        ├── pages/        # Dashboard, Bugs, Hero
        └── components/   # UI components
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bugs` | List all bugs |
| `POST` | `/bugs` | Create bug (app_package optional) |
| `POST` | `/bugs/{id}/verify` | Trigger AI verification |
| `POST` | `/bugs/{id}/fix` | Mark as fixed |
| `GET` | `/stats` | Dashboard statistics |
| `POST` | `/sync` | Sync bugs from file |

---

## Requirements

- Python 3.10+
- Node.js 18+
- Android device/emulator with ADB
- Gemini API key

---

## Limitations

- One device at a time
- App must be pre-installed
- Can't simulate network conditions
- Can't access account-gated features
- Limitations with messaging and file handling

---

