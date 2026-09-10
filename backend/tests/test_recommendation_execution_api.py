import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database.models import Incident, RecommendationExecution
from app.database.postgres import get_db
from app.main import app


@pytest.fixture(autouse=True)
def clean_execution_records(test_engine):
    with test_engine.begin() as connection:
        connection.execute(delete(RecommendationExecution))
        connection.execute(delete(Incident))
    yield
    with test_engine.begin() as connection:
        connection.execute(delete(RecommendationExecution))
        connection.execute(delete(Incident))


@pytest.fixture
def client(test_engine):
    def override_get_db():
        session = Session(bind=test_engine)
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_db, None)


def _create_incident(client, service_name="api-gateway"):
    response = client.post(
        "/incidents/",
        json={
            "service_name": service_name,
            "severity": "High",
            "anomaly_type": "cpu",
            "root_cause": "CPU saturation",
            "recommendation": "scale out workers",
        },
    )
    assert response.status_code == 200
    return response.json()["incident_id"]


def test_create_planned_execution_and_invalid_incident(client):
    incident_id = _create_incident(client)

    response = client.post(
        f"/incidents/{incident_id}/executions",
        json={
            "recommendation": " scale workers ",
            "execution_method": "manual",
            "actor": " operator ",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["message"] == "Execution planned and recorded."
    execution = body["execution"]
    assert execution["execution_status"] == "PLANNED"
    assert execution["attempt_number"] == 1
    assert execution["recommendation"] == "scale workers"
    assert execution["execution_method"] == "manual"
    assert execution["actor"] == "operator"
    assert execution["started_at"] is None
    assert execution["completed_at"] is None
    assert execution["outcome_status"] is None

    missing = client.post("/incidents/999999/executions", json={"recommendation": "retry"})
    assert missing.status_code == 404

    blank = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "   "})
    assert blank.status_code == 422


def test_state_transitions_and_timestamps(client):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "restart api"})
    execution_id = create.json()["execution"]["id"]

    accepted = client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
    assert accepted.status_code == 200
    assert accepted.json()["execution"]["execution_status"] == "ACCEPTED"

    started = client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    assert started.status_code == 200
    started_payload = started.json()["execution"]
    assert started_payload["execution_status"] == "EXECUTING"
    assert started_payload["started_at"] is not None

    completed = client.post(f"/incidents/{incident_id}/executions/{execution_id}/complete")
    assert completed.status_code == 200
    completed_payload = completed.json()["execution"]
    assert completed_payload["execution_status"] == "EXECUTED"
    assert completed_payload["completed_at"] is not None


def test_failed_execution_records_error_details(client):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "scale down cache"})
    execution_id = create.json()["execution"]["id"]

    client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
    client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    response = client.post(
        f"/incidents/{incident_id}/executions/{execution_id}/fail",
        json={"error_code": "E_TIMEOUT", "error_message": " API timed out "},
    )

    assert response.status_code == 200
    payload = response.json()["execution"]
    assert payload["execution_status"] == "FAILED"
    assert payload["error_code"] == "E_TIMEOUT"
    assert payload["error_message"] == "API timed out"
    assert payload["completed_at"] is not None


def test_cancel_execution_from_planned_and_accepted_states(client):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "restart worker"})
    execution_id = create.json()["execution"]["id"]

    cancelled = client.post(f"/incidents/{incident_id}/executions/{execution_id}/cancel")
    assert cancelled.status_code == 200
    assert cancelled.json()["execution"]["execution_status"] == "CANCELLED"
    assert cancelled.json()["execution"]["completed_at"] is not None

    second = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "retry worker"})
    second_id = second.json()["execution"]["id"]
    client.post(f"/incidents/{incident_id}/executions/{second_id}/accept")
    second_cancel = client.post(f"/incidents/{incident_id}/executions/{second_id}/cancel")
    assert second_cancel.status_code == 200
    assert second_cancel.json()["execution"]["execution_status"] == "CANCELLED"


def test_invalid_transitions_are_rejected(client):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "rebuild cache"})
    execution_id = create.json()["execution"]["id"]

    invalid_complete = client.post(f"/incidents/{incident_id}/executions/{execution_id}/complete")
    assert invalid_complete.status_code == 409

    invalid_fail = client.post(f"/incidents/{incident_id}/executions/{execution_id}/fail", json={"error_message": "failed"})
    assert invalid_fail.status_code == 409

    client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
    client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    invalid_restart = client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    assert invalid_restart.status_code == 409

    failed = client.post(f"/incidents/{incident_id}/executions/{execution_id}/fail", json={"error_message": "timed out"})
    assert failed.status_code == 200
    invalid_after_failed = client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    assert invalid_after_failed.status_code == 409

    cancelled = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "roll back"})
    cancelled_id = cancelled.json()["execution"]["id"]
    cancelled_response = client.post(f"/incidents/{incident_id}/executions/{cancelled_id}/cancel")
    assert cancelled_response.status_code == 200
    invalid_cancelled_start = client.post(f"/incidents/{incident_id}/executions/{cancelled_id}/start")
    assert invalid_cancelled_start.status_code == 409


def test_outcome_assessment_is_independent_of_incident_resolution(client):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "drain traffic"})
    execution_id = create.json()["execution"]["id"]

    client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
    client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    client.post(f"/incidents/{incident_id}/executions/{execution_id}/complete")

    outcome = client.post(
        f"/incidents/{incident_id}/executions/{execution_id}/outcome",
        json={"outcome_status": "IMPROVED", "outcome_assessed_by": "OPERATOR"},
    )
    assert outcome.status_code == 200
    payload = outcome.json()["execution"]
    assert payload["outcome_status"] == "IMPROVED"
    assert payload["outcome_assessed_by"] == "OPERATOR"
    assert payload["outcome_assessed_at"] is not None
    assert "fixed" not in outcome.json()["message"].lower()

    incident = client.get(f"/incidents/{incident_id}").json()
    assert incident["status"] == "Open"
    assert incident["resolved_at"] is None

    report = client.get(f"/incidents/{incident_id}/report").json()
    assert "fixed the incident" not in str(report).lower()
    assert "recommendation caused improvement" not in str(report).lower()


@pytest.mark.parametrize("state", ["PLANNED", "ACCEPTED", "EXECUTING", "FAILED", "CANCELLED"])
def test_outcome_assessment_requires_executed_state(client, state):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "drain traffic"})
    execution_id = create.json()["execution"]["id"]

    if state == "ACCEPTED":
        client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
    elif state == "EXECUTING":
        client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
        client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    elif state == "FAILED":
        client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
        client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
        client.post(
            f"/incidents/{incident_id}/executions/{execution_id}/fail",
            json={"error_code": "E_TIMEOUT", "error_message": "timed out"},
        )
    elif state == "CANCELLED":
        client.post(f"/incidents/{incident_id}/executions/{execution_id}/cancel")

    response = client.post(
        f"/incidents/{incident_id}/executions/{execution_id}/outcome",
        json={"outcome_status": "IMPROVED", "outcome_assessed_by": "OPERATOR"},
    )
    assert response.status_code == 409

    execution = client.get(f"/incidents/{incident_id}/executions/{execution_id}").json()
    assert execution["outcome_status"] is None
    assert execution["execution_status"] == state

    incident = client.get(f"/incidents/{incident_id}").json()
    assert incident["status"] == "Open"
    assert incident["resolved_at"] is None


def test_outcome_assessment_succeeds_only_after_execution_is_executed(client):
    incident_id = _create_incident(client)
    create = client.post(f"/incidents/{incident_id}/executions", json={"recommendation": "restart api"})
    execution_id = create.json()["execution"]["id"]

    client.post(f"/incidents/{incident_id}/executions/{execution_id}/accept")
    client.post(f"/incidents/{incident_id}/executions/{execution_id}/start")
    client.post(f"/incidents/{incident_id}/executions/{execution_id}/complete")

    response = client.post(
        f"/incidents/{incident_id}/executions/{execution_id}/outcome",
        json={"outcome_status": "IMPROVED", "outcome_assessed_by": "OPERATOR"},
    )
    assert response.status_code == 200
    execution = response.json()["execution"]
    assert execution["execution_status"] == "EXECUTED"
    assert execution["outcome_status"] == "IMPROVED"
    assert execution["outcome_assessed_by"] == "OPERATOR"
    assert execution["outcome_assessed_at"] is not None

    incident = client.get(f"/incidents/{incident_id}").json()
    assert incident["status"] == "Open"
    assert incident["resolved_at"] is None
