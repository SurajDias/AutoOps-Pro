import logging

from app.config import DATABASE_URL

SQLALCHEMY_AVAILABLE = False
logger = logging.getLogger(__name__)

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.exc import SQLAlchemyError
    from sqlalchemy.orm import declarative_base, sessionmaker

    if DATABASE_URL:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        SQLALCHEMY_AVAILABLE = True
    else:
        engine = SessionLocal = None
    Base = declarative_base()

except (ImportError, ModuleNotFoundError):
    create_engine = text = sessionmaker = None
    SQLAlchemyError = Exception
    declarative_base = None
    engine = SessionLocal = Base = None


def get_db():
    if SessionLocal is None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=503,
            detail="Incident database is not configured. Set DATABASE_URL to enable incident persistence.",
        )

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
    except (SQLAlchemyError, OSError) as error:
        logger.exception("Incident database health check failed: %s", error)
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

    except (SQLAlchemyError, OSError) as error:
        logger.exception("Historical incident lookup failed: %s", error)
        return None

    finally:
        db.close()


def create_incident_record(incident_data):
    db = _get_session()
    if db is None:
        return False

    try:
        from app.database.models import Incident

        # Automatic system-status polling can evaluate the same active failure
        # repeatedly. Reuse the existing Open record for that exact condition
        # while allowing a new record after the prior incident is resolved.
        # Serialize this check-and-insert per condition so concurrent polling
        # requests cannot both observe an empty result and insert duplicates.
        if db.bind is not None and db.bind.dialect.name == "postgresql":
            dedupe_key = "|".join(
                str(incident_data.get(field, ""))
                for field in (
                    "service_name",
                    "severity",
                    "anomaly_type",
                    "root_cause",
                )
            )
            lock_acquired = db.execute(
                text("SELECT pg_try_advisory_xact_lock(hashtext(:dedupe_key))"),
                {"dedupe_key": dedupe_key},
            ).scalar()
            if not lock_acquired:
                logger.warning("Automatic incident persistence lock was unavailable for %s", dedupe_key)
                db.rollback()
                return False

        existing = (
            db.query(Incident)
            .filter(
                Incident.service_name == incident_data.get("service_name"),
                Incident.severity == incident_data.get("severity"),
                Incident.anomaly_type == incident_data.get("anomaly_type"),
                Incident.root_cause == incident_data.get("root_cause"),
                Incident.status == "Open",
            )
            .first()
        )
        if existing is not None:
            # Explicitly end the transaction so the transaction-scoped advisory
            # lock is released before the session is returned to the pool.
            db.rollback()
            return True

        db.add(Incident(**incident_data))
        db.commit()
        return True

    except (SQLAlchemyError, OSError) as error:
        logger.exception("Automatic incident persistence failed: %s", error)
        db.rollback()
        return False

    finally:
        db.close()
