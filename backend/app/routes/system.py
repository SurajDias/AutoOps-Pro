from fastapi import APIRouter
from app.utils.metrics_generator import SCENARIOS, get_recent_metrics, get_scenario, metrics, set_scenario
from app.models.anomaly_detector import detect_anomaly
from app.models.root_cause import analyze_root_cause
from app.models.simulator import WhatIfSimulator
from app.models.trend_analytics import trend_engine

router   = APIRouter()
history  = []
_sim     = WhatIfSimulator()   # used only for _select_best_action()


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
            "1-2 minutes": "2-4 minutes",
            "2-4 minutes": "5-8 minutes",
            "5-8 minutes": "10-15 minutes",
        }
        return mapping.get(time_to_failure, time_to_failure)

    return time_to_failure


def _timeline(current, status, root_result, anomaly_result, decision, trends):
    scenario = get_scenario()
    is_anomaly = anomaly_result.get("anomaly", False)
    prediction = "System stable"
    time_to_failure = "No failure expected"

    if scenario["name"] in ("traffic_spike", "database_stress", "memory_leak") or is_anomaly:
        if current.get("latency", 0) > 350 or current.get("memory", 0) > 90:
            time_to_failure = "2-4 minutes"
        elif current.get("cpu", 0) > 80 or current.get("latency", 0) > 220:
            time_to_failure = "5-8 minutes"
        else:
            time_to_failure = "10-15 minutes"
        time_to_failure = _adjust_time_to_failure(time_to_failure, trends)
        prediction = f"{root_result.get('primary_issue', 'Service degradation')} likely within {time_to_failure}"
    elif scenario["name"] == "fixed":
        prediction = "Recovery in progress after remediation"

    return {
        "prediction": prediction,
        "time_to_failure": time_to_failure,
        "explainability": [
            f"CPU {current.get('cpu', 0)}% and memory {current.get('memory', 0)}% are weighted against known failure thresholds.",
            f"Latency {current.get('latency', 0)}ms and error rate {current.get('error_rate', 0)}% drive anomaly score {anomaly_result.get('anomaly_score', 0)}.",
            f"Recent trend direction is {trends.get('risk_direction', 'Stable')}.",
            f"Decision engine chose {decision['action']} because {root_result.get('primary_issue', 'current symptoms')} is the strongest contributor.",
        ],
        "similar_incident": _similar_incident(root_result.get("primary_issue", "None")),
        "demo_step": status,
    }


def _similar_incident(primary_issue):
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


@router.get("/system-status")
def get_system_status():

    current = metrics

    # ── Detection input ───────────────────────────────────────────────────────
    detection_input = {
        "cpu":           current.get("cpu",         0),
        "memory":        current.get("memory",      0),
        "response_time": current.get("latency",     0),
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

    # ── Confidence from root cause (0–100) ────────────────────────────────────
    confidence = root_result.get("confidence", 0)
    trends = trend_engine.analyze(get_recent_metrics(limit=12))
    confidence = _adjust_confidence(confidence, trends)

    # ── Decision engine: recommend best action ────────────────────────────────
    decision = _sim._select_best_action(current, root_result, anomaly=is_anomaly)

    # ── Build state for smoothing ─────────────────────────────────────────────
    new_state = {
        "status":        "critical" if is_anomaly else "normal",
        "root_cause":    root_result.get("summary"),
        "primary_issue": root_result.get("primary_issue"),
        "severity":      root_result.get("status"),
        "confidence":    confidence,
    }

    # ── Majority-vote smoothing (last 3 states) ───────────────────────────────
    history.append(new_state)
    if len(history) > 3:
        history.pop(0)

    severity_counts = {}
    for item in history:
        sev = item["severity"]
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    final_severity = max(severity_counts, key=severity_counts.get)
    final_state    = next(
        (item for item in reversed(history) if item["severity"] == final_severity),
        new_state
    )

    scenario = get_scenario()
    response = {
        # ── Existing fields (unchanged) ───────────────────────────────────────
        "service":        scenario.get("service", "payment"),
        "scenario":       scenario,
        "status":         final_state["status"],
        "anomaly":        is_anomaly,
        "anomaly_score":  anomaly_score,
        "anomaly_reason": anomaly_reason,
        "root_cause":     final_state["root_cause"],
        "primary_issue":  final_state["primary_issue"],
        "severity":       final_state["severity"],
        "confidence":     final_state["confidence"],
        # ── NEW: decision engine output ───────────────────────────────────────
        "recommended_action": decision["action"],
        "risk":               decision["risk"],
        "reason":             decision["reason"],
        "trends":             trends,
    }
    response.update(_timeline(current, final_state["status"], root_result, anomaly_result, decision, trends))
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


@router.post("/demo/scenario/{name}")
def activate_demo_scenario(name: str):
    scenario = set_scenario(name)
    if scenario is None:
        return {"success": False, "message": f"Unknown scenario '{name}'"}

    if name == "fixed":
        history.clear()

    return {"success": True, "scenario": scenario}
