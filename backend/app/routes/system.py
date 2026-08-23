from fastapi import APIRouter
from app.utils.metrics_generator import (
    SCENARIOS,
    get_metrics_mode,
    get_recent_metrics,
    get_scenario,
    metrics,
    set_metrics_mode,
    set_scenario,
)
from app.models.anomaly_detector import detect_anomaly
from app.models.root_cause import analyze_root_cause
from app.models.failure_prediction import failure_predictor
from app.models.simulator import WhatIfSimulator
from app.models.trend_analytics import trend_engine
from app.database.postgres import create_incident_record, find_similar_incident

router   = APIRouter()
history  = []
_sim     = WhatIfSimulator()   # used only for _select_best_action()
_last_recorded_incident = None


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


def _similar_incident(primary_issue):
    database_match = find_similar_incident(primary_issue)
    if database_match is not None:
        return database_match

    issue = str(primary_issue).lower()
    if "memory" in issue:
        return "INC-1042: Auth service memory leak recovered by GC tuning and rolling restart."
    if "response" in issue or "latency" in issue:
        return "INC-0977: Database pool saturation caused payment latency during launch traffic."
    if "error" in issue:
        return "INC-0888: Gateway error burst resolved by restart and rate-limit update."
    if "cpu" in issue:
        return "INC-0921: CPU saturation prevented by horizontal scaling."
    return "No close historical incident found."


def _record_incident_if_needed(scenario, root_result, anomaly_reason, decision):
    """Create one record per active high-severity detection."""
    global _last_recorded_incident

    severity = str(root_result.get("status", "")).lower()
    if severity not in ("high", "critical"):
        _last_recorded_incident = None
        return

    root_cause = root_result.get("summary") or root_result.get("primary_issue") or "Unknown"
    incident_signature = (
        scenario.get("service", "payment"),
        severity,
        root_cause,
        anomaly_reason,
    )
    if incident_signature == _last_recorded_incident:
        return

    created = create_incident_record({
        "service_name": scenario.get("service", "payment"),
        "severity": severity.title(),
        "anomaly_type": anomaly_reason or "AI anomaly detected",
        "root_cause": root_cause,
        "recommendation": decision.get("action", "Investigate incident"),
        "status": "Open",
    })
    if created:
        _last_recorded_incident = incident_signature


@router.get("/system-status")
def get_system_status():

    current = metrics

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

    confidence = _adjust_confidence(root_result.get("confidence", 0), trends)

    # ── Decision engine: recommend best action ────────────────────────────────
    decision = _sim._select_best_action(current, root_result, anomaly=is_anomaly)

    severity = str(root_result.get("severity", "Normal")).lower()
    status = "critical" if severity == "critical" else "warning" if severity == "warning" else "normal"

    scenario = get_scenario()
    response = {
        # ── Existing fields (unchanged) ───────────────────────────────────────
        "service":        scenario.get("service", "payment"),
        "scenario":       scenario,
        "status":         status,
        "anomaly":        is_anomaly,
        "anomaly_score":  anomaly_score,
        "anomaly_reason": anomaly_reason,
        "root_cause":     root_result.get("summary"),
        "primary_issue":  root_result.get("primary_issue"),
        "severity":       root_result.get("severity"),
        "confidence":     confidence,
        # ── NEW: decision engine output ───────────────────────────────────────
        "recommended_action": decision["action"],
        "risk":               decision["risk"],
        "reason":             decision["reason"],
        "trends":             trends,
    }
    response.update(_timeline(current, status, root_result, anomaly_result, decision, trends))
    _record_incident_if_needed(scenario, root_result, anomaly_reason, decision)
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
    global _last_recorded_incident

    # Existing dashboard controls should always resume the demo source.
    set_metrics_mode("demo")
    scenario = set_scenario(name)
    if scenario is None:
        return {"success": False, "message": f"Unknown scenario '{name}'"}

    if name == "fixed":
        history.clear()
        _last_recorded_incident = None

    return {"success": True, "scenario": scenario}
