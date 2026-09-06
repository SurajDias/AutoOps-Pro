from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Replace YOUR_PASSWORD with your PostgreSQL password
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/autoops"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()