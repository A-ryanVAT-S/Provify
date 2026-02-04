# Provify

**Automated bug verification for Android apps using AI agents.**

Provify uses [DroidRun](https://github.com/droidrun/droidrun) to automatically reproduce user-reported bugs on real Android devices — no more manual testing.

---

## Quick Start

### 1. Backend (FastAPI)

```bash

cd Provify-Backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
set GOOGLE_API_KEY=your_key_here  #add this in .env also
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
| Real Device Testing | Works with emulators or USB-connected devices |
| Verification Workflow | Pending → Verified → Fixed → Re-verified |
| Detailed Execution Reports | View actual steps executed by AI agent during verification |

---

## Verification Reports

Each bug verification generates a detailed report with:

- **Summary**: Overall result with confidence level (HIGH/MEDIUM/LOW)
- **Device Info**: Which device was used (auto-detected from connected USB devices)
- **Steps Executed**: Actual actions performed by the AI agent
  - App launches, taps, swipes, text input
  - Agent reasoning at each step
  - Execution results and observations
- **Observations**: What the agent saw during testing
---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/stats` | Get bug statistics (total, pending, verified, fixed) |
| `GET` | `/devices` | Get connected devices info (count, status) |
| `GET` | `/bugs` | List all bugs (optional filters: status, app_package) |
| `GET` | `/bugs/{id}` | Get specific bug by ID |
| `POST` | `/bugs` | Create single bug (app_package optional) |
| `POST` | `/bugs/bulk` | Create multiple bugs |
| `POST` | `/bugs/bulk-upload` | Bulk upload bugs from JSON array |
| `POST` | `/bugs/{id}/verify` | Verify bug using DroidRun AI agent |
| `POST` | `/bugs/verify-all` | Verify all pending bugs in parallel |
| `POST` | `/bugs/{id}/fix` | Mark bug as fixed |
| `POST` | `/bugs/reverify-fixed` | Re-verify all fixed bugs for regressions |
| `PATCH` | `/bugs/{id}` | Update bug status/notes |
| `DELETE` | `/bugs/{id}` | Delete bug |
| `POST` | `/load-from-file` | Load bugs from bugs.json file |

---

## Multi-Device Parallel Testing

Connect multiple Android devices via USB and Provify will test each bug on ALL devices simultaneously:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Single Bug                              │
│                    "App crashes on upload"                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Device Pool Manager                          │
│         Auto-detects all USB devices • Tests in parallel        │
└─────────────────────────────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                  ▼                  ▼
      ┌─────────┐        ┌─────────┐        ┌─────────┐
      │ Pixel 7 │        │ Samsung │        │ OnePlus │
      │   ✓     │        │   ✓     │        │   ✗     │
      └─────────┘        └─────────┘        └─────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Aggregated Results                          │
│  Devices Tested: 3  |  Reproduced: 2/3  |  Confidence: HIGH     │
└─────────────────────────────────────────────────────────────────┘
```

- **Single or multiple devices** - works with 1 to N devices
- **Parallel execution** - all devices test simultaneously
- **Aggregated results** - see reproduction rate across devices
- **Majority voting** - bug status based on device consensus
- **Higher confidence** - more devices = more reliable results

---

## Requirements

- Python 3.10+
- Node.js 18+
- Android device/emulator with ADB
- Gemini API key

---

## Limitations

- App must be pre-installed
- Can't simulate network conditions
- Can't access account-gated features
- Limitations with messaging and file handling

---