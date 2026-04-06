import random


class WhatIfSimulator:
    """
    Intent-aware AIOps What-If Simulator + Decision Engine.

    Two modes:
      1. simulate()           → user-driven what-if simulation
      2. _select_best_action() → autonomous recommendation from live metrics
    """

    # ─── Action Registry ─────────────────────────────────────────────────────
    ACTION_REGISTRY = {
        "scale_cpu": {
            "label":                  "Vertical CPU Scaling",
            "intent":                 "cpu",
            "base_cpu_reduction":     0.32,
            "base_latency_reduction": 0.18,
        },
        "scale_horizontal": {
            "label":                  "Horizontal Scaling (Add Instances)",
            "intent":                 "cpu",
            "base_cpu_reduction":     0.38,
            "base_latency_reduction": 0.28,
        },
        "reduce_latency": {
            "label":                  "Request Queue Optimization & Caching",
            "intent":                 "latency",
            "base_cpu_reduction":     0.06,
            "base_latency_reduction": 0.42,
        },
        "restart_service": {
            "label":                  "Graceful Service Restart",
            "intent":                 "errors",
            "base_cpu_reduction":     0.18,
            "base_latency_reduction": 0.32,
        },
        "optimize_memory": {
            "label":                  "Memory Leak Fix & GC Tuning",
            "intent":                 "memory",
            "base_cpu_reduction":     0.12,
            "base_latency_reduction": 0.14,
        },
        "throttle_requests": {
            "label":                  "Rate Limiting & Request Throttling",
            "intent":                 "traffic",
            "base_cpu_reduction":     0.26,
            "base_latency_reduction": 0.10,
        },
    }

    SEVERITY_MULTIPLIERS = {
        "critical": 1.20,
        "high":     1.10,
        "medium":   1.00,
        "low":      0.85,
        "normal":   0.75,
    }

    INTENT_KEYWORDS = {
        "cpu":     ["cpu", "processor", "compute", "core"],
        "memory":  ["memory", "ram", "leak", "heap", "gc"],
        "latency": ["latency", "slow", "response", "timeout", "delay"],
        "errors":  ["error", "crash", "fail", "exception", "restart"],
        "traffic": ["traffic", "request", "load", "spike", "throttle"],
    }

    ACTION_PHRASES = {
        "cpu": [
            "CPU pressure was the primary bottleneck.",
            "Processing load was pushing the system to its limits.",
            "Compute resources were saturated and needed relief.",
        ],
        "memory": [
            "Memory pressure was degrading overall system performance.",
            "Heap utilization was climbing — a classic sign of retention issues.",
            "GC pauses from memory buildup were impacting throughput.",
        ],
        "latency": [
            "Response times were the main user-facing symptom.",
            "Slow request handling was cascading into downstream delays.",
            "High latency was masking deeper queue congestion.",
        ],
        "errors": [
            "Error spikes pointed to an unstable service state.",
            "Repeated failures indicated the service needed a clean restart.",
            "Exception rates were high enough to justify a service recovery.",
        ],
        "traffic": [
            "Uncontrolled request volume was overwhelming available capacity.",
            "Traffic spikes were creating resource contention across the board.",
            "Inbound load exceeded what the current setup could safely absorb.",
        ],
    }

    STABILIZE_PHRASES = [
        "System is expected to stabilize within a few minutes.",
        "Metrics should return to normal operating range shortly.",
        "The service should recover and hold steady post-action.",
        "Projected recovery looks stable — no immediate follow-up needed.",
    ]

    MONITOR_PHRASES = [
        "Continued monitoring is recommended — system remains under stress.",
        "Keep an eye on metrics — residual pressure may persist.",
        "Further action may be needed if symptoms reappear.",
        "Situation is improving but not fully resolved — watch closely.",
    ]

    # ─────────────────────────────────────────────────────────────────────────

    def _get_severity_multiplier(self, severity: str) -> float:
        return self.SEVERITY_MULTIPLIERS.get(str(severity).lower(), 1.00)

    def _compute_failure_risk(self, cpu: float, latency: float, severity: str) -> str:
        score = 0
        if cpu > 85:        score += 3
        elif cpu > 70:      score += 2
        elif cpu > 50:      score += 1
        if latency > 500:   score += 3
        elif latency > 300: score += 2
        elif latency > 150: score += 1
        sev_scores = {"critical": 3, "high": 2, "medium": 1, "low": 0, "normal": 0}
        score += sev_scores.get(str(severity).lower(), 1)
        if score >= 7:   return "Critical"
        elif score >= 5: return "High"
        elif score >= 3: return "Medium"
        else:            return "Low"

    def _compute_confidence(self, action: str, severity: str, primary_issue: str) -> tuple:
        """Returns (label, pct) — e.g. ("High", 85)"""
        score       = 2
        intent      = self.ACTION_REGISTRY.get(action, {}).get("intent", "")
        keywords    = self.INTENT_KEYWORDS.get(intent, [])
        issue_lower = str(primary_issue).lower()

        if any(kw in issue_lower for kw in keywords):
            score += 1
        if severity in ("critical", "high"):
            score += 1
        elif severity in ("low", "normal"):
            score -= 1

        if score >= 4:   return "High",   88
        elif score >= 2: return "Medium", 55
        else:            return "Low",    22

    def _approximate_range(self, exact_pct: float) -> str:
        lower  = int(exact_pct / 5) * 5
        upper  = lower + 5
        prefix = random.choice(["around", "roughly", "approximately", "close to"])
        return f"{prefix} {lower}–{upper}%"

    def _filter_root_cause(self, root_cause: str, intent: str) -> str:
        if not root_cause or root_cause in ("N/A", None, ""):
            return "N/A"
        keywords = self.INTENT_KEYWORDS.get(intent, [])
        factors  = [f.strip() for f in root_cause.split("+")]
        relevant = [f for f in factors if any(kw in f.lower() for kw in keywords)]
        if relevant:
            return " + ".join(relevant)
        return " + ".join(factors[:2])

    def _generate_explanation(
        self,
        action: str, intent: str,
        cpu_before: float, cpu_after: float,
        latency_before: float, latency_after: float,
        severity: str, primary_issue: str,
        filtered_root_cause: str,
        failure_risk: str, confidence_label: str,
    ) -> str:
        label         = self.ACTION_REGISTRY.get(action, {}).get("label", action)
        cpu_delta     = cpu_before     - cpu_after
        latency_delta = latency_before - latency_after
        parts         = []

        parts.append(random.choice(self.ACTION_PHRASES.get(intent, self.ACTION_PHRASES["cpu"])))

        if filtered_root_cause and filtered_root_cause != "N/A":
            parts.append(f"Contributing factors: {filtered_root_cause}.")

        parts.append(f"Initiated '{label}'.")

        if cpu_delta > 2:
            approx = self._approximate_range(cpu_delta / cpu_before * 100)
            parts.append(f"CPU load is expected to ease by {approx}.")
        else:
            parts.append("CPU utilization is expected to remain largely stable.")

        if latency_delta > 5:
            approx = self._approximate_range(latency_delta / latency_before * 100)
            parts.append(f"Response times should improve by {approx}.")
        else:
            parts.append("Latency impact is expected to be minimal.")

        parts.append(f"Confidence in this action: {confidence_label}.")

        if severity in ("critical", "high") or failure_risk in ("High", "Critical"):
            parts.append(random.choice(self.MONITOR_PHRASES))
        else:
            parts.append(random.choice(self.STABILIZE_PHRASES))

        return " ".join(parts)

    # ─── Decision Engine (NEW) ────────────────────────────────────────────────

    def _select_best_action(self, metrics: dict, root_cause: dict) -> dict:
        """
        Autonomous decision engine.

        Scores every available action against live metrics and weighted
        root cause output. Picks the highest-scoring action and explains why.

        Scoring logic:
          Each metric breach adds weight to the action best suited to fix it.
          Primary issue from root cause adds a bonus to the matching action.
          Final confidence = how decisive the winning score is (0–100).

        Args:
            metrics:    live system metrics (keys: cpu, memory, latency, error_rate)
            root_cause: output from analyze_root_cause()

        Returns:
            { action, confidence (0–100), risk, reason }
        """
        # ── Read metrics (handles both key formats) ───────────────────────────
        cpu        = float(metrics.get("cpu",        metrics.get("cpu_usage",  50)))
        memory     = float(metrics.get("memory",                               60))
        latency    = float(metrics.get("latency",    metrics.get("response_time", 100)))
        error_rate = float(metrics.get("error_rate", 1))                           

        primary_issue = root_cause.get("primary_issue", "None")
        severity      = root_cause.get("severity",      root_cause.get("status", "medium"))
        rc_confidence = root_cause.get("confidence",    50)

        # ── Score each action ─────────────────────────────────────────────────
        scores = {
            "scale_cpu":        0.0,
            "optimize_memory":  0.0,
            "reduce_latency":   0.0,
            "restart_service":  0.0,
            "throttle_requests": 0.0,
        }

        # CPU pressure → scale
        if cpu > 80:   scores["scale_cpu"] += 0.40
        elif cpu > 60: scores["scale_cpu"] += 0.20

        # Memory pressure → optimize
        if memory > 85:   scores["optimize_memory"] += 0.35
        elif memory > 75: scores["optimize_memory"] += 0.20

        # Latency issues → reduce latency
        if latency > 300:   scores["reduce_latency"] += 0.35
        elif latency > 150: scores["reduce_latency"] += 0.15

        # Error rate → restart
        if error_rate > 5:  scores["restart_service"] += 0.40
        elif error_rate > 1: scores["restart_service"] += 0.15

        # High combined load → throttle
        if cpu > 70 and latency > 200:
            scores["throttle_requests"] += 0.20

        # Primary issue bonus — aligns decision with root cause diagnosis
        issue_lower = str(primary_issue).lower()
        if "cpu"    in issue_lower: scores["scale_cpu"]        += 0.25
        if "memory" in issue_lower: scores["optimize_memory"]  += 0.25
        if any(k in issue_lower for k in ("latency", "slow", "response")):
            scores["reduce_latency"]   += 0.25
        if "error"  in issue_lower: scores["restart_service"]  += 0.25

        # ── Pick winner ───────────────────────────────────────────────────────
        best_action = max(scores, key=scores.get)
        best_score  = scores[best_action]
        label       = self.ACTION_REGISTRY.get(best_action, {}).get("label", best_action)

        # ── Confidence: decisiveness of the winning score ─────────────────────
        # Blend action score with root cause confidence for richer signal
        action_confidence = min(100, int(best_score * 160))
        confidence        = int((action_confidence * 0.6) + (rc_confidence * 0.4))
        confidence        = min(100, confidence)

        # ── Risk from severity ────────────────────────────────────────────────
        risk_map = {
            "critical": "Critical", "high": "High",
            "medium":   "Medium",   "low":  "Low", "normal": "Low"
        }
        risk = risk_map.get(str(severity).lower(), "Medium")

        # ── Human-readable reason ─────────────────────────────────────────────
        reason = (
            f"Primary issue identified: {primary_issue}. "
            f"'{label}' scored highest ({round(best_score, 2)}) "
            f"based on current metrics — "
            f"CPU {cpu}%, Memory {memory}%, "
            f"Latency {latency}ms, Errors {error_rate}%."
        )

        return {
            "action":     best_action,
            "confidence": confidence,
            "risk":       risk,
            "reason":     reason,
        }

    # ─── Main simulate() — unchanged logic, unchanged return keys ────────────

    def simulate(self, metrics: dict, action: str, context: dict = None) -> dict:
        if context is None:
            context = {}

        cpu     = float(metrics.get("cpu_usage", 50))
        latency = float(metrics.get("latency",   100))

        severity      = context.get("severity",      "medium") or "medium"
        primary_issue = context.get("primary_issue", "N/A")    or "N/A"
        root_cause    = context.get("root_cause",    "N/A")    or "N/A"

        action_cfg = self.ACTION_REGISTRY.get(action)
        if not action_cfg:
            action     = "scale_cpu"
            action_cfg = self.ACTION_REGISTRY["scale_cpu"]

        intent = action_cfg["intent"]

        mult              = self._get_severity_multiplier(severity)
        cpu_reduction     = (action_cfg["base_cpu_reduction"]     * mult) + random.uniform(-0.03, 0.03)
        latency_reduction = (action_cfg["base_latency_reduction"] * mult) + random.uniform(-0.03, 0.03)
        cpu_reduction     = max(0.0, min(cpu_reduction,     0.85))
        latency_reduction = max(0.0, min(latency_reduction, 0.85))

        updated_cpu     = max(round(cpu     * (1 - cpu_reduction),     1), 5.0)
        updated_latency = max(round(latency * (1 - latency_reduction), 1), 10.0)

        failure_risk                     = self._compute_failure_risk(updated_cpu, updated_latency, severity)
        confidence_label, confidence_pct = self._compute_confidence(action, severity, primary_issue)
        filtered_root_cause              = self._filter_root_cause(root_cause, intent)

        explanation = self._generate_explanation(
            action, intent,
            cpu, updated_cpu,
            latency, updated_latency,
            severity, primary_issue,
            filtered_root_cause,
            failure_risk, confidence_label,
        )

        return {
            "action":          action,
            "updated_metrics": {
                "cpu_usage": updated_cpu,
                "latency":   updated_latency,
            },
            "failure_risk":    failure_risk,
            "confidence":      confidence_label,
            "confidence_pct":  confidence_pct,
            "severity":        severity,
            "root_cause":      root_cause,
            "explanation":     explanation,
        }