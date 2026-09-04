"""Incident lifecycle integration coverage against the isolated PostgreSQL DB."""

from collections.abc import Callable
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database.models import Incident
from app.database.postgres import get_db
from app.main import app
from app.routes import system


ROOT_CAUSE = "High CPU + High Memory + Slow Response + High Errors"


@pytest.fixture(autouse=True)
def clean_incidents(test_engine):
    """Keep committed system-status writes isolated to each test."""
    with test_engine.begin() as connection:
        connection.execute(delete(Incident))
    yield
    with test_engine.begin() as connection:
        connection.execute(delete(Incident))


@pytest.fixture
def client(test_engine):
    """Exercise incident HTTP routes with sessions bound to the test engine."""
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


@pytest.fixture
def trigger_condition(monkeypatch) -> Callable[..., dict]:
    """Call the existing automatic incident route with stable critical inputs."""
    monkeypatch.setattr(system, "get_recent_metrics", lambda limit=12: [])

    def trigger(service_name="api-gateway", cpu=90, response_time=400):
        values = {
            "cpu": cpu,
            "memory": 91,
            "response_time": response_time,
            "requests": 720,
            "error_rate": 6,
            "latency": response_time,
        }
        monkeypatch.setattr(system, "metrics", values)
        monkeypatch.setattr(
            system,
            "get_scenario",
            lambda: {"name": "test-critical", "service": service_name},
        )
        response = system.get_system_status()
        assert response["severity"] == "Critical"
        assert response["root_cause"] == ROOT_CAUSE
        return response

    return trigger


def _all_incidents(client):
    response = client.get("/incidents/all")
    assert response.status_code == 200
    return response.json()


def _statistics(client):
    response = client.get("/incidents/statistics")
    assert response.status_code == 200
    return response.json()


def test_incident_creation_and_listing(client, trigger_condition):
    status = trigger_condition()

    incidents = _all_incidents(client)
    assert len(incidents) == 1
    assert incidents[0]["status"] == "Open"
    assert incidents[0]["service_name"] == "api-gateway"
    snapshot = incidents[0]["evidence_snapshot"]
    captured_at = snapshot.pop("captured_at")
    assert captured_at
    explanation = snapshot.pop("recommendation_explanation")
    assert explanation["recommended_action"] == status["recommended_action"]
    assert snapshot == {
        "metrics": {
            "cpu": 90,
            "memory": 91,
            "response_time": 400,
            "latency": 400,
            "requests": 720,
            "error_rate": 6,
        },
        "anomaly_score": status["anomaly_score"],
        "anomaly_reason": status["anomaly_reason"],
        "rule_evidence": True,
        "isolation_forest_anomaly": status["detection_evidence"]["isolation_forest_anomaly"],
        "detection_thresholds": status["detection_evidence"]["thresholds"],
        "root_cause": ROOT_CAUSE,
        "primary_issue": "High CPU",
        "root_cause_confidence": status["confidence"],
        "root_cause_details": [
            "CPU at 90.0% (threshold: 60%)",
            "Memory at 91.0% (threshold: 75%)",
            "Response time 400.0ms (threshold: 120ms)",
            "Error rate 6.0% (threshold: 1%)",
        ],
        "severity": "Critical",
        "risk": status["risk"],
        "recommended_action": status["recommended_action"],
        "trend": status["trends"]["risk_direction"],
        "estimated_failure_window": status["time_to_failure"],
        "dependency_service_id": None,
    }


def test_incident_detail_returns_immutable_evidence_snapshot(client, trigger_condition):
    trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]

    detail = client.get(f"/incidents/{incident_id}")
    assert detail.status_code == 200
    snapshot = detail.json()["evidence_snapshot"]
    assert snapshot["metrics"]["cpu"] == 90
    assert snapshot["root_cause"] == ROOT_CAUSE
    assert detail.json()["recommendation_explanation"] == snapshot["recommendation_explanation"]

    # The current analysis can move on, but the incident detail must retain
    # the recommendation reasoning captured with this historical record.
    trigger_condition(cpu=94, response_time=470)
    historical_detail = client.get(f"/incidents/{incident_id}").json()
    assert historical_detail["recommendation_explanation"] == snapshot["recommendation_explanation"]
    assert "CPU is 90.0%" in str(historical_detail["recommendation_explanation"])


def test_legacy_incident_has_no_fabricated_recommendation_reasoning(client):
    response = client.post("/incidents/", json={
        "service_name": "payment",
        "severity": "Warning",
        "anomaly_type": "Legacy record",
        "root_cause": "Legacy cause",
        "recommendation": "Monitor",
        "status": "Open",
    })

    detail = client.get(f"/incidents/{response.json()['incident_id']}")
    assert detail.status_code == 200
    assert detail.json()["recommendation_explanation"] is None


def test_legacy_open_incident_does_not_suppress_new_evidence_backed_incident(client, trigger_condition):
    legacy = client.post("/incidents/", json={
        "service_name": "api-gateway",
        "severity": "Critical",
        "anomaly_type": "Legacy record",
        "root_cause": ROOT_CAUSE,
        "recommendation": "Monitor",
        "status": "Open",
    })
    assert legacy.status_code == 200

    trigger_condition()
    incidents = _all_incidents(client)

    assert len(incidents) == 2
    legacy_record = next(item for item in incidents if item["id"] == legacy.json()["incident_id"])
    new_record = next(item for item in incidents if item["id"] != legacy_record["id"])
    assert legacy_record["evidence_snapshot"] is None
    assert new_record["evidence_snapshot"]["metrics"]["cpu"] == 90
    assert new_record["evidence_snapshot"]["recommendation_explanation"]["recommended_action"] == new_record["recommendation"]


def test_accept_feedback_is_persisted_with_the_recorded_recommendation(client, trigger_condition):
    status = trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]

    response = client.post(f"/incidents/{incident_id}/feedback", json={
        "status": "accepted",
        "reason": "The recommendation matches the observed CPU bottleneck.",
    })
    assert response.status_code == 200
    feedback = response.json()["operator_feedback"]
    assert feedback["status"] == "accepted"
    assert feedback["reason"] == "The recommendation matches the observed CPU bottleneck."
    assert feedback["action"] == status["recommended_action"]
    assert feedback["created_at"]

    detail = client.get(f"/incidents/{incident_id}").json()
    assert detail["operator_feedback"] == feedback
    event = next(event for event in detail["timeline"] if event["event_type"] == "recommendation_accepted")
    assert event["timestamp"] == feedback["created_at"]
    assert "Operator accepted" in event["description"]
    assert "executed" not in event["description"]


def test_reject_feedback_allows_no_reason_and_survives_resolution(client, trigger_condition):
    trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]

    response = client.post(f"/incidents/{incident_id}/feedback", json={"status": "rejected"})
    assert response.status_code == 200
    feedback = response.json()["operator_feedback"]
    assert feedback["status"] == "rejected"
    assert feedback["reason"] is None

    assert client.put(f"/incidents/{incident_id}", json={"status": "Resolved"}).status_code == 200
    detail = client.get(f"/incidents/{incident_id}").json()
    assert detail["operator_feedback"] == feedback
    assert any(event["event_type"] == "recommendation_rejected" for event in detail["timeline"])


def test_feedback_validates_status_reason_length_missing_incident_and_duplicate_submission(client, trigger_condition):
    trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]

    assert client.post(f"/incidents/{incident_id}/feedback", json={"status": "deferred"}).status_code == 422
    assert client.post(f"/incidents/{incident_id}/feedback", json={"status": "accepted", "reason": "x" * 1001}).status_code == 422
    assert client.post("/incidents/999999/feedback", json={"status": "accepted"}).status_code == 404
    assert client.post(f"/incidents/{incident_id}/feedback", json={"status": "accepted"}).status_code == 200
    assert client.post(f"/incidents/{incident_id}/feedback", json={"status": "rejected"}).status_code == 409


def test_incident_detail_exposes_persisted_timeline_in_chronological_order(client, trigger_condition):
    status = trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]

    detail = client.get(f"/incidents/{incident_id}")
    assert detail.status_code == 200
    body = detail.json()
    timeline = body["timeline"]

    assert [event["event_type"] for event in timeline] == [
        "created", "evidence_captured", "diagnosed", "recommended",
    ]
    assert timeline == sorted(timeline, key=lambda event: event["timestamp"])
    assert timeline[0]["title"] == "Incident created"
    assert timeline[1]["timestamp"] == body["evidence_snapshot"]["captured_at"]
    assert ROOT_CAUSE in timeline[2]["description"]
    assert status["recommended_action"] == timeline[3]["description"]
    assert all(event["event_type"] != "resolved" for event in timeline)


def test_resolved_incident_timeline_uses_persisted_resolution_timestamp(client, trigger_condition):
    trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]

    assert client.put(f"/incidents/{incident_id}", json={"status": "Resolved"}).status_code == 200
    detail = client.get(f"/incidents/{incident_id}").json()
    resolved = detail["timeline"][-1]

    assert resolved["event_type"] == "resolved"
    assert resolved["timestamp"] == detail["resolved_at"] + "+00:00"
    assert "Resolved" in resolved["description"]


def test_incident_statistics(client, trigger_condition):
    trigger_condition()

    assert _statistics(client) == {
        "total_incidents": 1,
        "open_incidents": 1,
        "resolved_incidents": 0,
        "high_severity_incidents": 1,
    }


def test_sequential_deduplication_ignores_metric_bearing_anomaly_type(client, trigger_condition):
    first = trigger_condition(cpu=90, response_time=400)
    second = trigger_condition(cpu=92, response_time=430)
    third = trigger_condition(cpu=94, response_time=470)

    assert len({first["anomaly_reason"], second["anomaly_reason"], third["anomaly_reason"]}) == 3
    incidents = _all_incidents(client)
    assert len(incidents) == 1
    assert incidents[0]["status"] == "Open"
    assert incidents[0]["root_cause"] == ROOT_CAUSE


def test_resolve_incident_updates_listing_and_statistics(client, trigger_condition):
    trigger_condition()
    original = _all_incidents(client)[0]
    incident_id = original["id"]

    response = client.put(f"/incidents/{incident_id}", json={"status": "Resolved"})
    assert response.status_code == 200
    assert response.json()["message"] == "Incident updated successfully"

    incidents = _all_incidents(client)
    assert incidents[0]["status"] == "Resolved"
    assert incidents[0]["evidence_snapshot"] == original["evidence_snapshot"]
    assert _statistics(client) == {
        "total_incidents": 1,
        "open_incidents": 0,
        "resolved_incidents": 1,
        "high_severity_incidents": 1,
    }


def test_legacy_incident_without_snapshot_remains_readable(client):
    response = client.post("/incidents/", json={
        "service_name": "payment",
        "severity": "Warning",
        "anomaly_type": "Legacy record",
        "root_cause": "Legacy cause",
        "recommendation": "Monitor",
        "status": "Open",
    })
    assert response.status_code == 200
    incident_id = response.json()["incident_id"]

    detail = client.get(f"/incidents/{incident_id}")
    assert detail.status_code == 200
    body = detail.json()
    assert body["evidence_snapshot"] is None
    assert [event["event_type"] for event in body["timeline"]] == [
        "created", "evidence_unavailable", "diagnosed", "recommended",
    ]
    assert "not captured" in body["timeline"][1]["description"]


def test_resolved_incident_does_not_suppress_new_occurrence(client, trigger_condition):
    trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]
    assert client.put(f"/incidents/{incident_id}", json={"status": "Resolved"}).status_code == 200

    trigger_condition(cpu=93, response_time=450)

    incidents = _all_incidents(client)
    assert len(incidents) == 2
    assert sorted(incident["status"] for incident in incidents) == ["Open", "Resolved"]
    assert _statistics(client) == {
        "total_incidents": 2,
        "open_incidents": 1,
        "resolved_incidents": 1,
        "high_severity_incidents": 2,
    }


def test_different_incident_identity_does_not_deduplicate(client, trigger_condition):
    trigger_condition(service_name="api-gateway")
    trigger_condition(service_name="postgres-primary", cpu=93, response_time=450)

    incidents = _all_incidents(client)
    assert len(incidents) == 2
    assert {incident["service_name"] for incident in incidents} == {
        "api-gateway",
        "postgres-primary",
    }
    assert {incident["status"] for incident in incidents} == {"Open"}


def test_incident_report_endpoint_is_structured_and_uses_persisted_snapshot(client, trigger_condition, monkeypatch):
    trigger_condition(cpu=90, response_time=400)
    incident = _all_incidents(client)[0]

    # A report must not query today's telemetry to reconstruct history.
    monkeypatch.setattr(system, "get_system_status", lambda: pytest.fail("current telemetry must not be read"))
    response = client.get(f"/incidents/{incident['id']}/report")

    assert response.status_code == 200
    report = response.json()
    assert report["incident_id"] == incident["id"]
    assert report["generation"]["provider"] == "deterministic"
    assert report["sections"]["historical_evidence"]["metrics"] == incident["evidence_snapshot"]["metrics"]
    assert report["sections"]["root_cause"]["recorded_facts"]["primary_root_cause"] == ROOT_CAUSE
    assert report["sections"]["recommendation"]["recommended_action"] == incident["recommendation"]
    assert report["sections"]["recommendation"]["decision_engine_ranking_signal"] == incident["evidence_snapshot"]["recommendation_explanation"]["action_score"]
    assert "probability" not in report["sections"]["recommendation"].get("reasoning", "").lower()
    assert report["sections"]["simulation"]["available"] is False
    assert "projected what-if" in report["sections"]["simulation"]["notice"].lower()
    assert report["sections"]["timeline"] == client.get(f"/incidents/{incident['id']}").json()["timeline"]


def test_legacy_incident_report_does_not_fabricate_historical_sections(client):
    created = client.post("/incidents/", json={
        "service_name": "payment", "severity": "Warning", "anomaly_type": "Legacy record",
        "root_cause": "Legacy cause", "recommendation": "Monitor", "status": "Open",
    }).json()
    report = client.get(f"/incidents/{created['incident_id']}/report").json()

    assert report["sections"]["historical_evidence"] == {
        "available": False,
        "message": "Historical evidence was not captured for this incident.",
        "metrics": {},
    }
    assert report["sections"]["recommendation"]["reasoning"] == "Not available in the persisted incident record."
    assert report["sections"]["simulation"]["available"] is False
    assert report["sections"]["operator_feedback"]["recorded"] is False


def test_report_feedback_and_resolution_never_claim_execution(client, trigger_condition):
    trigger_condition()
    incident_id = _all_incidents(client)[0]["id"]
    client.post(f"/incidents/{incident_id}/feedback", json={"status": "accepted", "reason": "Approved for review."})
    client.put(f"/incidents/{incident_id}", json={"status": "Resolved"})

    report = client.get(f"/incidents/{incident_id}/report").json()
    feedback = report["sections"]["operator_feedback"]
    assert feedback["status"] == "accepted"
    assert "does not indicate" in feedback["notice"]
    assert report["sections"]["resolution"]["status"] == "Resolved"
    assert report["sections"]["resolution"]["resolved_at"]
    assert "transitioned to resolved state" in report["sections"]["resolution"]["message"].lower()
    assert "remediation" not in report["sections"]["resolution"]["message"].lower()
    assert "remediation duration" in report["sections"]["overview"]["duration_definition"]


def test_report_preserves_canonical_dependency_direction_and_zero_dependents(client, test_engine):
    with Session(bind=test_engine) as session:
        incident = Incident(
            service_name="database", severity="High", anomaly_type="Dependency failure",
            root_cause="Database unavailable", recommendation="Investigate",
            timestamp=datetime(2026, 1, 1),
            evidence_snapshot={"dependency_service_id": "db"},
        )
        session.add(incident)
        session.commit()
        incident_id = incident.id
    impact = client.get(f"/incidents/{incident_id}/report").json()["sections"]["impact"]
    assert impact["failed_service"] == "db"
    assert "gateway" in [item["service_id"] for item in impact["transitive_dependents"]]

    with Session(bind=test_engine) as session:
        leaf = Incident(
            service_name="gateway", severity="Warning", anomaly_type="Dependency failure",
            root_cause="Gateway unavailable", recommendation="Investigate",
            timestamp=datetime(2026, 1, 1),
            evidence_snapshot={"dependency_service_id": "gateway"},
        )
        session.add(leaf)
        session.commit()
        leaf_id = leaf.id
    zero = client.get(f"/incidents/{leaf_id}/report").json()["sections"]["impact"]
    assert zero["total_affected"] == 0
    assert zero["zero_downstream_explanation"] == "No downstream dependents found in the canonical topology."
