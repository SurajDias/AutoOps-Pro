"""Unit coverage for the deterministic, fact-bounded report builder."""

from datetime import datetime, timezone

from app.database.models import Incident
from app.storytelling.incident_report_generator import build_incident_report


def _incident(snapshot=None, **changes):
    values = {
        "id": 42,
        "service_name": "payment",
        "severity": "Critical",
        "anomaly_type": "CPU threshold exceeded",
        "root_cause": "High CPU",
        "recommendation": "scale_cpu",
        "status": "Open",
        "timestamp": datetime(2026, 1, 1, 12, 0),
        "evidence_snapshot": snapshot,
    }
    values.update(changes)
    return Incident(**values)


def test_report_is_deterministic_and_uses_only_snapshot_evidence():
    snapshot = {
        "captured_at": "2026-01-01T12:00:00+00:00",
        "metrics": {"cpu": 88, "memory": 74, "latency": 220},
        "anomaly_score": 0.91,
        "anomaly_reason": "CPU threshold exceeded",
        "rule_evidence": True,
        "isolation_forest_anomaly": True,
        "detection_thresholds": {"cpu": 80, "memory": 85},
        "root_cause": "High CPU",
        "primary_issue": "High CPU",
        "root_cause_confidence": 82,
        "root_cause_details": ["CPU at 88% (threshold: 60%)"],
        "recommended_action": "scale_cpu",
        "recommendation_explanation": {
            "recommended_action": "scale_cpu", "reason": "CPU was elevated.",
            "action_score": 0.8, "candidates": [], "selection_factors": [],
        },
    }
    incident = _incident(snapshot)
    timeline = [{"event_type": "created", "timestamp": "2026-01-01T12:00:00+00:00"}]
    fixed_now = lambda: datetime(2026, 1, 2, tzinfo=timezone.utc)

    first = build_incident_report(incident, timeline, now=fixed_now)
    second = build_incident_report(incident, timeline, now=fixed_now)

    assert first == second
    evidence = first["sections"]["historical_evidence"]
    assert evidence["metrics"]["cpu"] == 88
    assert evidence["metrics"]["response_time"] == "Not available in the persisted incident record."
    assert evidence["thresholds"] == {"cpu": 80, "memory": 85}
    assert "CPU at 88%" in first["sections"]["root_cause"]["recorded_facts"]["supporting_evidence"]
    assert first["sections"]["timeline"] == timeline
    assert first["sections"]["recommendation"]["decision_engine_ranking_signal"] == 0.8
    assert first["sections"]["simulation"]["available"] is False


def test_legacy_and_lifecycle_language_stays_within_fact_boundary():
    incident = _incident(None, status="Resolved", resolved_at=datetime(2026, 1, 1, 12, 5))
    report = build_incident_report(incident, [], now=lambda: datetime(2026, 1, 2, tzinfo=timezone.utc))

    assert report["sections"]["historical_evidence"]["available"] is False
    assert report["sections"]["operator_feedback"]["recorded"] is False
    assert report["sections"]["resolution"]["message"] == "The incident was transitioned to resolved state."
    assert report["sections"]["overview"]["elapsed_incident_duration"] == "5m 0s"
    assert "not remediation duration" in report["sections"]["overview"]["duration_definition"].lower()


def test_report_preserves_supplied_historical_intelligence_without_claiming_it_is_incident_evidence():
    intelligence = {
        "incident_id": 7,
        "historical_summary": {"same_service_count": 2},
        "similar_incidents": [{"id": 3, "service_name": "api"}],
    }

    report = build_incident_report(_incident(), [], historical_intelligence=intelligence)

    section = report["sections"]["historical_intelligence"]
    assert section["available"] is True
    assert section["summary"] == intelligence["historical_summary"]
    assert section["similar_incidents"] == intelligence["similar_incidents"]
    assert "does not alter" in section["notice"]


def test_feedback_and_dependency_impact_are_reported_without_execution_claims():
    incident = _incident(
        {"dependency_service_id": "gateway"},
        feedback_status="rejected",
        feedback_reason="Not appropriate.",
        feedback_action="scale_cpu",
        feedback_created_at=datetime(2026, 1, 1, 12, 1),
    )
    report = build_incident_report(incident, [], now=lambda: datetime(2026, 1, 2, tzinfo=timezone.utc))

    assert report["sections"]["operator_feedback"]["status"] == "rejected"
    assert "does not indicate" in report["sections"]["operator_feedback"]["notice"]
    impact = report["sections"]["impact"]
    assert impact["total_affected"] == 0
    assert impact["zero_downstream_explanation"] == "No downstream dependents found in the canonical topology."
