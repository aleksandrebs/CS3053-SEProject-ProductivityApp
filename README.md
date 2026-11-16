# CS3053-SEProject-ProductivityApp

This is the repository for our AUP CS3053 Software Engineering Fall26 class project.

## Documentation

- [Product Definition](docs/product.md)
- [Architecture](docs/architecture.md)
- [Team Roles](docs/Project-Roles.md)
- [DB Schema](docs/db-schema.md)
- [API Contract](docs/api-contract.md)

## Backend

See [backend/README.md](backend/README.md) for how to run the FastAPI server.

## Deploy on Vercel (browser link, no Expo Go)

You need **two** Vercel projects plus a **Postgres** database.

### 1. Postgres

Create a free DB on [Neon](https://neon.tech) (or Supabase / Vercel Postgres). Copy the connection string. Prefer Neon’s **pooled** URL if available.

### 2. Backend API

1. Vercel → New Project → this repo → **Root Directory** = `backend`
2. Env var: `DATABASE_URL` = your Postgres URL
3. Deploy → note the URL, e.g. `https://aup-api.vercel.app`
4. Open `/health` and `/docs` to confirm

### 3. Web app

1. Vercel → New Project → same repo → **Root Directory** = `product`
2. Env var: `EXPO_PUBLIC_API_URL` = the backend URL from step 2 (no trailing slash)
3. Deploy → share that link; classmates open it in a browser

CLI alternative (after `npx vercel login`):

```bash
cd backend && npx vercel --prod
cd ../product && EXPO_PUBLIC_API_URL=https://YOUR-API.vercel.app npx vercel --prod
```

Local web check before deploying:

```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000
# other terminal
cd product && npx expo start --web
```
