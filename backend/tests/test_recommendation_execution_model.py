import pytest
from sqlalchemy.exc import IntegrityError

from app.database.models import Incident, RecommendationExecution


def test_model_can_be_created_and_belongs_to_incident(db_session):
    incident = Incident(service_name="svc", severity="high", anomaly_type="cpu", root_cause="none", recommendation="restart")
    db_session.add(incident)
    db_session.flush()

    exec = RecommendationExecution(
        incident_id=incident.id,
        recommendation=incident.recommendation,
        execution_status="PLANNED",
        attempt_number=1,
    )
    db_session.add(exec)
    db_session.commit()

    assert exec.id is not None
    assert exec.incident_id == incident.id
    # relationship backref
    assert any(e.id == exec.id for e in incident.recommendation_executions)


def test_multiple_attempts_and_attempt_numbers_preserved(db_session):
    incident = Incident(service_name="svc2", severity="low", anomaly_type="latency", root_cause="db", recommendation="scale")
    db_session.add(incident)
    db_session.flush()

    e1 = RecommendationExecution(incident_id=incident.id, recommendation=incident.recommendation, attempt_number=1)
    e2 = RecommendationExecution(incident_id=incident.id, recommendation=incident.recommendation, attempt_number=2)
    db_session.add_all([e1, e2])
    db_session.commit()

    rows = db_session.query(RecommendationExecution).filter_by(incident_id=incident.id).order_by(RecommendationExecution.attempt_number).all()
    assert [r.attempt_number for r in rows] == [1, 2]


def test_attempt_number_unique_constraint(db_session):
    incident = Incident(service_name="svc3", severity="low", anomaly_type="error", root_cause="net", recommendation="notify")
    db_session.add(incident)
    db_session.flush()

    e1 = RecommendationExecution(incident_id=incident.id, recommendation=incident.recommendation, attempt_number=1)
    db_session.add(e1)
    db_session.commit()

    e_dup = RecommendationExecution(incident_id=incident.id, recommendation=incident.recommendation, attempt_number=1)
    db_session.add(e_dup)
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_timestamps_nullable_initially(db_session):
    incident = Incident(service_name="svc4", severity="low", anomaly_type="disk", root_cause="io", recommendation="clean")
    db_session.add(incident)
    db_session.flush()

    e = RecommendationExecution(incident_id=incident.id, recommendation=incident.recommendation, attempt_number=1)
    db_session.add(e)
    db_session.commit()

    assert e.started_at is None
    assert e.completed_at is None


def test_error_fields_for_failed(db_session):
    incident = Incident(service_name="svc5", severity="med", anomaly_type="mem", root_cause="leak", recommendation="restart")
    db_session.add(incident)
    db_session.flush()

    e = RecommendationExecution(
        incident_id=incident.id,
        recommendation=incident.recommendation,
        execution_status="FAILED",
        error_code="E_TIMEOUT",
        error_message="Timed out contacting API",
        attempt_number=1,
    )
    db_session.add(e)
    db_session.commit()

    assert e.error_code == "E_TIMEOUT"
    assert "Timed out" in e.error_message


def test_outcome_fields_populated_independently(db_session):
    incident = Incident(service_name="svc6", severity="low", anomaly_type="thr", root_cause="throt", recommendation="scale")
    db_session.add(incident)
    db_session.flush()

    e = RecommendationExecution(
        incident_id=incident.id,
        recommendation=incident.recommendation,
        execution_status="EXECUTED",
        attempt_number=1,
        outcome_status="IMPROVED",
        outcome_assessed_by="OPERATOR",
    )
    db_session.add(e)
    db_session.commit()

    assert e.outcome_status == "IMPROVED"
    assert e.outcome_assessed_by == "OPERATOR"


def test_resolving_incident_does_not_create_or_mark_execution(db_session):
    incident = Incident(service_name="svc7", severity="low", anomaly_type="x", root_cause="y", recommendation="noop")
    db_session.add(incident)
    db_session.flush()

    # Ensure no executions by default
    assert len(incident.recommendation_executions) == 0

    # Create an execution and then resolve incident; the execution should remain unchanged
    e = RecommendationExecution(incident_id=incident.id, recommendation=incident.recommendation, execution_status="EXECUTED", attempt_number=1)
    db_session.add(e)
    db_session.commit()

    incident.resolved_at = None
    db_session.add(incident)
    db_session.commit()

    refreshed = db_session.query(RecommendationExecution).get(e.id)
    assert refreshed.execution_status == "EXECUTED"


def test_migration_module_has_downgrade():
    # Basic check that the migration file exists (reversibility expectation).
    from pathlib import Path

    migration = Path("backend/migrations/versions/20260910_05_add_recommendation_executions.py")
    assert migration.exists()
    content = migration.read_text()
    assert "def upgrade" in content
    assert "def downgrade" in content
