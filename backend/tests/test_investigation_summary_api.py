"""Focused coverage for the read-only incident investigation summary."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database.models import Incident, RecommendationExecution
from app.database.postgres import get_db
from app.main import app


@pytest.fixture(autouse=True)
def clean_incidents(test_engine):
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


def _create_incident(client, *, service_name="api-gateway"):
    response = client.post("/incidents/", json={
        "service_name": service_name,
        "severity": "High",
        "anomaly_type": "cpu",
        "root_cause": "CPU saturation",
        "recommendation": "scale out workers",
    })
    assert response.status_code == 200
    return response.json()["incident_id"]


def test_investigation_summary_composes_persisted_context_and_executions(client):
    incident_id = _create_incident(client)
    assert client.post(
        f"/incidents/{incident_id}/feedback",
        json={"status": "accepted", "reason": "Reviewed"},
    ).status_code == 200
    assert client.post(
        f"/incidents/{incident_id}/executions",
        json={"recommendation": "first attempt"},
    ).status_code == 200
    assert client.post(
        f"/incidents/{incident_id}/executions",
        json={"recommendation": "second attempt"},
    ).status_code == 200

    response = client.get(f"/incidents/{incident_id}/investigation-summary")

    assert response.status_code == 200
    body = response.json()
    assert body["incident"]["id"] == incident_id
    assert body["telemetry_snapshot"] is not None
    assert body["operator_feedback"]["status"] == "accepted"
    assert body["recommendation_explanation"] is None
    assert [item["attempt_number"] for item in body["executions"]] == [2, 1]
    assert [item["event_type"] for item in body["timeline"]] == [
        "created",
        "evidence_unavailable",
        "diagnosed",
        "recommended",
        "recommendation_accepted",
    ]
    assert "Historical evidence was not captured for this incident." in body["limitations"]
    assert isinstance(body["historical_intelligence"]["similar_incidents"], list)
    assert isinstance(body["limitations"], list)
    assert body["timeline"] == client.get(
        f"/incidents/{incident_id}/investigation-summary"
    ).json()["timeline"]


def test_investigation_summary_returns_404_for_unknown_incident(client):
    response = client.get("/incidents/999999/investigation-summary")

    assert response.status_code == 404
    assert response.json()["detail"] == "Incident not found"


def test_investigation_summary_preserves_legacy_null_snapshots(client, test_engine):
    with Session(bind=test_engine) as session:
        incident = Incident(
            service_name="legacy-service",
            severity="Low",
            anomaly_type="legacy anomaly",
            root_cause="legacy cause",
            recommendation="monitor",
            timestamp=datetime(2026, 1, 1),
            evidence_snapshot=None,
            telemetry_snapshot=None,
        )
        session.add(incident)
        session.commit()
        incident_id = incident.id

    body = client.get(f"/incidents/{incident_id}/investigation-summary").json()

    assert body["incident"]["evidence_snapshot"] is None
    assert body["telemetry_snapshot"] is None
    assert body["recommendation_explanation"] is None
    assert body["operator_feedback"] is None
    assert "Telemetry snapshot was not captured for this incident." in body["limitations"]
    assert "Historical evidence was not captured for this incident." in body["limitations"]


def test_investigation_summary_includes_historical_intelligence_and_recorded_explanation(client, test_engine):
    with Session(bind=test_engine) as session:
        old = Incident(
            service_name="payments",
            severity="High",
            anomaly_type="cpu",
            root_cause="CPU saturation",
            recommendation="scale database",
            timestamp=datetime(2026, 1, 1),
        )
        session.add(old)
        session.commit()
        old_id = old.id

    incident_id = _create_incident(client, service_name="payments")
    with Session(bind=test_engine) as session:
        current = session.get(Incident, incident_id)
        current.timestamp = datetime(2026, 1, 2)
        current.evidence_snapshot = {
            "recommendation_explanation": {"reason": "recorded rationale"},
        }
        session.commit()

    body = client.get(f"/incidents/{incident_id}/investigation-summary").json()

    assert body["historical_intelligence"]["historical_summary"]["same_service_count"] == 1
    assert body["historical_intelligence"]["similar_incidents"][0]["id"] == old_id
    assert body["recommendation_explanation"] == {"reason": "recorded rationale"}
