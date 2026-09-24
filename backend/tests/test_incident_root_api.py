"""Regression coverage for the incident collection root endpoint."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.database.models import Incident, RecommendationExecution
from app.database.postgres import get_db
from app.main import app


@pytest.fixture
def client(test_engine):
    with test_engine.begin() as connection:
        connection.execute(delete(RecommendationExecution))
        connection.execute(delete(Incident))

    def override_get_db():
        session = Session(bind=test_engine)
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        with test_engine.begin() as connection:
            connection.execute(delete(RecommendationExecution))
            connection.execute(delete(Incident))


def test_incident_root_returns_persisted_incident_list(client):
    response = client.post("/incidents/", json={
        "service_name": "api-gateway",
        "severity": "High",
        "anomaly_type": "cpu",
        "root_cause": "CPU saturation",
        "recommendation": "scale workers",
    })
    assert response.status_code == 200

    response = client.get("/incidents/")

    assert response.status_code == 200
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["service_name"] == "api-gateway"
