class FailurePredictor:
    """
    Simple rule-based failure prediction
    """

    def predict(self, data):
        cpu = data.get("cpu", 0)
        memory = data.get("memory", 0)
        response_time = data.get("response_time", 0)
        error_rate = data.get("error_rate", 0)

        latency = max(data.get("latency", 0), response_time)

        if cpu >= 85 or memory >= 90 or latency >= 350 or error_rate >= 5:
            return {
                "will_fail": True,
                "confidence": 0.9,
                "reason": "Critical resource usage"
            }

        if cpu > 60 or memory > 75 or latency > 120 or error_rate > 1:
            return {
                "will_fail": False,
                "confidence": 0.65,
                "reason": "Service degradation requires attention"
            }

        return {
            "will_fail": False,
            "confidence": 0.9,
            "reason": "System stable"
        }


# Global instance
failure_predictor = FailurePredictor()
