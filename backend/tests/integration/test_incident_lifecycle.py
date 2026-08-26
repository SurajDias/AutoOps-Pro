"""Incident lifecycle integration coverage against the isolated PostgreSQL DB."""

from collections.abc import Callable

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
    trigger_condition()

    incidents = _all_incidents(client)
    assert len(incidents) == 1
    assert incidents[0]["status"] == "Open"
    assert incidents[0]["service_name"] == "api-gateway"


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
    incident_id = _all_incidents(client)[0]["id"]

    response = client.put(f"/incidents/{incident_id}", json={"status": "Resolved"})
    assert response.status_code == 200
    assert response.json()["message"] == "Incident updated successfully"

    incidents = _all_incidents(client)
    assert incidents[0]["status"] == "Resolved"
    assert _statistics(client) == {
        "total_incidents": 1,
        "open_incidents": 0,
        "resolved_incidents": 1,
        "high_severity_incidents": 1,
    }


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
