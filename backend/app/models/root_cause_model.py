def analyze_root_cause(metrics):
    reasons = []
    score = 0
    explanation = []
    primary_cause = "None"

    cpu = metrics.get("cpu", 0)
    memory = metrics.get("memory", 0)
    response_time = metrics.get("response_time", 0)
    error_rate = metrics.get("error_rate", 0)

    # 🔥 UPDATED THRESHOLDS (REALISTIC)
    if cpu > 60:
        reasons.append("High CPU")
        explanation.append(f"CPU usage is {cpu}% (>60%)")
        score += 30

    if memory > 75:
        reasons.append("High Memory")
        explanation.append(f"Memory usage is {memory}% (>75%)")
        score += 30

    if response_time > 120:
        reasons.append("Slow Response")
        explanation.append(f"Latency is {response_time}ms (>120ms)")
        score += 20

    if error_rate > 1:
        reasons.append("High Errors")
        explanation.append(f"Error rate is {error_rate}% (>1%)")
        score += 20

    # ROOT CAUSE SUMMARY
    if reasons:
        root_cause = " + ".join(reasons)
    else:
        root_cause = "System Normal"

    # SEVERITY
    if score >= 70:
        severity = "High"
    elif score >= 40:
        severity = "Medium"
    elif score > 0:
        severity = "Low"
    else:
        severity = "Normal"

    # PRIMARY ISSUE
    max_value = max(cpu, memory, response_time, error_rate)

    if max_value == cpu and cpu > 60:
        primary_cause = "High CPU"
    elif max_value == memory and memory > 75:
        primary_cause = "High Memory"
    elif max_value == response_time and response_time > 120:
        primary_cause = "Slow Response"
    elif max_value == error_rate and error_rate > 1:
        primary_cause = "High Errors"

    return {
        "status": severity,
        "summary": root_cause,
        "primary_issue": primary_cause,
        "metrics_analysis": {
            "score": score,
            "details": explanation
        }
    }


# ✅ TEST BLOCK (IMPORTANT — ensures output is shown)
if __name__ == "__main__":
    sample_input = {
        "cpu": 95,
        "memory": 88,
        "response_time": 2500,
        "error_rate": 8
    }

    result = analyze_root_cause(sample_input)

    print("\n===== ROOT CAUSE ANALYSIS OUTPUT =====\n")
    print("Status          :", result["status"])
    print("Summary         :", result["summary"])
    print("Primary Issue   :", result["primary_issue"])
    print("Score           :", result["metrics_analysis"]["score"])
    print("\nDetailed Analysis:")
    
    for item in result["metrics_analysis"]["details"]:
        print("-", item)

    print("\n=====================================\n")