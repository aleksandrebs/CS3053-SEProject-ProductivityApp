# Architecture

## Purpose

The purpose of this document is to define the first version of the AUP Student Productivity App system architecture.

The goal of this project is not only to build a working productivity app. The goal is also to understand how professional software systems are designed before they are implemented.

This document explains how the main parts of the application will connect:

* Mobile app (Expo / React Native)
* FastAPI backend
* PostgreSQL database

The architecture will guide the next phases of the project, including backend development, database design, API creation, frontend development, testing, Docker, CI/CD, and deployment.

## System Overview

The Productivity App will be a full-stack mobile application.

A student will interact with the application through a phone. The phone will run the Expo / React Native frontend. The frontend will send HTTP requests to the FastAPI backend. The FastAPI backend will process those requests and communicate with the PostgreSQL database to create, read, update, and delete app data.

The system follows this basic structure:

```text
Mobile App (Expo / React Native)
        ↓ HTTP / JSON
FastAPI Backend
        ↓ SQLAlchemy / SQL
PostgreSQL Database
```

Each layer has a specific responsibility.

* The frontend is responsible for what the user sees and interacts with.
* The backend is responsible for API routes, business logic, validation, and communication with the database.
* The database is responsible for storing user, study, token, reward, and social data permanently.

## Architecture Diagram

```text
Student Phone
- Opens the app
- Starts study sessions
- Views tokens, rewards, friends, leaderboard

Expo / React Native Frontend
- Screens and navigation
- Forms and timers
- Local UI state
- API calls
        ↓
FastAPI Backend
- Auth and account endpoints
- Study session endpoints
- Token and reward endpoints
- Friends / streak / leaderboard endpoints
- Validation and business rules
        ↓
PostgreSQL
- users
- study_sessions
- token_transactions
- rewards
- redemptions
- friendships
- streaks
```

## Main Components

### Mobile App (Expo / React Native)

The mobile app is where the student uses the product.

The student should be able to:

* create an account and log in
* start, cancel, and complete study sessions
* see remaining timer time
* view token balance and rewards
* add friends
* view streaks, history, and leaderboard

The phone app does not permanently store the main application data. It displays the UI and sends user actions to the backend.

Responsibilities include:

* displaying screens and navigation
* showing the study timer
* handling user input
* requesting device permissions needed for distraction blocking
* sending requests to the backend API
* displaying success or error messages
* updating the UI based on backend responses

The frontend should not directly access the database.

Instead, the frontend should communicate with the backend through HTTP requests.

Example frontend action:

```text
User starts a study session
→ React Native collects session settings
→ App sends POST request to backend
→ Backend creates a study session record
→ App shows the active timer
```

### FastAPI Backend

The FastAPI backend is the server-side application.

Its responsibilities include:

* defining API endpoints
* receiving requests from the mobile app
* validating incoming data
* applying business rules
* calculating tokens for completed sessions
* reading and writing database records
* returning JSON responses to the frontend
* handling errors in a predictable way

The backend is the middle layer between the frontend and the database.

The frontend should not need to know how the database works. It should only need to know which API endpoints are available.

### PostgreSQL Database

PostgreSQL is the database used to store application data.

The database is responsible for keeping records even after the application is closed or restarted.

The first main tables will likely include:

* `users`
* `study_sessions`
* `token_transactions`
* `rewards`
* `redemptions`
* `friendships`
* `streaks`

SQLAlchemy will be used for models, database access, and migrations.

## Data Model Overview

### User

Stores student account information.

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| name | Student name |
| aup_email | AUP email address |
| username | Public username |
| password_hash | Secure password storage |
| token_balance | Current token count |
| current_streak | Current study streak |
| total_study_time | Total completed study time |
| created_at | Account creation timestamp |

### Study Session

Stores one study attempt.

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| user_id | Student who ran the session |
| start_time | When the session started |
| end_time | When the session ended |
| duration | Length of the session |
| completed | Whether the session finished successfully |
| tokens_earned | Tokens awarded for the session |

### Token Transaction

Records when tokens are earned or spent.

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| user_id | Student involved |
| amount | Tokens added or removed |
| type | Earn or spend |
| related_id | Related session or redemption |
| created_at | Transaction timestamp |

### Reward

Stores available rewards and prices.

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| name | Reward name |
| description | Short explanation |
| token_cost | Tokens required |
| available | Whether the reward can currently be redeemed |

### Redemption

Records rewards purchased by users.

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| user_id | Student who redeemed |
| reward_id | Reward selected |
| token_cost | Tokens spent |
| status | Pending, completed, or cancelled |
| created_at | Redemption timestamp |

### Friendship

Stores friend relationships and requests.

| Field | Purpose |
| --- | --- |
| id | Unique identifier |
| requester_id | Student who sent the request |
| addressee_id | Student who received the request |
| status | Pending, accepted, or rejected |
| created_at | Request timestamp |

### Streak

Stores or calculates consecutive study days.

| Field | Purpose |
| --- | --- |
| user_id | Student |
| current_streak | Consecutive days completed |
| last_study_date | Last day with enough completed study time |

Leaderboard rankings can mainly be calculated from study-session and streak data.

## Request Flow

### Example: Completing a Study Session

```text
User finishes a study timer
↓
Mobile app sends POST /sessions/{id}/complete
↓
FastAPI backend receives the request
↓
Backend checks that the session belongs to the user
↓
Backend marks the session as completed
↓
Backend calculates tokens
↓
Backend updates token balance and creates a token transaction
↓
Backend updates streak if needed
↓
Backend returns updated session + token info as JSON
↓
Mobile app shows success and new token balance
```

### Example: Redeeming a Reward

```text
User chooses a reward
↓
Mobile app sends POST /rewards/{id}/redeem
↓
Backend checks token balance and reward availability
↓
Backend subtracts tokens and creates a redemption record
↓
Backend returns redemption status
↓
Mobile app shows confirmation and updated balance
```

## Technical Decisions

| Decision | Chosen | Why |
| --- | --- | --- |
| Mobile frontend | Expo / React Native | Lets the team build one mobile app for iOS and Android for AUP students |
| Backend API | FastAPI | Simple Python API framework that works well with SQLAlchemy and college project needs |
| Database | PostgreSQL | Reliable relational database for users, sessions, tokens, and relationships |
| ORM / migrations | SQLAlchemy | Keeps database models and migrations organized |
| Source control | Git / GitHub | Supports branching, pull requests, and team collaboration |
| Containers | Docker | Helps keep local and deployed environments consistent |

## Environments

As the project develops, the team may use:

* **Development** — local work on features
* **Staging** — test builds before release
* **Production** — the live app used by students

Secrets such as database credentials and API keys must not be stored directly in public source code.

Logging should be included so errors can be found more easily.

## Non-Functional Architecture Goals

* **Usability:** Starting a study session should require very few steps.
* **Performance:** Common actions like opening the leaderboard or checking tokens should feel quick under normal usage.
* **Security:** Passwords must be hashed. Secrets must stay out of public code.
* **Privacy:** Only collect information needed for the service. Private account details should not be shown to other users without a reason.
* **Reliability:** Completed sessions and token transactions must be stored correctly.
* **Maintainability:** Code should be organized so teammates can work on separate features without constantly editing the same files.

## Current Project Layout

```text
CS3053-SEProject-ProductivityApp/
├── README.md
├── docs/
│   ├── product.md
│   ├── Architecture.md
│   └── Project-Roles.md
└── product/                # Expo / React Native mobile app
    ├── App.js
    ├── package.json
    └── assets/
```

Backend, Docker, and CI/CD pieces will be added as Sprint 0 and later sprints continue.

## Team Architecture Ownership

| Role | Member | Architecture focus |
| --- | --- | --- |
| Product Owner | Sashka | Product vision, MVP scope, backlog, and story acceptance |
| Scrum Master | Madi | Sprint process, planning, and progress tracking |
| DevOps Engineer | Jonah | Environments, FastAPI deployment, PostgreSQL / SQLAlchemy, migrations, logging |
| DevOps Engineer | Vlad | Git workflow, Docker, PR process, backend integration support, secrets/config |

All four teammates still contribute to general project decisions and development when needed.

## Success Criteria

The architecture document is successful when another teammate can read it and understand:

* what the main system layers are
* how the mobile app talks to the backend
* what data the database needs to store
* which features belong in the first version of the system

This document is a first map, not a final specification. As the code grows, the architecture can be updated to match what the team actually builds.
