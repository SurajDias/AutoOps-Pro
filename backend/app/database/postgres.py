import os

SQLALCHEMY_AVAILABLE = False

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import SQLAlchemyError
    from sqlalchemy.orm import declarative_base, sessionmaker

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/autoops",
    )

    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
    SQLALCHEMY_AVAILABLE = True

except (ImportError, ModuleNotFoundError):
    create_engine = text = sessionmaker = None
    SQLAlchemyError = Exception
    declarative_base = None
    engine = SessionLocal = Base = None


def get_db():
    if SessionLocal is None:
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_session():
    if SessionLocal is None:
        return None

    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        return db
    except (SQLAlchemyError, OSError):
        return None


def find_similar_incident(primary_issue):
    db = _get_session()
    if db is None:
        return None

    try:
        from app.database.models import Incident

        incident = (
            db.query(Incident)
            .filter(Incident.root_cause.ilike(f"%{primary_issue}%"))
            .order_by(Incident.timestamp.desc())
            .first()
        )

        if incident is None:
            return "No close historical incident found."

        return f"INC-{incident.id:04d}: {incident.root_cause}"

    except (SQLAlchemyError, OSError):
        return None

    finally:
        db.close()


def create_incident_record(incident_data):
    db = _get_session()
    if db is None:
        return False

    try:
        from app.database.models import Incident

        db.add(Incident(**incident_data))
        db.commit()
        return True

    except (SQLAlchemyError, OSError):
        db.rollback()
        return False

    finally:
        db.close()