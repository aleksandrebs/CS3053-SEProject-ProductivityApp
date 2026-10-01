# API Contract

## Purpose

This file is so frontend and backend use the same endpoints and JSON.

App talks to FastAPI with HTTP. FastAPI talks to Postgres.

```text
Expo / React Native -> FastAPI -> PostgreSQL
```

---

## General rules

- JSON in and out
- Protected routes use: `Authorization: Bearer <token>`
- Do not send password hashes back to the app
- Simple error format:

```json
{
  "detail": "something went wrong"
}
```

Common codes:
- 400 bad input
- 401 not logged in
- 403 not allowed
- 404 not found
- 409 conflict (email already used, etc.)

Dev base URL example: `http://localhost:8000`

---

## Build first

Right now we mainly need auth + sessions because of the login and timer tickets.

---

## Auth

### POST /auth/register

```json
{
  "name": "Jonah Ortega",
  "aup_email": "jortega@aup.edu",
  "username": "jonah",
  "password": "secret123"
}
```

Response 201:

```json
{
  "user": {
    "id": "1",
    "name": "Jonah Ortega",
    "aup_email": "jortega@aup.edu",
    "username": "jonah",
    "token_balance": 0,
    "current_streak": 0,
    "total_study_time": 0
  },
  "access_token": "token-here",
  "token_type": "bearer"
}
```

409 if email or username is taken.

### POST /auth/login

```json
{
  "aup_email": "jortega@aup.edu",
  "password": "secret123"
}
```

Response 200 looks like register (user + access_token).
401 if password is wrong.

### GET /auth/me

Needs auth. Returns the current user object (no password).

---

## Sessions

Session object example:

```json
{
  "id": "10",
  "user_id": "1",
  "planned_duration": 25,
  "start_time": "2026-10-01T10:00:00Z",
  "end_time": null,
  "actual_duration": null,
  "status": "active",
  "tokens_earned": 0
}
```

status values: active, completed, cancelled

### POST /sessions

Starts a session. Needs auth.

```json
{
  "planned_duration": 25
}
```

Returns the new session with status active.

The phone handles the countdown. Backend just stores that it started.

### POST /sessions/{id}/complete

Needs auth.

```json
{
  "actual_duration": 25
}
```

Backend should:
1. make sure the session belongs to this user
2. make sure it is still active
3. mark it completed
4. give tokens (for now we can do 1 token per minute)
5. add a token_transactions earn row
6. update the user balance / streak stuff
7. return the session plus new balance

Example response:

```json
{
  "session": {
    "id": "10",
    "user_id": "1",
    "planned_duration": 25,
    "start_time": "2026-10-01T10:00:00Z",
    "end_time": "2026-10-01T10:25:00Z",
    "actual_duration": 25,
    "status": "completed",
    "tokens_earned": 25
  },
  "token_balance": 37,
  "current_streak": 4
}
```

If they already completed/cancelled it, return 409.

### POST /sessions/{id}/cancel

Needs auth. Sets status to cancelled and tokens_earned to 0. No reward tokens.

### GET /sessions

Needs auth. Returns the current users sessions. Optional query: status, limit.

### GET /sessions/{id}

Needs auth. One session if it belongs to them.

---

## Tokens

### GET /tokens/balance

Needs auth.

```json
{
  "token_balance": 37
}
```

---

## Rewards (can wait a bit)

### GET /rewards

Returns available rewards.

### POST /rewards/{id}/redeem

Needs auth. If they have enough tokens, create a redemption and lower balance.

400 if not enough tokens.

---

## Friends / leaderboard later

We can add these when we get there:

- GET /users/search?q=
- POST /friends/requests
- POST /friends/requests/{id}/accept
- GET /friends
- GET /leaderboard?period=week

---

## Quick reminder about the timer

- Mobile app: show countdown / finish time
- Backend: save session + give tokens only when complete
- Distraction blocking is mostly phone/OS side, not really an API thing for MVP

Field names here should match docs/db-schema.md so we do not invent different names in different PRs.
