def analyze_root_cause(metrics):
    """
    Weighted AIOps Root Cause Analyzer.

    Weights (reflect operational impact):
        CPU           → 0.30
        Error Rate    → 0.25
        Memory        → 0.25
        Response Time → 0.20
    """

    cpu           = float(metrics.get("cpu",           0))
    memory        = float(metrics.get("memory",        0))
    response_time = float(metrics.get("response_time", 0))
    error_rate    = float(metrics.get("error_rate",    0))

    # ── Per-metric threshold checks + weighted contribution ───────────────────
    reasons       = []
    details       = []
    contributions = {}
    critical_breach = False

    if cpu > 60:
        label = "High CPU"
        reasons.append(label)
        details.append(f"CPU at {cpu}% (threshold: 60%)")
        contributions[label] = min(1.0, (cpu - 60) / 25) * 0.30
        critical_breach = critical_breach or cpu >= 85

    if memory > 75:
        label = "High Memory"
        reasons.append(label)
        details.append(f"Memory at {memory}% (threshold: 75%)")
        contributions[label] = min(1.0, (memory - 75) / 15) * 0.25
        critical_breach = critical_breach or memory >= 90

    if response_time > 120:
        label = "Slow Response"
        reasons.append(label)
        details.append(f"Response time {response_time}ms (threshold: 120ms)")
        contributions[label] = min(1.0, (response_time - 120) / 230) * 0.20
        critical_breach = critical_breach or response_time >= 350

    if error_rate > 1:
        label = "High Errors"
        reasons.append(label)
        details.append(f"Error rate {error_rate}% (threshold: 1%)")
        contributions[label] = min(1.0, (error_rate - 1) / 4) * 0.25
        critical_breach = critical_breach or error_rate >= 5

    # ── Summary ───────────────────────────────────────────────────────────────
    summary = " + ".join(reasons) if reasons else "System Normal"

    # Severity is based only on breached thresholds so healthy baseline values
    # cannot be labelled as an incident.
    weighted_score = sum(contributions.values())
    if critical_breach:
        severity = "Critical"
    elif reasons:
        severity = "Warning"
    else:
        severity = "Normal"

    # ── Primary issue: highest WEIGHTED contributor ───────────────────────────
    # Fixes the raw max() bug — error_rate=3% now correctly
    # beats response_time=150ms due to weight difference
    primary_issue = max(contributions, key=contributions.get) if contributions else "None"

    # ── Confidence: how strongly the score supports the diagnosis ─────────────
    if severity == "Critical":
        confidence = min(98, 80 + int(weighted_score * 20))
    elif severity == "Warning":
        confidence = min(85, 55 + int(weighted_score * 60))
    else:
        confidence = 90

    return {
        "status":        severity,
        "summary":       summary,
        "primary_issue": primary_issue,
        "severity":      severity,
        "confidence":    confidence,          # ← 0–100 int, consistent key name
        "details":       details,
        "metrics_analysis": {
            "weighted_score": round(weighted_score, 4),
            "details":        details,
        }
    }
