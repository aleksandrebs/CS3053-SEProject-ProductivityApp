from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from database import Base


# users table - one row per account
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    # using "email" so the current login screens keep working
    # (same idea as aup_email in the schema doc)
    email = Column(String(255), unique=True, nullable=False)
    username = Column(String(50), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=False)
    token_balance = Column(Integer, nullable=False, default=0)
    current_streak = Column(Integer, nullable=False, default=0)
    total_study_time = Column(Integer, nullable=False, default=0)
    # simple login token so the app can call protected routes later
    access_token = Column(String(64), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    sessions = relationship("StudySession", back_populates="user")
    token_transactions = relationship("TokenTransaction", back_populates="user")


# one row = one timer run
class StudySession(Base):
    __tablename__ = "study_sessions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    planned_duration = Column(Integer, nullable=False)
    start_time = Column(DateTime, server_default=func.now())
    end_time = Column(DateTime, nullable=True)
    actual_duration = Column(Integer, nullable=True)
    # active / completed / cancelled
    status = Column(String(20), nullable=False, default="active")
    tokens_earned = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="sessions")


# history of token earns/spends
class TokenTransaction(Base):
    __tablename__ = "token_transactions"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    # earn or spend
    type = Column(String(20), nullable=False)
    reason = Column(String(50), nullable=False)
    related_session_id = Column(Integer, ForeignKey("study_sessions.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="token_transactions")
