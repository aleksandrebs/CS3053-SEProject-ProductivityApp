# Backend (FastAPI)

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000/docs for the auto API page.

## Notes

- Uses a local sqlite file `app.db` by default
- Existing mobile screens still use `/signup` and `/login`
- Session routes need `Authorization: Bearer <access_token>` from login/signup
- If you change models a lot, delete `app.db` and run the server again so tables recreate
