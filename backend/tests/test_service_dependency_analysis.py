"""Focused dependency-impact coverage for the static service topology."""

from fastapi.testclient import TestClient

from app.main import app
from app.services.service_graph import analyze_dependency_impact


def test_gateway_failure_has_no_dependents():
    result = analyze_dependency_impact("gateway")

    assert result["failed_service"] == "gateway"
    assert result["impact_count"] == 0
    assert result["directly_affected_services"] == []
    assert result["transitively_affected_services"] == []


def test_database_failure_returns_transitive_impact_with_shortest_paths():
    result = analyze_dependency_impact("db")

    assert [item["service_id"] for item in result["directly_affected_services"]] == [
        "auth",
        "payment",
        "inventory",
    ]
    assert [item["service_id"] for item in result["transitively_affected_services"]] == [
        "gateway",
        "order",
    ]
    assert result["impact_count"] == 5

    affected = {item["service_id"]: item for item in result["affected_services"]}
    assert affected["gateway"] == {
        "service_id": "gateway",
        "label": "API Gateway",
        "depth": 2,
        "dependency_path": ["gateway", "auth", "db"],
    }
    assert affected["order"]["depth"] == 2
    assert affected["order"]["dependency_path"] == ["order", "payment", "db"]


def test_order_failure_directly_impacts_gateway():
    result = analyze_dependency_impact("order")

    assert result["directly_affected_services"] == [{
        "service_id": "gateway",
        "label": "API Gateway",
        "depth": 1,
        "dependency_path": ["gateway", "order"],
    }]
    assert result["transitively_affected_services"] == []


def test_cycle_protection_prevents_revisiting_the_failed_service():
    cyclic_graph = {
        "gateway": ("auth",),
        "auth": ("gateway",),
        "db": (),
    }

    result = analyze_dependency_impact("gateway", dependencies=cyclic_graph)

    assert result["affected_services"] == [{
        "service_id": "auth",
        "label": "Auth Service",
        "depth": 1,
        "dependency_path": ["auth", "gateway"],
    }]


def test_dependency_impact_api_rejects_unknown_service_and_has_no_request_leakage():
    with TestClient(app) as client:
        database_response = client.get("/service-dependencies/db/impact")
        gateway_response = client.get("/service-dependencies/gateway/impact")
        unknown_response = client.get("/service-dependencies/missing/impact")

    assert database_response.status_code == 200
    assert database_response.json()["impact_count"] == 5
    assert gateway_response.status_code == 200
    assert gateway_response.json()["affected_services"] == []
    assert unknown_response.status_code == 404
    assert unknown_response.json()["detail"] == "Unknown service 'missing'."


def test_existing_topology_endpoint_uses_the_canonical_graph():
    with TestClient(app) as client:
        response = client.get("/topology")

    assert response.status_code == 200
    assert response.json() == {
        "nodes": [
            {"id": "gateway", "label": "API Gateway"},
            {"id": "auth", "label": "Auth Service"},
            {"id": "order", "label": "Order Service"},
            {"id": "payment", "label": "Payment Service"},
            {"id": "inventory", "label": "Inventory Service"},
            {"id": "db", "label": "Database"},
        ],
        "edges": [
            {"source": "gateway", "target": "auth"},
            {"source": "gateway", "target": "order"},
            {"source": "auth", "target": "db"},
            {"source": "order", "target": "payment"},
            {"source": "order", "target": "inventory"},
            {"source": "payment", "target": "db"},
            {"source": "inventory", "target": "db"},
        ],
    }
