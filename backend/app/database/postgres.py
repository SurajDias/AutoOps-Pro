import logging
import os
import re

from app.config import DATABASE_URL, TEST_DATABASE_URL

SQLALCHEMY_AVAILABLE = False
logger = logging.getLogger(__name__)
engine = None
SessionLocal = None

# Integration fixtures issue ``drop_all`` and ``create_all``. Restrict their
# target to the two intentionally disposable database names used locally and
# in CI rather than attempting to identify every possible production name.
SAFE_TEST_DATABASE_NAMES = re.compile(r"^autoops_(?:test|ci)$")

try:
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import make_url
    from sqlalchemy.exc import SQLAlchemyError
    from sqlalchemy.orm import declarative_base, sessionmaker

    Base = declarative_base()

except (ImportError, ModuleNotFoundError):
    create_engine = text = sessionmaker = make_url = None
    SQLAlchemyError = Exception
    declarative_base = None
    engine = SessionLocal = Base = None


def validate_test_database_url(database_url):
    """Require a non-production PostgreSQL database for integration tests."""
    if not database_url:
        raise RuntimeError(
            "TEST_DATABASE_URL is required for PostgreSQL integration tests; DATABASE_URL is never used as a fallback."
        )

    try:
        parsed_url = make_url(database_url)
    except Exception as error:
        raise RuntimeError("TEST_DATABASE_URL must be a valid PostgreSQL SQLAlchemy URL.") from error

    if not parsed_url.drivername.startswith("postgresql"):
        raise RuntimeError("TEST_DATABASE_URL must point to PostgreSQL; SQLite is not supported for integration tests.")
    if not parsed_url.database or not SAFE_TEST_DATABASE_NAMES.fullmatch(parsed_url.database):
        raise RuntimeError(
            "TEST_DATABASE_URL must target an explicitly safe test database: "
            "autoops_test or autoops_ci."
        )
    return database_url


def configure_database(database_url):
    """Configure the module-level engine/session explicitly.

    Production initializes this once from DATABASE_URL. Test fixtures may pass
    TEST_DATABASE_URL before database access, without falling back to the
    production connection.
    """
    global engine, SessionLocal, SQLALCHEMY_AVAILABLE

    previous_engine = engine
    if database_url:
        engine = create_engine(database_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        SQLALCHEMY_AVAILABLE = True
    else:
        engine = SessionLocal = None
        SQLALCHEMY_AVAILABLE = False

    if previous_engine is not None and previous_engine is not engine:
        previous_engine.dispose()
    return engine


if os.getenv("AUTOOPS_TESTING") == "1":
    configure_database(validate_test_database_url(TEST_DATABASE_URL))
else:
    configure_database(DATABASE_URL)


def get_db():
    if SessionLocal is None:
        from fastapi import HTTPException

        logger.error("Incident database is unavailable because no database session factory is configured.")
        raise HTTPException(
            status_code=503,
            detail="Incident persistence is temporarily unavailable.",
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
        # repeatedly. Reuse the existing Open record for that stable condition
        # while allowing a new record after the prior incident is resolved.
        # ``anomaly_type`` contains current metric values, so it is useful
        # incident context but is intentionally not part of the identity.
        # Serialize this check-and-insert per condition so concurrent polling
        # requests cannot both observe an empty result and insert duplicates.
        if db.bind is not None and db.bind.dialect.name == "postgresql":
            dedupe_key = "|".join(
                str(incident_data.get(field, ""))
                for field in (
                    "service_name",
                    "severity",
                    "root_cause",
                )
            )
            db.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:dedupe_key))"),
                {"dedupe_key": dedupe_key},
            )

        existing = (
            db.query(Incident)
            .filter(
                Incident.service_name == incident_data.get("service_name"),
                Incident.severity == incident_data.get("severity"),
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
