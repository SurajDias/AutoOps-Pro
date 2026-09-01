"""Member 3 coverage for the dependency-analysis adapter and API."""

import pytest
from fastapi import HTTPException

from app.api.dependency_api import get_service_impact
from app.models.cascade_predictor import cascade_predict
from app.services.service_graph import analyze_dependency_impact


def test_cascade_adapter_uses_canonical_graph_and_blast_radius():
    result = cascade_predict("db")

    assert result["affected_count"] == 5
    assert result["cascade_depth"] == 2
    assert result["severity"] == "critical"
    assert result["blast_radius"] == "critical"
    assert result["failure_paths"] == [
        {"service_id": "auth", "dependency_path": ["auth", "db"]},
        {"service_id": "payment", "dependency_path": ["payment", "db"]},
        {"service_id": "inventory", "dependency_path": ["inventory", "db"]},
        {"service_id": "gateway", "dependency_path": ["gateway", "auth", "db"]},
        {"service_id": "order", "dependency_path": ["order", "payment", "db"]},
    ]


def test_dependency_api_selects_canonical_service_ids_and_is_request_local():
    database_result = get_service_impact("db")
    gateway_result = get_service_impact("gateway")

    assert database_result["affected_count"] == 5
    assert gateway_result["affected_services"] == []

    with pytest.raises(HTTPException) as error:
        get_service_impact("missing")

    assert error.value.status_code == 404
    assert error.value.detail == "Unknown service 'missing'."


def test_cascade_adapter_rejects_unknown_service_without_mutating_graph_state():
    assert cascade_predict("unknown") == {
        "error": "Service not found",
        "service": "unknown",
    }


def test_cycle_protection_retains_the_shortest_failure_path():
    result = analyze_dependency_impact(
        "gateway",
        dependencies={
            "gateway": ("auth",),
            "auth": ("gateway",),
            "db": (),
        },
    )

    assert result["affected_services"] == [{
        "service_id": "auth",
        "label": "Auth Service",
        "depth": 1,
        "dependency_path": ["auth", "gateway"],
    }]
