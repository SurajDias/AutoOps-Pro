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

    # ── Weighted score (inputs normalized to 0–1) ─────────────────────────────
    weighted_score = (
        (cpu           / 100)  * 0.30 +
        (memory        / 100)  * 0.25 +
        (response_time / 1000) * 0.20 +
        (error_rate    / 10)   * 0.25
    )

    # ── Per-metric threshold checks + weighted contribution ───────────────────
    reasons       = []
    details       = []
    contributions = {}

    if cpu > 60:
        label = "High CPU"
        reasons.append(label)
        details.append(f"CPU at {cpu}% (threshold: 60%)")
        contributions[label] = (cpu / 100) * 0.30

    if memory > 75:
        label = "High Memory"
        reasons.append(label)
        details.append(f"Memory at {memory}% (threshold: 75%)")
        contributions[label] = (memory / 100) * 0.25

    if response_time > 120:
        label = "Slow Response"
        reasons.append(label)
        details.append(f"Response time {response_time}ms (threshold: 120ms)")
        contributions[label] = (response_time / 1000) * 0.20

    if error_rate > 1:
        label = "High Errors"
        reasons.append(label)
        details.append(f"Error rate {error_rate}% (threshold: 1%)")
        contributions[label] = (error_rate / 10) * 0.25

    # ── Summary ───────────────────────────────────────────────────────────────
    summary = " + ".join(reasons) if reasons else "System Normal"

    # ── Severity from weighted score ──────────────────────────────────────────
    if weighted_score > 0.55:
        severity = "High"
    elif weighted_score > 0.30:
        severity = "Medium"
    elif weighted_score > 0:
        severity = "Low"
    else:
        severity = "Normal"

    # ── Primary issue: highest WEIGHTED contributor ───────────────────────────
    # Fixes the raw max() bug — error_rate=3% now correctly
    # beats response_time=150ms due to weight difference
    primary_issue = max(contributions, key=contributions.get) if contributions else "None"

    # ── Confidence: how strongly the score supports the diagnosis ─────────────
    confidence = min(100, int(weighted_score * 130))

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