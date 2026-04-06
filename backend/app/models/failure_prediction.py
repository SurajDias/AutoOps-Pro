class FailurePredictor:
    """
    Simple rule-based failure prediction
    """

    def predict(self, data):
        cpu = data.get("cpu", 0)
        memory = data.get("memory", 0)
        response_time = data.get("response_time", 0)
        error_rate = data.get("error_rate", 0)

        # Simple logic
        if cpu > 90 or memory > 90:
            return {
                "will_fail": True,
                "confidence": 0.9,
                "reason": "Critical resource usage"
            }

        if response_time > 1500 or error_rate > 5:
            return {
                "will_fail": True,
                "confidence": 0.8,
                "reason": "Service degradation detected"
            }

        return {
            "will_fail": False,
            "confidence": 0.7,
            "reason": "System stable"
        }


# Global instance
failure_predictor = FailurePredictor()