# Backend (FastAPI)

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run locally

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open http://localhost:8000/docs for the auto API page.

By default this uses a local SQLite file `app.db`. To use Postgres locally:

```bash
export DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Deploy on Vercel

1. Create a free Postgres database (Neon, Supabase, or Vercel Storage → Postgres).
2. Copy the connection string (prefer the **pooled** URL if Neon offers one).
3. In Vercel: **Add New Project** → import this repo → set **Root Directory** to `backend`.
4. Under Environment Variables, add:
   - `DATABASE_URL` = your Postgres connection string
5. Deploy. Your API URL will look like `https://something.vercel.app`.
6. Check `https://your-api.vercel.app/health` and `/docs`.

Or from the CLI (logged in with `npx vercel login`):

```bash
cd backend
npx vercel
# set DATABASE_URL when prompted / in the dashboard, then:
npx vercel --prod
```

## Notes

- Local default is SQLite (`app.db`); Vercel should use Postgres via `DATABASE_URL`
- Existing mobile/web screens still use `/signup` and `/login`
- Session routes need `Authorization: Bearer <access_token>` from login/signup
- Streak routes: `GET /streak` and `POST /streak/check-in` (the app calls check-in when the timer starts)
- If you change models a lot on SQLite, delete `app.db` and run the server again so tables recreate
