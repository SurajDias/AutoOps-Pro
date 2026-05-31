class TrendAnalyticsEngine:
    """
    Lightweight trend analyzer for recent infrastructure metrics.

    Uses recent in-memory samples from the existing metrics pipeline and compares
    the average of the older half with the average of the newer half.
    """

    METRICS = ("cpu", "memory", "latency")
    STABLE_THRESHOLDS = {
        "cpu": 3.0,
        "memory": 3.0,
        "latency": 20.0,
    }

    def analyze(self, history):
        if not history:
            return self._empty_result(0)

        return {
            "sample_size": len(history),
            "metrics": {
                metric: self._analyze_metric(history, metric)
                for metric in self.METRICS
            },
            "risk_direction": self._risk_direction(history),
        }

    def _analyze_metric(self, history, metric):
        values = [
            float(item.get(metric, 0))
            for item in history
            if item.get(metric) is not None
        ]

        if len(values) < 4:
            current = values[-1] if values else 0
            return {
                "trend": "Stable",
                "change": 0,
                "current": round(current, 2),
            }

        midpoint = len(values) // 2
        older_avg = sum(values[:midpoint]) / midpoint
        newer_avg = sum(values[midpoint:]) / (len(values) - midpoint)
        change = newer_avg - older_avg
        threshold = self.STABLE_THRESHOLDS.get(metric, 3.0)

        if change > threshold:
            trend = "Increasing"
        elif change < -threshold:
            trend = "Decreasing"
        else:
            trend = "Stable"

        return {
            "trend": trend,
            "change": round(change, 2),
            "current": round(values[-1], 2),
        }

    def _risk_direction(self, history):
        metric_results = {
            metric: self._analyze_metric(history, metric)
            for metric in self.METRICS
        }
        increasing_count = sum(
            1 for item in metric_results.values()
            if item["trend"] == "Increasing"
        )
        decreasing_count = sum(
            1 for item in metric_results.values()
            if item["trend"] == "Decreasing"
        )

        if increasing_count >= 2:
            return "Worsening"
        if decreasing_count >= 2:
            return "Improving"
        return "Stable"

    def _empty_result(self, sample_size):
        return {
            "sample_size": sample_size,
            "metrics": {
                metric: {"trend": "Stable", "change": 0, "current": 0}
                for metric in self.METRICS
            },
            "risk_direction": "Stable",
        }


trend_engine = TrendAnalyticsEngine()
