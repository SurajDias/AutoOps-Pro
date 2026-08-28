from app.api.dependency_api import get_service_impact
from app.models.cascade_predictor import cascade_predict


def test_cascade_prediction_follows_reverse_dependencies():
    result = cascade_predict("Database")

    assert result["affected_services"] == [
        "Auth Service",
        "Payment Service",
        "Inventory Service",
        "API Gateway",
        "Order Service",
    ]
    assert result["cascade_depth"] == 3
    assert result["severity"] == "high"


def test_dependency_api_maps_topology_id_to_graph_label():
    result = get_service_impact("payment")

    assert result["failed_service"] == "Payment Service"
    assert result["affected_services"] == [
        "Order Service",
        "API Gateway",
    ]


def test_cascade_prediction_rejects_unknown_service():
    assert cascade_predict("unknown") == {
        "error": "Service not found",
        "service": "unknown",
    }