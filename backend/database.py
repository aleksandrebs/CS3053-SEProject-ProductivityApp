import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Neon CLI writes DATABASE_URL into the repo-root .env.local (gitignored).
# On Vercel, set the same DATABASE_URL in the project env vars instead.
_repo_root = Path(__file__).resolve().parent.parent
load_dotenv(_repo_root / ".env.local")
load_dotenv(Path(__file__).resolve().parent / ".env")

# Local fallback: SQLite file if no DATABASE_URL is set.
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Hosted providers often hand out postgres://; SQLAlchemy wants postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://") :]

# Use psycopg2 explicitly (matches requirements.txt)
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg2://" + DATABASE_URL[len("postgresql://") :]

# Vercel filesystem is ephemeral — SQLite will not keep data and often breaks.
if os.getenv("VERCEL") and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError(
        "On Vercel you must set DATABASE_URL to a Postgres connection string "
        "(Neon, Supabase, or Vercel Postgres)."
    )

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    # needed so FastAPI can use sqlite across requests
    connect_args = {"check_same_thread": False}
else:
    # Serverless (Vercel) opens many short-lived connections — recycle often
    engine_kwargs["pool_recycle"] = 300

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()
