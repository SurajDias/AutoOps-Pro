"""
Anomaly Detection Model using Isolation Forest
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path
from typing import Dict, Optional
import logging

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyDetector:

    def __init__(self, model_path: Optional[str] = None):

        self.features = [
            'cpu',
            'memory',
            'response_time',
            'requests',
            'error_rate',
            'latency'
        ]

        self.scaler = StandardScaler()
        self.model = None

        # Paths
        if model_path is None:
            base_dir = Path(__file__).parent / "saved"
            base_dir.mkdir(exist_ok=True)
            self.model_path = base_dir / "anomaly_model.pkl"
            self.scaler_path = base_dir / "scaler.pkl"
        else:
            self.model_path = Path(model_path)
            self.scaler_path = self.model_path.parent / "scaler.pkl"

        # Thresholds (for explanation only)
        self.thresholds = {
            'cpu': 80,
            'memory': 85,
            'response_time': 1000,
            'error_rate': 5,
            'latency': 500
        }

    # =========================
    # TRAIN MODEL
    # =========================
    def train(self, data_path: str, contamination: float = 0.1):

        logger.info(f"Loading data from {data_path}")

        df = pd.read_csv(data_path)
        X = df[self.features].copy()

        # Handle missing values
        X = X.fillna(X.median())

        # Scale
        X_scaled = self.scaler.fit_transform(X)

        # Train model
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100,
            n_jobs=-1
        )

        self.model.fit(X_scaled)

        # Save
        joblib.dump(self.model, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)

        predictions = self.model.predict(X_scaled)
        anomalies = (predictions == -1).sum()

        return {
            "total_samples": len(df),
            "anomalies_detected": int(anomalies),
            "model_saved": str(self.model_path)
        }

    # =========================
    # LOAD MODEL
    # =========================
    def load_model(self):

        try:
            if not self.model_path.exists():
                logger.warning("Model file not found")
                return False

            self.model = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)

            logger.info("Model loaded successfully")
            return True

        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False

    # =========================
    # DETECT ANOMALY
    # =========================
    def detect(self, data: Dict[str, float]):

        if self.model is None:
            raise ValueError("Model not loaded. Train or load first.")

        # Check missing fields
        missing = [f for f in self.features if f not in data]
        if missing:
            logger.warning(f"Missing fields: {missing}")

        # Prepare input
        values = [data.get(f, 0) for f in self.features]

        X = pd.DataFrame([values], columns=self.features)

        # Scale
        X_scaled = self.scaler.transform(X)

        # Predict
        prediction = self.model.predict(X_scaled)[0]
        score = self.model.score_samples(X_scaled)[0]

        is_anomaly = prediction == -1

        # Confidence (simple normalization)
        confidence = max(0, min(1, (1 - score) / 2))

        reason = self._explain(data, is_anomaly)

        return {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": float(score),
            "confidence": float(confidence),
            "reason": reason
        }

    # =========================
    # EXPLAIN RESULT
    # =========================
    def _explain(self, data, is_anomaly):

        if not is_anomaly:
            return "All metrics normal"

        issues = []

        if data.get("cpu", 0) > self.thresholds["cpu"]:
            issues.append(f"High CPU ({data['cpu']}%)")

        if data.get("memory", 0) > self.thresholds["memory"]:
            issues.append(f"High Memory ({data['memory']}%)")

        if data.get("response_time", 0) > self.thresholds["response_time"]:
            issues.append(f"Slow Response ({data['response_time']}ms)")

        if data.get("error_rate", 0) > self.thresholds["error_rate"]:
            issues.append(f"High Errors ({data['error_rate']}%)")

        if data.get("latency", 0) > self.thresholds["latency"]:
            issues.append(f"High Latency ({data['latency']}ms)")

        if issues:
            return " + ".join(issues)

        return "Unusual pattern detected"

    # =========================
    # BATCH
    # =========================
    def batch_detect(self, data_list: list):
        return [self.detect(d) for d in data_list]


# =========================
# GLOBAL INSTANCE
# =========================
detector = AnomalyDetector()

# Auto load model on startup
if not detector.load_model():
    logger.warning("⚠️ Model not found. Run training first.")


# =========================
# HELPER FUNCTION FOR API
# =========================
def detect_anomaly(data: Dict[str, float]):
    return detector.detect(data)