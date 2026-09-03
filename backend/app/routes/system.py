import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from app.utils.metrics_generator import (
    SCENARIOS,
    get_metrics_mode,
    get_recent_metrics,
    get_scenario,
    metrics,
    set_metrics_mode,
    set_scenario,
    stabilize_live_signal,
)
from app.models.anomaly_detector import detect_anomaly
from app.models.root_cause import analyze_root_cause
from app.models.failure_prediction import failure_predictor
from app.models.simulator import WhatIfSimulator
from app.models.trend_analytics import trend_engine
from app.database.postgres import create_incident_record, find_similar_incident
from app.services.health_service import update_service_health

router   = APIRouter()
history  = []
_sim     = WhatIfSimulator()   # used only for _select_best_action()
logger = logging.getLogger(__name__)


def _adjust_confidence(confidence, trends):
    risk_direction = trends.get("risk_direction", "Stable")
    if risk_direction == "Worsening":
        return min(100, confidence + 10)
    if risk_direction == "Improving":
        return max(0, confidence - 5)
    return confidence


def _adjust_time_to_failure(time_to_failure, trends):
    risk_direction = trends.get("risk_direction", "Stable")

    if time_to_failure == "No failure expected":
        return "No failure expected"

    if risk_direction == "Worsening":
        mapping = {
            "10-15 minutes": "5-8 minutes",
            "5-8 minutes": "2-4 minutes",
            "2-4 minutes": "1-2 minutes",
        }
        return mapping.get(time_to_failure, time_to_failure)

    if risk_direction == "Improving":
        mapping = {
            "10-15 minutes": "15-20 minutes",
            "1-2 minutes": "2-4 minutes",
            "2-4 minutes": "5-8 minutes",
            "5-8 minutes": "10-15 minutes",
        }
        return mapping.get(time_to_failure, time_to_failure)

    return time_to_failure


def _timeline(current, status, root_result, anomaly_result, decision, trends):
    failure = failure_predictor.predict(current)
    severity = str(root_result.get("severity", root_result.get("status", "Normal"))).lower()
    primary_issue = root_result.get("primary_issue", "Service degradation")
    effective_latency = max(current.get("latency", 0), current.get("response_time", 0))
    prediction = "System stable"
    time_to_failure = "No failure expected"

    if severity == "critical" or failure["will_fail"]:
        if effective_latency > 350 or current.get("memory", 0) > 90:
            time_to_failure = "2-4 minutes"
        elif current.get("cpu", 0) > 80 or effective_latency > 220:
            time_to_failure = "5-8 minutes"
        else:
            time_to_failure = "10-15 minutes"
        time_to_failure = _adjust_time_to_failure(time_to_failure, trends)
        prediction = f"{primary_issue} likely to cause service failure within {time_to_failure}"
    elif severity == "warning":
        time_to_failure = _adjust_time_to_failure("10-15 minutes", trends)
        prediction = f"{primary_issue} requires attention; degradation may occur within {time_to_failure}"

    return {
        "prediction": prediction,
        "time_to_failure": time_to_failure,
        "explainability": [
            f"CPU {current.get('cpu', 0)}% and memory {current.get('memory', 0)}% are weighted against known failure thresholds.",
            f"Latency {current.get('latency', 0)}ms and error rate {current.get('error_rate', 0)}% drive anomaly score {anomaly_result.get('anomaly_score', 0)}.",
            f"Recent trend direction is {trends.get('risk_direction', 'Stable')}.",
            f"Recommendation '{decision['action']}' directly addresses {primary_issue}: {decision['reason']}",
        ],
        "similar_incident": _similar_incident(root_result.get("primary_issue", "None")),
        "demo_step": status,
    }


def _recommendation_explanation(current, root_result, decision):
    """Describe the decision engine's existing inputs and ranking output."""
    primary_issue = root_result.get("primary_issue", "None")
    metric_values = {
        "cpu": float(current.get("cpu", current.get("cpu_usage", 50))),
        "memory": float(current.get("memory", 60)),
        "latency": float(current.get("latency", current.get("response_time", 100))),
        "error_rate": float(current.get("error_rate", 1)),
    }

    def evidence_for(action):
        evidence = []
        if action == "scale_cpu" and metric_values["cpu"] > 60:
            evidence.append(f"CPU is {metric_values['cpu']}%, above the decision engine's 60% operating threshold.")
        if action == "optimize_memory" and metric_values["memory"] > 75:
            evidence.append(f"Memory is {metric_values['memory']}%, above the decision engine's 75% operating threshold.")
        if action == "reduce_latency" and metric_values["latency"] > 150:
            evidence.append(f"Latency is {metric_values['latency']}ms, above the decision engine's 150ms operating threshold.")
        if action == "restart_service" and metric_values["error_rate"] > 1:
            evidence.append(f"Error rate is {metric_values['error_rate']}%, above the decision engine's 1% operating threshold.")
        if action == "throttle_requests" and metric_values["cpu"] > 70 and metric_values["latency"] > 200:
            evidence.append(
                f"CPU is {metric_values['cpu']}% and latency is {metric_values['latency']}ms, meeting the combined-load condition."
            )

        issue = str(primary_issue).lower()
        issue_matches = {
            "scale_cpu": ("cpu",),
            "optimize_memory": ("memory",),
            "reduce_latency": ("latency", "slow", "response"),
            "restart_service": ("error",),
        }
        if any(term in issue for term in issue_matches.get(action, ())):
            evidence.append(f"Primary issue recorded by root-cause analysis: {primary_issue}.")
        return evidence

    candidates = []
    for rank, candidate in enumerate(decision.get("candidates", []), start=1):
        candidates.append({
            **candidate,
            "rank": rank,
            "evidence": evidence_for(candidate["action"]),
        })

    selection_factors = [
        f"Primary issue recorded by root-cause analysis: {primary_issue}.",
        f"CPU {metric_values['cpu']}%, memory {metric_values['memory']}%, latency {metric_values['latency']}ms, and error rate {metric_values['error_rate']}% were evaluated by the decision engine.",
    ]
    return {
        "recommended_action": decision["action"],
        "reason": decision["reason"],
        "action_score": decision.get("action_score"),
        "candidates": candidates,
        "selection_factors": selection_factors,
    }


def _similar_incident(primary_issue):
    database_match = find_similar_incident(primary_issue)
    if database_match is not None:
        return database_match
    return "Historical incident lookup unavailable."


def _incident_dependency_service_id() -> str | None:
    """Capture a canonical failed node only when scenario health identifies one."""
    failed_services = [
        service_id for service_id, health in update_service_health().items()
        if health == "failed"
    ]
    return failed_services[0] if len(failed_services) == 1 else None


def _record_incident_if_needed(
    scenario, current, root_result, anomaly_result, decision, trends, timeline, confidence,
):
    """Create one record per active high-severity detection."""
    severity = str(root_result.get("status", "")).lower()
    if severity not in ("high", "critical"):
        return

    root_cause = root_result.get("summary") or root_result.get("primary_issue") or "Unknown"
    dependency_service_id = _incident_dependency_service_id()
    captured_at_datetime = datetime.now(timezone.utc)
    captured_at = captured_at_datetime.isoformat()
    created = create_incident_record({
        "service_name": scenario.get("service", "payment"),
        "severity": severity.title(),
        "anomaly_type": anomaly_result.get("reason") or "AI anomaly detected",
        "root_cause": root_cause,
        "recommendation": decision.get("action", "Investigate incident"),
        "status": "Open",
        "timestamp": captured_at_datetime.replace(tzinfo=None),
        "evidence_snapshot": {
            "captured_at": captured_at,
            "metrics": {
                key: current_value
                for key, current_value in {
                    "cpu": current.get("cpu"),
                    "memory": current.get("memory"),
                    "response_time": current.get("response_time"),
                    "latency": current.get("latency"),
                    "requests": current.get("requests"),
                    "error_rate": current.get("error_rate"),
                }.items()
                if current_value is not None
            },
            "anomaly_score": anomaly_result.get("anomaly_score"),
            "anomaly_reason": anomaly_result.get("reason"),
            "rule_evidence": bool(anomaly_result.get("rule_evidence", False)),
            "isolation_forest_anomaly": bool(anomaly_result.get("ml_anomaly", False)),
            "root_cause": root_result.get("summary"),
            "primary_issue": root_result.get("primary_issue"),
            "root_cause_confidence": confidence,
            "severity": root_result.get("severity"),
            "risk": decision.get("risk"),
            "recommended_action": decision.get("action"),
            "recommendation_explanation": _recommendation_explanation(current, root_result, decision),
            "trend": trends.get("risk_direction"),
            "estimated_failure_window": timeline.get("time_to_failure"),
            "dependency_service_id": dependency_service_id,
        },
    })
    if not created:
        logger.error("Unable to persist automatic incident for active high-severity condition")
        raise HTTPException(
            status_code=503,
            detail="Current analysis is available, but incident persistence is unavailable. Check the incident database.",
        )


@router.get("/system-status")
def get_system_status():

    # Keep one request-local telemetry snapshot for analysis and incident
    # persistence; the collector may update the shared dictionary concurrently.
    current = dict(metrics)

    # ── Detection input ───────────────────────────────────────────────────────
    detection_input = {
        "cpu":           current.get("cpu",         0),
        "memory":        current.get("memory",      0),
        "response_time": current.get("response_time", 0),
        "requests":      current.get("requests",    0),
        "error_rate":    current.get("error_rate",  0),
        "latency":       current.get("latency",     0),
    }

    # ── Run models ────────────────────────────────────────────────────────────
    anomaly_result = detect_anomaly(detection_input)
    root_result    = analyze_root_cause(detection_input)

    # ── Anomaly fields (unified key: "anomaly") ───────────────────────────────
    is_anomaly     = anomaly_result.get("anomaly", False)
    anomaly_score  = round(anomaly_result.get("anomaly_score", 0.0), 4)
    anomaly_reason = anomaly_result.get("reason", "N/A")

    # The synthetic-service Isolation Forest is still evaluated and its hybrid
    # score remains unchanged. In live mode, only sustained rule evidence may
    # transition presentation state: host-specific ML outliers alone are not a
    # reliable operational incident signal.
    if get_metrics_mode() == "live":
        rule_evidence = anomaly_result.get("rule_score", 0) >= 0.5
        if not stabilize_live_signal(rule_evidence):
            is_anomaly = False
            anomaly_reason = "Live telemetry is awaiting sustained rule-threshold evidence."
            root_result = analyze_root_cause({})

    trends = trend_engine.analyze(get_recent_metrics(limit=12))

    # An ML-only anomaly still receives an explicit, non-normal diagnosis.
    if is_anomaly and root_result.get("severity") == "Normal":
        root_result.update({
            "status": "Warning",
            "severity": "Warning",
            "summary": "Anomalous Pattern",
            "primary_issue": "Anomalous Pattern",
            "confidence": 60,
        })

    scenario = get_scenario()
    # ``fixed`` is a deterministic recovery scenario. Once its actual rule
    # metrics have returned to Normal, an Isolation Forest-only outlier must
    # not keep the presentation in Warning. Genuine threshold evidence is
    # preserved because this only applies to the synthetic ML-only diagnosis.
    if (
        scenario.get("name") in ("normal", "fixed")
        and root_result.get("primary_issue") == "Anomalous Pattern"
    ):
        is_anomaly = False
        anomaly_reason = "Synthetic baseline metrics are within normal rule thresholds."
        root_result = analyze_root_cause(detection_input)

    confidence = _adjust_confidence(root_result.get("confidence", 0), trends)

    # ── Decision engine: recommend best action ────────────────────────────────
    decision = _sim._select_best_action(current, root_result, anomaly=is_anomaly)
    recommendation_explanation = _recommendation_explanation(current, root_result, decision)

    severity = str(root_result.get("severity", "Normal")).lower()
    status = "critical" if severity == "critical" else "warning" if severity == "warning" else "normal"

    response = {
        # ── Existing fields (unchanged) ───────────────────────────────────────
        "service":        scenario.get("service", "payment"),
        "scenario":       scenario,
        "status":         status,
        "anomaly":        is_anomaly,
        "anomaly_score":  anomaly_score,
        "anomaly_reason": anomaly_reason,
        "detection_evidence": {
            "rule_evidence": bool(anomaly_result.get("rule_evidence", False)),
            "isolation_forest_anomaly": bool(anomaly_result.get("ml_anomaly", False)),
            "thresholds": anomaly_result.get("thresholds", {}),
            "persistence": (
                "Live rule-threshold evidence must persist for three consecutive samples."
                if get_metrics_mode() == "live"
                else "Demo scenario state is evaluated directly from the active synthetic metrics."
            ),
        },
        "root_cause":     root_result.get("summary"),
        "primary_issue":  root_result.get("primary_issue"),
        "severity":       root_result.get("severity"),
        "confidence":     confidence,
        "root_cause_details": root_result.get("details", []),
        # ── NEW: decision engine output ───────────────────────────────────────
        "recommended_action": decision["action"],
        "risk":               decision["risk"],
        "reason":             decision["reason"],
        "recommendation_explanation": recommendation_explanation,
        "trends":             trends,
    }
    response.update(_timeline(current, status, root_result, anomaly_result, decision, trends))
    _record_incident_if_needed(
        scenario, current, root_result, anomaly_result, decision, trends, response, confidence,
    )
    return response


@router.get("/demo/scenarios")
def demo_scenarios():
    return {
        name: {
            "label": scenario["label"],
            "description": scenario["description"],
            "service": scenario["service"],
        }
        for name, scenario in SCENARIOS.items()
    }


@router.get("/metrics/mode")
def metrics_mode():
    """Return the active source without altering the existing metrics payload."""
    return {"mode": get_metrics_mode()}


@router.post("/metrics/mode/{mode}")
def change_metrics_mode(mode: str):
    active_mode = set_metrics_mode(mode)
    if active_mode is None:
        return {"success": False, "message": f"Unknown metrics mode '{mode}'"}

    return {"success": active_mode == mode, "mode": active_mode}


@router.post("/demo/scenario/{name}")
def activate_demo_scenario(name: str):
    # Existing dashboard controls should always resume the demo source.
    set_metrics_mode("demo")
    scenario = set_scenario(name)
    if scenario is None:
        return {"success": False, "message": f"Unknown scenario '{name}'"}

    if name == "fixed":
        history.clear()

    return {"success": True, "scenario": scenario}
