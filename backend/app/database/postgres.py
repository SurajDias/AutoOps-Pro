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
            db.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:dedupe_key))"),
                {"dedupe_key": dedupe_key},
            )

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
            return True

        db.add(Incident(**incident_data))
        db.commit()
        return True

    except (SQLAlchemyError, OSError):
        db.rollback()
        return False

    finally:
        db.close()
