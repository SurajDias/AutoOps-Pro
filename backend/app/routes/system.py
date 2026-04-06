from fastapi import APIRouter
from app.utils.metrics_generator import metrics
from app.models.anomaly_detector import detect_anomaly
from app.models.root_cause import analyze_root_cause
from app.models.simulator import WhatIfSimulator

router   = APIRouter()
history  = []
_sim     = WhatIfSimulator()   # used only for _select_best_action()


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

    # ── Decision engine: recommend best action ────────────────────────────────
    decision = _sim._select_best_action(current, root_result)

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

    return {
        # ── Existing fields (unchanged) ───────────────────────────────────────
        "service":        "payment",
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
    }