"""Regression coverage for anomaly-score response semantics."""

from app.models.anomaly_detector import AnomalyDetector
from app.schemas.anomaly import AnomalyResult


CRITICAL_METRICS = {
    "cpu": 90,
    "memory": 91,
    "response_time": 400,
    "requests": 720,
    "error_rate": 6,
    "latency": 400,
}


def test_anomaly_result_uses_the_existing_score_without_a_confidence_alias():
    detector = AnomalyDetector()

    result = detector.detect(CRITICAL_METRICS)

    assert result["anomaly"] is True
    assert result["anomaly_score"] == 0.6
    assert "confidence" not in result

    response = AnomalyResult.model_validate({"service": "payment", **result})
    assert response.anomaly_score == 0.6
    assert "confidence" not in response.model_dump()
