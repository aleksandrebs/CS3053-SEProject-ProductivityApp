import bcrypt
from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import Base, SessionLocal, engine
from models import User

# Makes the tables if they don't exist yet
Base.metadata.create_all(bind=engine)

app = FastAPI()


# What the app has to send us for each request
class SignUpRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


# Opens a database session for a request and closes it after
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {"message": "Backend is running"}


@app.post("/signup", status_code=201)
def signup(data: SignUpRequest, db: Session = Depends(get_db)):
    name = data.name.strip()
    email = data.email.strip().lower()

    if name == "" or email == "" or data.password == "":
        raise HTTPException(status_code=400, detail="Please fill in all the fields.")

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    # bcrypt can't handle passwords longer than 72 bytes
    if len(data.password.encode()) > 72:
        raise HTTPException(status_code=400, detail="Password is too long.")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    # We never save the actual password, only a hashed version of it
    password_hash = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()

    user = User(name=name, email=email, password_hash=password_hash)
    db.add(user)
    db.commit()
    db.refresh(user)

    return {"id": user.id, "name": user.name, "email": user.email}


@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()

    # Same message for wrong email and wrong password so people
    # can't use this to find out which emails have accounts
    if user is None or len(data.password.encode()) > 72:
        raise HTTPException(status_code=401, detail="Wrong email or password.")

    if not bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="Wrong email or password.")

    return {"id": user.id, "name": user.name, "email": user.email}
