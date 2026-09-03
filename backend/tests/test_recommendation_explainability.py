"""Decision-output observability coverage without changing decision semantics."""

from app.models.simulator import WhatIfSimulator
from app.routes.system import _recommendation_explanation


METRICS = {"cpu": 90, "memory": 91, "latency": 400, "error_rate": 6}
ROOT_CAUSE = {
    "primary_issue": "High CPU",
    "summary": "High CPU + High Memory + Slow Response + High Errors",
    "severity": "Critical",
    "confidence": 90,
}


def test_recommendation_explanation_exposes_existing_decision_scores_and_evidence():
    decision = WhatIfSimulator()._select_best_action(METRICS, ROOT_CAUSE, anomaly=True)
    explanation = _recommendation_explanation(METRICS, ROOT_CAUSE, decision)

    assert decision["action"] == "scale_cpu"
    assert decision["action_score"] == 0.65
    assert [(candidate["action"], candidate["score"]) for candidate in decision["candidates"]] == [
        ("scale_cpu", 0.65),
        ("restart_service", 0.4),
        ("optimize_memory", 0.35),
        ("reduce_latency", 0.35),
        ("throttle_requests", 0.2),
    ]
    assert explanation["recommended_action"] == decision["action"]
    assert explanation["action_score"] == decision["action_score"]
    assert [candidate["rank"] for candidate in explanation["candidates"]] == [1, 2, 3, 4, 5]
    assert "CPU is 90.0%" in explanation["candidates"][0]["evidence"][0]
    assert "Primary issue recorded by root-cause analysis: High CPU." in explanation["selection_factors"]
    assert "probability" not in str(explanation).lower()
