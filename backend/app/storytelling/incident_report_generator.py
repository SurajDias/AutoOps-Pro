"""Deterministic, fact-bounded incident report construction.

This module deliberately has no telemetry, simulator, or provider dependency.
Its input is a persisted ``Incident`` plus the canonical topology, so generated
narrative cannot accidentally turn current state into historical evidence.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from app.database.models import Incident
from app.services.service_graph import SERVICE_IDS, analyze_dependency_impact


NOT_AVAILABLE = "Not available in the persisted incident record."
NO_HISTORICAL_EVIDENCE = "Historical evidence was not captured for this incident."


def _timestamp(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat() if value.tzinfo is None else value.isoformat()


def _duration(created_at: datetime | None, resolved_at: datetime | None) -> str | None:
    if created_at is None or resolved_at is None:
        return None
    seconds = max(0, int((resolved_at - created_at).total_seconds()))
    hours, remainder = divmod(seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    if hours:
        return f"{hours}h {minutes}m {seconds}s"
    if minutes:
        return f"{minutes}m {seconds}s"
    return f"{seconds}s"


def _value(value: Any) -> Any:
    return value if value is not None else NOT_AVAILABLE


def _historical_evidence(snapshot: dict[str, Any] | None) -> dict[str, Any]:
    if not snapshot:
        return {"available": False, "message": NO_HISTORICAL_EVIDENCE, "metrics": {}}
    metrics = snapshot.get("metrics") or {}
    return {
        "available": True,
        "captured_at": _value(snapshot.get("captured_at")),
        "metrics": {key: _value(metrics.get(key)) for key in (
            "cpu", "memory", "response_time", "latency", "requests", "error_rate",
        )},
        "anomaly_score": _value(snapshot.get("anomaly_score")),
        "anomaly_reason": _value(snapshot.get("anomaly_reason")),
        "rule_evidence": _value(snapshot.get("rule_evidence")),
        "isolation_forest_evidence": _value(snapshot.get("isolation_forest_anomaly")),
        "thresholds": snapshot.get("detection_thresholds") or {},
    }


def _impact(snapshot: dict[str, Any] | None) -> dict[str, Any]:
    failed_service = (snapshot or {}).get("dependency_service_id")
    if not failed_service:
        return {"available": False, "message": NOT_AVAILABLE}
    if failed_service not in SERVICE_IDS:
        return {"available": False, "message": "The persisted dependency service is not in the canonical topology."}
    result = analyze_dependency_impact(failed_service)
    zero_message = "No downstream dependents found in the canonical topology."
    return {
        "available": True,
        "basis": "Canonical topology; source service depends on target service.",
        "failed_service": result["failed_service"],
        "failed_service_label": result["failed_service_label"],
        "direct_dependents": result["directly_affected_services"],
        "transitive_dependents": result["transitively_affected_services"],
        "total_affected": result["impact_count"],
        "cascade_depth": result["cascade_depth"],
        "severity": result["severity"],
        "criticality": result["blast_radius"],
        "zero_downstream_explanation": zero_message if result["impact_count"] == 0 else None,
    }


def _recommendation(incident: Incident, snapshot: dict[str, Any] | None) -> dict[str, Any]:
    explanation = (snapshot or {}).get("recommendation_explanation")
    if not explanation:
        return {
            "recommended_action": incident.recommendation,
            "reasoning": NOT_AVAILABLE,
            "decision_engine_ranking_signal": NOT_AVAILABLE,
            "candidate_ranking": [],
        }
    return {
        "recommended_action": explanation.get("recommended_action") or incident.recommendation,
        "reasoning": _value(explanation.get("reason")),
        "decision_engine_ranking_signal": _value(explanation.get("action_score")),
        "candidate_ranking": explanation.get("candidates") or [],
        "selection_factors": explanation.get("selection_factors") or [],
    }


def _supporting_evidence(snapshot: dict[str, Any] | None) -> str:
    if not snapshot:
        return NOT_AVAILABLE
    evidence = list(snapshot.get("root_cause_details") or [])
    return " ".join(evidence) if evidence else NOT_AVAILABLE


def _automated_assessment(incident: Incident, snapshot: dict[str, Any] | None) -> str:
    cause = (snapshot or {}).get("root_cause") or incident.root_cause
    service = incident.service_name or "the affected service"
    return (
        f"The deterministic analysis recorded {cause} for {service}. "
        "This automated assessment summarizes persisted incident facts only; it is not an external AI/LLM assessment and does not indicate an infrastructure action was executed."
    )


def _observations(snapshot: dict[str, Any] | None, recommendation: dict[str, Any]) -> list[str]:
    if not snapshot:
        return ["Historical evidence was not captured; continue to monitor the signals recorded by future incidents."]
    metrics = snapshot.get("metrics") or {}
    observations = [
        f"Continue monitoring {key.replace('_', ' ')}: {value}."
        for key, value in metrics.items() if value is not None
    ]
    if snapshot.get("anomaly_reason"):
        observations.append(f"Recorded anomaly signal: {snapshot['anomaly_reason']}")
    if recommendation["recommended_action"]:
        observations.append(
            f"Recommendation consideration: {recommendation['recommended_action']} was recorded for operator review; no execution is recorded."
        )
    return observations[:5]


def build_incident_report(
    incident: Incident,
    timeline: list[dict[str, Any]],
    *,
    now: Callable[[], datetime] | None = None,
) -> dict[str, Any]:
    """Build a JSON-safe report solely from its persisted incident inputs."""
    snapshot = incident.evidence_snapshot or None
    created_at = _timestamp(incident.timestamp)
    resolved_at = _timestamp(incident.resolved_at)
    elapsed = _duration(incident.timestamp, incident.resolved_at)
    recommendation = _recommendation(incident, snapshot)
    feedback = None if incident.feedback_status is None else {
        "status": incident.feedback_status,
        "reason": incident.feedback_reason or NOT_AVAILABLE,
        "timestamp": _timestamp(incident.feedback_created_at),
        "associated_recommendation": incident.feedback_action or incident.recommendation,
        "notice": "Operator feedback records the operator's decision regarding the recommendation. It does not indicate that the infrastructure change was executed.",
    }
    generated_at = (now or (lambda: datetime.now(timezone.utc)))()
    return {
        "incident_id": incident.id,
        "generated_at": _timestamp(generated_at),
        "generation": {"provider": "deterministic", "fact_boundary": "Recorded Facts and AI Assessment are separated; no current telemetry is used."},
        "sections": {
            "executive_summary": {
                "recorded_facts": {"incident_id": incident.id, "title": incident.anomaly_type, "severity": incident.severity, "affected_service": incident.service_name or NOT_AVAILABLE, "detection_timestamp": created_at, "status": incident.status},
                "ai_assessment": _automated_assessment(incident, snapshot),
            },
            "overview": {"incident_id": incident.id, "severity": incident.severity, "status": incident.status, "created_at": created_at, "resolved_at": resolved_at, "elapsed_incident_duration": elapsed, "duration_definition": "Elapsed time between incident creation and incident resolution; not remediation duration.", "scenario_or_environment": _value((snapshot or {}).get("scenario"))},
            "historical_evidence": _historical_evidence(snapshot),
            "root_cause": {"recorded_facts": {"primary_root_cause": (snapshot or {}).get("root_cause") or incident.root_cause, "primary_issue": _value((snapshot or {}).get("primary_issue")), "confidence": _value((snapshot or {}).get("root_cause_confidence")), "supporting_evidence": _supporting_evidence(snapshot)}, "ai_assessment": _automated_assessment(incident, snapshot)},
            "impact": _impact(snapshot),
            "recommendation": recommendation,
            "simulation": {"available": False, "label": "Non-destructive simulation", "message": "No simulation result was persisted for this incident.", "notice": "Simulation is a projected what-if result and does not represent an executed infrastructure change."},
            "operator_feedback": feedback or {"recorded": False, "message": "Operator feedback was not recorded."},
            "timeline": timeline,
            "resolution": {"status": incident.status, "resolved_at": resolved_at, "elapsed_incident_duration": elapsed, "message": "The incident was transitioned to resolved state." if incident.status == "Resolved" else "The incident remains open."},
            "ai_observations": _observations(snapshot, recommendation),
        },
    }
