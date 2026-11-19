import secrets
from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import (
    Friendship,
    Redemption,
    Reward,
    Streak,
    StreakDay,
    StudySession,
    TokenTransaction,
    User,
)

# creates tables if they are missing
Base.metadata.create_all(bind=engine)


def seed_rewards():
    db = SessionLocal()
    try:
        samples = [
            {
                "slug": "free_croissant",
                "name": "Free croissant",
                "description": "One croissant at the campus café",
                "token_cost": 5,
            },
            {
                "slug": "free_coffee",
                "name": "Free coffee",
                "description": "One coffee at the campus café",
                "token_cost": 10,
            },
            {
                "slug": "amex_5_giftcard",
                "name": "€5 Amex gift card",
                "description": "Prototype American Express gift card",
                "token_cost": 20,
            },
        ]
        for item in samples:
            exists = db.query(Reward).filter(Reward.slug == item["slug"]).first()
            if exists is None:
                db.add(Reward(**item, available=True))
        db.commit()
    finally:
        db.close()


seed_rewards()

app = FastAPI()

# needed so the Vercel web app (browser) can call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----- request bodies -----

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    username: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    username: str


class StartSessionRequest(BaseModel):
    planned_duration: int


class CompleteSessionRequest(BaseModel):
    actual_duration: int


# ----- db session -----

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def user_to_dict(user: User):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "username": user.username,
        "token_balance": user.token_balance,
        "current_streak": user.current_streak,
        "total_study_time": user.total_study_time,
    }


def session_to_dict(session: StudySession):
    return {
        "id": session.id,
        "user_id": session.user_id,
        "planned_duration": session.planned_duration,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "actual_duration": session.actual_duration,
        "status": session.status,
        "tokens_earned": session.tokens_earned,
    }


def make_token():
    return secrets.token_hex(16)


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None),
):
    # expects: Authorization: Bearer <token>
    if authorization is None or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in.")

    token = authorization.replace("Bearer ", "", 1).strip()
    user = db.query(User).filter(User.access_token == token).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Not logged in.")
    return user


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ----- auth (keeps /signup and /login for the current mobile screens) -----

@app.post("/signup", status_code=201)
def signup(data: SignUpRequest, db: Session = Depends(get_db)):
    name = data.name.strip()
    email = data.email.strip().lower()
    username = None
    if data.username:
        username = data.username.strip()

    if name == "" or email == "" or data.password == "":
        raise HTTPException(status_code=400, detail="Please fill in all the fields.")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    if len(data.password.encode()) > 72:
        raise HTTPException(status_code=400, detail="Password is too long.")

    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    if username and db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="That username is already taken.")

    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    token = make_token()

    user = User(
        name=name,
        email=email,
        username=username,
        password_hash=password_hash,
        token_balance=0,
        current_streak=0,
        total_study_time=0,
        access_token=token,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # old shape the current app expects, plus token for newer calls
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "access_token": token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    if user is None or len(data.password.encode()) > 72:
        raise HTTPException(status_code=401, detail="Wrong email or password.")

    if not bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Wrong email or password.")

    user.access_token = make_token()
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "access_token": user.access_token,
        "token_type": "bearer",
        "user": user_to_dict(user),
    }


# same idea as the api-contract names, just wrappers
@app.post("/auth/register", status_code=201)
def auth_register(data: SignUpRequest, db: Session = Depends(get_db)):
    return signup(data, db)


@app.post("/auth/login")
def auth_login(data: LoginRequest, db: Session = Depends(get_db)):
    return login(data, db)


@app.get("/auth/me")
def auth_me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # keep current_streak in sync with the 24h reset rule
    streak = get_streak_row(user, db)
    reset_streak_if_inactive(streak, user)
    db.commit()
    return user_to_dict(user)


@app.patch("/auth/me")
def update_me(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    username = data.username.strip()
    if username == "":
        raise HTTPException(status_code=400, detail="Username cannot be empty.")
    if len(username) < 3 or len(username) > 30:
        raise HTTPException(status_code=400, detail="Username must be 3 to 30 characters.")
    if " " in username:
        raise HTTPException(status_code=400, detail="Username cannot have spaces.")

    taken = (
        db.query(User)
        .filter(User.username == username, User.id != user.id)
        .first()
    )
    if taken:
        raise HTTPException(status_code=409, detail="That username is already taken.")

    user.username = username
    db.commit()
    db.refresh(user)
    return user_to_dict(user)


# ----- study sessions -----

@app.post("/sessions", status_code=201)
def start_session(
    data: StartSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.planned_duration <= 0:
        raise HTTPException(status_code=400, detail="Duration has to be greater than 0.")

    active = (
        db.query(StudySession)
        .filter(StudySession.user_id == user.id, StudySession.status == "active")
        .first()
    )
    if active:
        raise HTTPException(status_code=409, detail="You already have an active session.")

    session = StudySession(
        user_id=user.id,
        planned_duration=data.planned_duration,
        status="active",
        tokens_earned=0,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_to_dict(session)


@app.post("/sessions/{session_id}/complete")
def complete_session(
    session_id: int,
    data: CompleteSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your session.")
    if session.status != "active":
        raise HTTPException(status_code=409, detail="Session is already finished.")

    if data.actual_duration <= 0:
        raise HTTPException(status_code=400, detail="actual_duration has to be greater than 0.")

    # MVP: 1 token per minute studied
    tokens = data.actual_duration

    session.status = "completed"
    session.end_time = datetime.utcnow()
    session.actual_duration = data.actual_duration
    session.tokens_earned = tokens

    user.token_balance += tokens
    user.total_study_time += data.actual_duration

    tx = TokenTransaction(
        user_id=user.id,
        amount=tokens,
        type="earn",
        reason="session_complete",
        related_session_id=session.id,
    )
    db.add(tx)
    db.commit()
    db.refresh(session)
    db.refresh(user)

    return {
        "session": session_to_dict(session),
        "token_balance": user.token_balance,
        "current_streak": user.current_streak,
    }


@app.post("/sessions/{session_id}/cancel")
def cancel_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your session.")
    if session.status != "active":
        raise HTTPException(status_code=409, detail="Session is already finished.")

    session.status = "cancelled"
    session.end_time = datetime.utcnow()
    session.tokens_earned = 0
    db.commit()
    db.refresh(session)
    return session_to_dict(session)


@app.get("/sessions")
def list_sessions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: str | None = None,
    limit: int = 20,
):
    q = db.query(StudySession).filter(StudySession.user_id == user.id)
    if status:
        q = q.filter(StudySession.status == status)
    rows = q.order_by(StudySession.id.desc()).limit(limit).all()
    return {"items": [session_to_dict(s) for s in rows]}


@app.get("/sessions/{session_id}")
def get_session(
    session_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.query(StudySession).filter(StudySession.id == session_id).first()
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your session.")
    return session_to_dict(session)


@app.get("/tokens/balance")
def token_balance(user: User = Depends(get_current_user)):
    return {"token_balance": user.token_balance}


# ----- streaks -----

# if they don't start the timer for longer than this, the streak is lost
STREAK_RESET_TIME = timedelta(hours=24)


def get_streak_row(user: User, db: Session):
    streak = db.query(Streak).filter(Streak.user_id == user.id).first()
    if streak is None:
        streak = Streak(user_id=user.id, current_streak=0)
        db.add(streak)
    return streak


def reset_streak_if_inactive(streak: Streak, user: User):
    if streak.last_active_at and datetime.now() - streak.last_active_at > STREAK_RESET_TIME:
        streak.current_streak = 0
    # users.current_streak is just a copy so /auth/me shows the same number
    user.current_streak = streak.current_streak


def record_streak_day(user: User, day, db: Session):
    exists = (
        db.query(StreakDay)
        .filter(StreakDay.user_id == user.id, StreakDay.day == day)
        .first()
    )
    if exists is None:
        db.add(StreakDay(user_id=user.id, day=day))


@app.get("/streak")
def get_streak(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    streak = get_streak_row(user, db)
    reset_streak_if_inactive(streak, user)
    db.commit()
    return {
        "current_streak": streak.current_streak,
        "last_active_at": streak.last_active_at,
    }


@app.get("/streak/history")
def streak_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    streak = get_streak_row(user, db)
    reset_streak_if_inactive(streak, user)
    db.commit()

    rows = (
        db.query(StreakDay)
        .filter(StreakDay.user_id == user.id)
        .order_by(StreakDay.day.desc())
        .limit(60)
        .all()
    )

    # estimate when this run of days began
    started_on = None
    if streak.current_streak > 0 and streak.last_active_at:
        started_on = (
            streak.last_active_at.date() - timedelta(days=streak.current_streak - 1)
        ).isoformat()

    return {
        "current_streak": streak.current_streak,
        "last_active_at": streak.last_active_at,
        "started_on": started_on,
        "days": [{"day": r.day.isoformat()} for r in rows],
    }


# the app calls this every time the timer is started
@app.post("/streak/check-in")
def streak_check_in(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    streak = get_streak_row(user, db)
    reset_streak_if_inactive(streak, user)
    now = datetime.now()

    if streak.current_streak == 0:
        # first day, or the old streak was lost
        streak.current_streak = 1
    elif streak.last_active_at.date() != now.date():
        # first timer of a new day
        streak.current_streak += 1
    # if they already started the timer today, nothing changes

    streak.last_active_at = now
    user.current_streak = streak.current_streak
    record_streak_day(user, now.date(), db)
    db.commit()
    return {"current_streak": streak.current_streak}

#token stuff
class EarnTokensRequest(BaseModel):
    amount: int


class FriendRequestBody(BaseModel):
    user_id: int


# the app calls this every time the user has used the timer for another 5 minutes
@app.post("/tokens/earn")
def earn_tokens(
        data: EarnTokensRequest,
        user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
):
    # small cap so a single request can't hand out a huge number of tokens
    if data.amount < 1 or data.amount > 12:
        raise HTTPException(status_code=400, detail="amount must be between 1 and 12.")

    # 1 token = 5 minutes on the timer — keep study time in sync for the leaderboard
    minutes = data.amount * 5
    user.token_balance += data.amount
    user.total_study_time = (user.total_study_time or 0) + minutes
    db.add(
        TokenTransaction(
            user_id=user.id,
            amount=data.amount,
            type="earn",
            reason="timer_usage",
        )
    )
    db.commit()
    db.refresh(user)
    return {
        "token_balance": user.token_balance,
        "total_study_time": user.total_study_time,
    }


# ----- leaderboard + friends -----

def public_stats(user: User, rank: int | None = None):
    row = {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "token_balance": user.token_balance or 0,
        "current_streak": user.current_streak or 0,
        "total_study_time": user.total_study_time or 0,
    }
    if rank is not None:
        row["rank"] = rank
    return row


def accepted_friend_ids(user_id: int, db: Session):
    rows = (
        db.query(Friendship)
        .filter(
            Friendship.status == "accepted",
            (Friendship.requester_id == user_id) | (Friendship.addressee_id == user_id),
        )
        .all()
    )
    ids = set()
    for r in rows:
        ids.add(r.requester_id if r.addressee_id == user_id else r.addressee_id)
    return ids


def rank_users(rows):
    # 1) study time  2) tokens  3) streak
    ordered = sorted(
        rows,
        key=lambda u: (
            -(u.total_study_time or 0),
            -(u.token_balance or 0),
            -(u.current_streak or 0),
            u.id,
        ),
    )
    return [public_stats(u, rank=i + 1) for i, u in enumerate(ordered)]


@app.get("/leaderboard")
def leaderboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    scope: str = "all",
):
    # scope=all -> everyone, scope=friends -> only accepted friends (+ you)
    if scope not in ("all", "friends"):
        raise HTTPException(status_code=400, detail="scope must be 'all' or 'friends'.")

    q = db.query(User)
    if scope == "friends":
        friend_ids = accepted_friend_ids(user.id, db)
        friend_ids.add(user.id)
        q = q.filter(User.id.in_(friend_ids))

    rows = q.all()
    items = rank_users(rows)
    my_rank = next((row["rank"] for row in items if row["id"] == user.id), None)
    return {
        "scope": scope,
        "my_rank": my_rank,
        "items": items,
    }


@app.get("/users/search")
def search_users(
    q: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    term = (q or "").strip()
    if len(term) < 1:
        return {"items": []}

    like = f"%{term}%"
    rows = (
        db.query(User)
        .filter(
            User.id != user.id,
            (User.username.ilike(like)) | (User.name.ilike(like)) | (User.email.ilike(like)),
        )
        .order_by(User.name.asc())
        .limit(20)
        .all()
    )

    if not rows:
        return {"items": []}

    ids = [u.id for u in rows]
    friend_map = {}
    for r in (
        db.query(Friendship)
        .filter(
            ((Friendship.requester_id == user.id) & (Friendship.addressee_id.in_(ids)))
            | ((Friendship.addressee_id == user.id) & (Friendship.requester_id.in_(ids)))
        )
        .all()
    ):
        other = r.addressee_id if r.requester_id == user.id else r.requester_id
        friend_map[other] = {
            "status": r.status,
            "direction": "outgoing" if r.requester_id == user.id else "incoming",
            "friendship_id": r.id,
        }

    items = []
    for u in rows:
        item = public_stats(u)
        rel = friend_map.get(u.id)
        item["friendship"] = rel
        items.append(item)
    return {"items": items}


@app.post("/friends/requests", status_code=201)
def send_friend_request(
    data: FriendRequestBody,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if data.user_id == user.id:
        raise HTTPException(status_code=400, detail="You cannot friend yourself.")

    other = db.query(User).filter(User.id == data.user_id).first()
    if other is None:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = (
        db.query(Friendship)
        .filter(
            ((Friendship.requester_id == user.id) & (Friendship.addressee_id == data.user_id))
            | ((Friendship.requester_id == data.user_id) & (Friendship.addressee_id == user.id))
        )
        .first()
    )
    if existing:
        if existing.status == "accepted":
            raise HTTPException(status_code=409, detail="You are already friends.")
        if existing.status == "pending":
            raise HTTPException(status_code=409, detail="Friend request already pending.")
        # rejected before — allow a new pending request from this user
        existing.requester_id = user.id
        existing.addressee_id = data.user_id
        existing.status = "pending"
        db.commit()
        db.refresh(existing)
        return {
            "id": existing.id,
            "status": existing.status,
            "user": public_stats(other),
        }

    row = Friendship(
        requester_id=user.id,
        addressee_id=data.user_id,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "status": row.status, "user": public_stats(other)}


@app.post("/friends/requests/{friendship_id}/accept")
def accept_friend_request(
    friendship_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Request not found.")
    if row.addressee_id != user.id:
        raise HTTPException(status_code=403, detail="Not your request to accept.")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="Request is not pending.")

    row.status = "accepted"
    db.commit()
    db.refresh(row)
    other = db.query(User).filter(User.id == row.requester_id).first()
    return {"id": row.id, "status": row.status, "user": public_stats(other)}


@app.post("/friends/requests/{friendship_id}/reject")
def reject_friend_request(
    friendship_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = db.query(Friendship).filter(Friendship.id == friendship_id).first()
    if row is None:
        raise HTTPException(status_code=404, detail="Request not found.")
    if row.addressee_id != user.id:
        raise HTTPException(status_code=403, detail="Not your request to reject.")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="Request is not pending.")

    row.status = "rejected"
    db.commit()
    return {"id": row.id, "status": row.status}


@app.get("/friends")
def list_friends(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    friend_ids = accepted_friend_ids(user.id, db)
    if not friend_ids:
        return {"items": []}

    rows = db.query(User).filter(User.id.in_(friend_ids)).all()
    return {"items": rank_users(rows)}


@app.get("/friends/requests")
def list_friend_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    incoming = (
        db.query(Friendship)
        .filter(Friendship.addressee_id == user.id, Friendship.status == "pending")
        .all()
    )
    outgoing = (
        db.query(Friendship)
        .filter(Friendship.requester_id == user.id, Friendship.status == "pending")
        .all()
    )

    def pack(rows, other_field):
        items = []
        for r in rows:
            other_id = getattr(r, other_field)
            other = db.query(User).filter(User.id == other_id).first()
            if other:
                items.append(
                    {
                        "friendship_id": r.id,
                        "status": r.status,
                        "user": public_stats(other),
                    }
                )
        return items

    return {
        "incoming": pack(incoming, "requester_id"),
        "outgoing": pack(outgoing, "addressee_id"),
    }


# ----- rewards / Amex gift card prototype -----

def reward_to_dict(reward: Reward):
    return {
        "id": reward.id,
        "slug": reward.slug,
        "name": reward.name,
        "description": reward.description,
        "token_cost": reward.token_cost,
        "available": reward.available,
    }


def redemption_to_dict(row: Redemption, reward: Reward | None = None):
    r = reward or row.reward
    return {
        "id": row.id,
        "reward_id": row.reward_id,
        "reward_name": r.name if r else None,
        "token_cost": row.token_cost,
        "code": row.code,
        "status": row.status,
        "created_at": row.created_at,
    }


def make_gift_code(slug: str):
    tag = slug.replace("_", "-").upper()[:12]
    return f"AMEX-{tag}-{secrets.token_hex(3).upper()}"


@app.get("/rewards")
def list_rewards(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = (
        db.query(Reward)
        .filter(Reward.available == True)  # noqa: E712
        .order_by(Reward.token_cost.asc())
        .all()
    )
    return {
        "token_balance": user.token_balance,
        "items": [reward_to_dict(r) for r in rows],
    }


@app.post("/rewards/{reward_id}/redeem")
def redeem_reward(
    reward_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reward = db.query(Reward).filter(Reward.id == reward_id).first()
    if reward is None or not reward.available:
        raise HTTPException(status_code=404, detail="Reward not found.")

    if user.token_balance < reward.token_cost:
        raise HTTPException(status_code=400, detail="Not enough tokens.")

    user.token_balance -= reward.token_cost
    code = make_gift_code(reward.slug)
    redemption = Redemption(
        user_id=user.id,
        reward_id=reward.id,
        token_cost=reward.token_cost,
        code=code,
        status="completed",
    )
    db.add(redemption)
    db.add(
        TokenTransaction(
            user_id=user.id,
            amount=reward.token_cost,
            type="spend",
            reason="reward_redeem",
        )
    )
    db.commit()
    db.refresh(user)
    db.refresh(redemption)
    return {
        "token_balance": user.token_balance,
        "redemption": redemption_to_dict(redemption, reward),
    }


@app.get("/redemptions")
def list_redemptions(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Redemption)
        .filter(Redemption.user_id == user.id)
        .order_by(Redemption.id.desc())
        .limit(30)
        .all()
    )
    return {"items": [redemption_to_dict(r) for r in rows]}

# ----- study stats + session history -----
# The timer gives tokens every 5 minutes through /tokens/earn, so logging a
# session here does NOT give tokens again. It only saves the session so the
# user can see their past study times and stats.

LOG_STATUSES = ("completed", "cancelled")
MAX_SESSION_SECONDS = 3 * 60 * 60 + 60  # timer max is 180 min (+1 min slack)


class LogSessionRequest(BaseModel):
    planned_duration: int  # minutes the user picked
    seconds_studied: int  # how long the timer actually ran
    status: str  # completed or cancelled
    tokens_earned: int = 0  # tokens the timer gave during this session


def iso_utc(dt):
    # times are saved in UTC; add Z so the app converts to the user's local time
    if dt is None:
        return None
    return dt.replace(microsecond=0).isoformat() + "Z"


def session_seconds(s: StudySession):
    if s.start_time and s.end_time:
        return max(0, int((s.end_time - s.start_time).total_seconds()))
    return (s.actual_duration or 0) * 60


def history_item(s: StudySession):
    return {
        "id": s.id,
        "start_time": iso_utc(s.start_time),
        "end_time": iso_utc(s.end_time),
        "planned_duration": s.planned_duration,
        "seconds_studied": session_seconds(s),
        "status": s.status,
        "tokens_earned": s.tokens_earned or 0,
    }


@app.post("/study/log", status_code=201)
def log_session(
    data: LogSessionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # check the input so nobody can save fake or broken sessions
    if data.status not in LOG_STATUSES:
        raise HTTPException(status_code=400, detail="status must be completed or cancelled.")
    if data.planned_duration < 1 or data.planned_duration > 180:
        raise HTTPException(status_code=400, detail="planned_duration must be 1 to 180 minutes.")
    if data.seconds_studied < 1 or data.seconds_studied > MAX_SESSION_SECONDS:
        raise HTTPException(status_code=400, detail="seconds_studied is not valid.")
    if data.seconds_studied > data.planned_duration * 60 + 60:
        raise HTTPException(status_code=400, detail="Session is longer than planned.")

    # 1 token per 5 minutes, so tokens can't be more than that (+1 for rounding)
    max_tokens = data.seconds_studied // 300 + 1
    if data.tokens_earned < 0 or data.tokens_earned > max_tokens:
        raise HTTPException(status_code=400, detail="tokens_earned is not valid.")

    end = datetime.utcnow()
    session = StudySession(
        user_id=user.id,
        planned_duration=data.planned_duration,
        start_time=end - timedelta(seconds=data.seconds_studied),
        end_time=end,
        actual_duration=data.seconds_studied // 60,  # minutes, like the db schema
        status=data.status,
        tokens_earned=data.tokens_earned,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return history_item(session)


@app.get("/study/history")
def session_history(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50,
):
    limit = max(1, min(limit, 100))
    rows = (
        db.query(StudySession)
        .filter(StudySession.user_id == user.id, StudySession.status.in_(LOG_STATUSES))
        .order_by(StudySession.id.desc())
        .limit(limit)
        .all()
    )
    return {"items": [history_item(s) for s in rows]}


@app.get("/study/stats")
def study_stats(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    tz_offset: int = 0,
):
    # tz_offset = minutes from JavaScript's getTimezoneOffset() (Paris in winter = -60)
    # so "today" and "this week" match the user's own clock, not the server's
    if tz_offset < -14 * 60 or tz_offset > 14 * 60:
        tz_offset = 0
    shift = timedelta(minutes=-tz_offset)

    rows = (
        db.query(StudySession)
        .filter(StudySession.user_id == user.id, StudySession.status.in_(LOG_STATUSES))
        .all()
    )

    today = (datetime.utcnow() + shift).date()
    week_start = today - timedelta(days=today.weekday())  # Monday
    last_7 = [today - timedelta(days=i) for i in range(6, -1, -1)]
    per_day = {d: 0 for d in last_7}

    total = today_secs = week_secs = longest = 0
    completed = cancelled = 0

    for s in rows:
        secs = session_seconds(s)
        total += secs
        longest = max(longest, secs)
        if s.status == "completed":
            completed += 1
        else:
            cancelled += 1

        local_day = ((s.end_time or s.start_time) + shift).date()
        if local_day == today:
            today_secs += secs
        if local_day >= week_start:
            week_secs += secs
        if local_day in per_day:
            per_day[local_day] += secs

    count = completed + cancelled
    return {
        "total_seconds": total,
        "today_seconds": today_secs,
        "week_seconds": week_secs,
        "sessions_total": count,
        "sessions_completed": completed,
        "sessions_cancelled": cancelled,
        "completion_rate": round(completed / count * 100) if count else 0,
        "average_seconds": total // count if count else 0,
        "longest_seconds": longest,
        "current_streak": user.current_streak or 0,
        "last_7_days": [{"day": d.isoformat(), "seconds": per_day[d]} for d in last_7],
    }
