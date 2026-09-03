"""Regression coverage for PostgreSQL advisory-lock incident deduplication."""

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.database.models import Incident
from app.main import app
from app.routes import system


SERVICE_NAME = "api-gateway"
SEVERITY = "Critical"
ROOT_CAUSE = "High CPU + High Memory + Slow Response + High Errors"
CONCURRENT_REQUESTS = 10


@pytest.fixture(autouse=True)
def clean_incidents(test_engine):
    """System-status persists independently, so clean committed test rows."""
    with test_engine.begin() as connection:
        connection.execute(delete(Incident))
    yield
    with test_engine.begin() as connection:
        connection.execute(delete(Incident))


def _matching_open_incidents(test_engine):
    with Session(test_engine) as session:
        return session.scalars(
            select(Incident).where(
                Incident.service_name == SERVICE_NAME,
                Incident.severity == SEVERITY,
                Incident.root_cause == ROOT_CAUSE,
                Incident.status == "Open",
            )
        ).all()


def test_concurrent_system_status_requests_create_one_open_incident(test_engine, monkeypatch):
    """Ten concurrent endpoint calls contend on the real PostgreSQL xact lock."""
    qualifying_metrics = {
        "cpu": 90,
        "memory": 91,
        "response_time": 400,
        "requests": 720,
        "error_rate": 6,
        "latency": 400,
    }
    monkeypatch.setattr(system, "metrics", qualifying_metrics)
    monkeypatch.setattr(system, "get_recent_metrics", lambda limit=12: [])
    monkeypatch.setattr(
        system,
        "get_scenario",
        lambda: {"name": "test-critical", "service": SERVICE_NAME},
    )

    assert _matching_open_incidents(test_engine) == []

    barrier = Barrier(CONCURRENT_REQUESTS)

    def request_system_status():
        barrier.wait(timeout=10)
        return client.get("/system-status")

    with TestClient(app) as client, ThreadPoolExecutor(max_workers=CONCURRENT_REQUESTS) as executor:
        responses = list(executor.map(lambda _: request_system_status(), range(CONCURRENT_REQUESTS)))

    assert len(responses) == CONCURRENT_REQUESTS
    assert all(response.status_code == 200 for response in responses)
    assert not any(response.status_code == 503 for response in responses)
    assert all(response.json()["severity"] == SEVERITY for response in responses)
    assert all(response.json()["root_cause"] == ROOT_CAUSE for response in responses)

    incidents = _matching_open_incidents(test_engine)
    assert len(incidents) == 1
    assert incidents[0].service_name == SERVICE_NAME
    assert incidents[0].evidence_snapshot["metrics"] == qualifying_metrics
    assert incidents[0].evidence_snapshot["root_cause"] == ROOT_CAUSE
    with TestClient(app) as detail_client:
        detail = detail_client.get(f"/incidents/{incidents[0].id}")
    assert detail.status_code == 200
    assert [event["event_type"] for event in detail.json()["timeline"]] == [
        "created", "evidence_captured", "diagnosed", "recommended",
    ]


def test_concurrent_feedback_records_one_deterministic_operator_response(test_engine, monkeypatch):
    monkeypatch.setattr(system, "metrics", {
        "cpu": 90, "memory": 91, "response_time": 400, "requests": 720,
        "error_rate": 6, "latency": 400,
    })
    monkeypatch.setattr(system, "get_recent_metrics", lambda limit=12: [])
    monkeypatch.setattr(system, "get_scenario", lambda: {"name": "test-critical", "service": SERVICE_NAME})
    system.get_system_status()
    incident_id = _matching_open_incidents(test_engine)[0].id
    barrier = Barrier(2)

    def submit(status):
        barrier.wait(timeout=10)
        with TestClient(app) as client:
            return client.post(f"/incidents/{incident_id}/feedback", json={"status": status})

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(submit, ("accepted", "rejected")))

    assert sorted(response.status_code for response in responses) == [200, 409]
    with TestClient(app) as client:
        detail = client.get(f"/incidents/{incident_id}").json()
    assert detail["operator_feedback"]["status"] in {"accepted", "rejected"}
