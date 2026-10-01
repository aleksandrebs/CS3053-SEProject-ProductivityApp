# Database Schema

## Overview

This is the first database layout for the AUP Productivity App.

Stack we are using:

```text
Mobile (Expo / React Native) -> FastAPI -> PostgreSQL
```

We will use SQLAlchemy for the tables/models. For now these are the main tables we need:

- users
- study_sessions
- token_transactions
- rewards
- redemptions
- friendships
- streaks

We are not making a separate leaderboard table. We can calculate leaderboard stuff from study sessions and streaks.

---

## How the tables connect

```text
users
  has many study_sessions
  has many token_transactions
  has one streak row
  has many redemptions
  can send/receive friendships

rewards
  has many redemptions
```

---

## users

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID or BIGSERIAL | primary key |
| name | VARCHAR(120) | display name |
| aup_email | VARCHAR(255) | unique, required |
| username | VARCHAR(50) | unique, required |
| password_hash | VARCHAR(255) | hashed password only |
| token_balance | INTEGER | default 0 |
| current_streak | INTEGER | default 0 |
| total_study_time | INTEGER | total completed minutes, default 0 |
| created_at | TIMESTAMPTZ | when account was made |
| updated_at | TIMESTAMPTZ | last update |

Rules:
- email and username have to be unique
- token_balance should not go below 0
- never store plain text passwords

---

## study_sessions

This is one timer run.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID or BIGSERIAL | primary key |
| user_id | FK users.id | who studied |
| planned_duration | INTEGER | minutes they picked |
| start_time | TIMESTAMPTZ | when they started |
| end_time | TIMESTAMPTZ | nullable until finished |
| actual_duration | INTEGER | minutes actually done, nullable |
| status | VARCHAR(20) | active / completed / cancelled |
| tokens_earned | INTEGER | default 0 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Rules:
- planned_duration has to be > 0
- cancelled sessions get 0 tokens
- only completed sessions should update totals and streaks

Useful indexes:
- user_id (history page)
- status (find active session)
- start_time (weekly stats)

---

## token_transactions

Basically a history of token changes.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID or BIGSERIAL | primary key |
| user_id | FK users.id | |
| amount | INTEGER | always positive |
| type | VARCHAR(20) | earn or spend |
| reason | VARCHAR(50) | like session_complete or reward_redeem |
| related_session_id | FK study_sessions.id | nullable |
| related_redemption_id | FK redemptions.id | nullable |
| created_at | TIMESTAMPTZ | |

Rules:
- amount > 0
- type is only earn or spend
- if they cancel a session, do not make an earn row

---

## rewards

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID or BIGSERIAL | primary key |
| name | VARCHAR(120) | |
| description | TEXT | optional |
| token_cost | INTEGER | |
| available | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | |

token_cost has to be > 0.

---

## redemptions

When someone spends tokens on a reward.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID or BIGSERIAL | primary key |
| user_id | FK users.id | |
| reward_id | FK rewards.id | |
| token_cost | INTEGER | cost at the time they redeemed |
| status | VARCHAR(20) | pending / completed / cancelled |
| created_at | TIMESTAMPTZ | |

For the class MVP we can just mark these completed even if we are not buying real gift cards yet.

---

## friendships

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID or BIGSERIAL | primary key |
| requester_id | FK users.id | person who sent request |
| addressee_id | FK users.id | person who got it |
| status | VARCHAR(20) | pending / accepted / rejected |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

Requester and addressee cannot be the same user. Keep one row per pair.

---

## streaks

| Column | Type | Notes |
| --- | --- | --- |
| user_id | FK users.id | one row per user |
| current_streak | INTEGER | default 0 |
| last_study_date | DATE | nullable |
| updated_at | TIMESTAMPTZ | |

If they miss a day we can reset the streak. users.current_streak can just mirror this so the app can read it easily.

---

## What to build first

For the tickets we have now:

1. users
2. study_sessions
3. token_transactions

Rewards / friends / streaks can come after login and timer are working.
