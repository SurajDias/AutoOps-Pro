from sqlalchemy import inspect, select

from app.database.models import Incident


def test_postgres_incident_table_smoke(test_engine, db_session):
    """Verify the isolated PostgreSQL schema and transaction cleanup fixture."""
    assert test_engine.dialect.name == "postgresql"
    assert inspect(test_engine).has_table("incidents")

    db_session.add(Incident(
        service_name="test-service",
        severity="Critical",
        anomaly_type="Test anomaly",
        root_cause="Test root cause",
        recommendation="Test recommendation",
        status="Open",
    ))
    db_session.flush()

    persisted = db_session.scalars(select(Incident)).all()
    assert len(persisted) == 1
    assert persisted[0].service_name == "test-service"
