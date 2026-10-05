import secrets
from datetime import datetime

import bcrypt
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import StudySession, TokenTransaction, User

# creates tables if they are missing
Base.metadata.create_all(bind=engine)

app = FastAPI()


# ----- request bodies -----

class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str
    username: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


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
def auth_me(user: User = Depends(get_current_user)):
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
    # very basic streak bump for now
    user.current_streak += 1

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
