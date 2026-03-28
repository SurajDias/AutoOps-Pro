# backend/app/schemas/anomaly.py

"""
Pydantic schemas for anomaly detection API.
These define the expected input/output formats.
"""

from pydantic import BaseModel, Field
from typing import Optional


class MetricInput(BaseModel):
    """
    Input schema for anomaly detection.
    Represents system metrics at a point in time.
    """
    service: str = Field(..., description="Service name (e.g., 'payment', 'gateway')")
    cpu: float = Field(..., ge=0, le=100, description="CPU usage percentage")
    memory: float = Field(..., ge=0, le=100, description="Memory usage percentage")
    response_time: float = Field(..., ge=0, description="Response time in milliseconds")
    requests: int = Field(..., ge=0, description="Number of requests")
    error_rate: float = Field(..., ge=0, le=100, description="Error rate percentage")
    latency: float = Field(..., ge=0, description="Latency in milliseconds")
    
    class Config:
        schema_extra = {
            "example": {
                "service": "payment",
                "cpu": 85.5,
                "memory": 72.3,
                "response_time": 1250,
                "requests": 450,
                "error_rate": 3.2,
                "latency": 180
            }
        }


class AnomalyResult(BaseModel):
    """
    Output schema for anomaly detection result.
    """
    service: str
    is_anomaly: bool
    anomaly_score: float = Field(..., description="Score from -1 (anomalous) to 1 (normal)")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in prediction (0-1)")
    reason: str = Field(..., description="Human-readable explanation")
    
    class Config:
        schema_extra = {
            "example": {
                "service": "payment",
                "is_anomaly": True,
                "anomaly_score": -0.45,
                "confidence": 0.82,
                "reason": "High CPU (85.5%) + Slow response time (1250ms)"
            }
        }


class TrainingRequest(BaseModel):
    """Request to train a new model."""
    data_path: str = Field(..., description="Path to training CSV")
    contamination: float = Field(0.1, ge=0.0, le=0.5, description="Expected anomaly rate")


class TrainingResponse(BaseModel):
    """Response after training."""
    success: bool
    message: str
    total_samples: Optional[int] = None
    n_anomalies_detected: Optional[int] = None
    anomaly_rate: Optional[float] = None