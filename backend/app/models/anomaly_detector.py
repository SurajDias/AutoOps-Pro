"""
Anomaly Detection Model
Combines: IsolationForest (ML) + Rule-based weighted scoring
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import joblib
from pathlib import Path
from typing import Dict, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AnomalyDetector:

    def __init__(self, model_path: Optional[str] = None):

        self.features = [
            'cpu', 'memory', 'response_time',
            'requests', 'error_rate', 'latency'
        ]
        self.scaler = StandardScaler()
        self.model  = None

        if model_path is None:
            base_dir = Path(__file__).parent / "saved"
            base_dir.mkdir(exist_ok=True)
            self.model_path   = base_dir / "anomaly_model.pkl"
            self.scaler_path  = base_dir / "scaler.pkl"
        else:
            self.model_path  = Path(model_path)
            self.scaler_path = self.model_path.parent / "scaler.pkl"

        # Thresholds used by both rule engine and explainer
        self.thresholds = {
            'cpu':           80,
            'memory':        85,
            'response_time': 200,
            'error_rate':    5,
            'latency':       200,
        }

    # ── Train ────────────────────────────────────────────────────────────────

    def train(self, data_path: str, contamination: float = 0.1):
        logger.info(f"Loading data from {data_path}")
        df = pd.read_csv(data_path)
        X  = df[self.features].copy().fillna(df[self.features].median())

        X_scaled   = self.scaler.fit_transform(X)
        self.model = IsolationForest(
            contamination=contamination,
            random_state=42,
            n_estimators=100,
            n_jobs=-1
        )
        self.model.fit(X_scaled)

        joblib.dump(self.model,  self.model_path)
        joblib.dump(self.scaler, self.scaler_path)

        predictions = self.model.predict(X_scaled)
        anomalies   = (predictions == -1).sum()

        return {
            "total_samples":     len(df),
            "anomalies_detected": int(anomalies),
            "model_saved":        str(self.model_path)
        }

    # ── Load ─────────────────────────────────────────────────────────────────

    def load_model(self):
        try:
            if not self.model_path.exists():
                logger.warning("Model file not found")
                return False
            self.model  = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            logger.info("Model loaded successfully")
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False

    # ── Rule-based weighted scorer (NEW) ─────────────────────────────────────
    # Complements the ML model with interpretable threshold logic.
    # Each breach contributes a fixed weight — sum > 0.6 → anomaly.
    #
    # Weights chosen to reflect operational impact:
    #   CPU     → 0.30  (biggest throughput killer)
    #   Memory  → 0.25  (OOM risk)
    #   Latency → 0.25  (user-facing)
    #   Errors  → 0.20  (service health)

    def _rule_based_score(self, data: Dict[str, float]):
        score   = 0.0
        reasons = []

        cpu        = data.get("cpu",           0)
        memory     = data.get("memory",        0)
        latency    = max(data.get("latency",   0), data.get("response_time", 0))
        error_rate = data.get("error_rate",    0)

        if cpu > self.thresholds["cpu"]:
            score += 0.30
            reasons.append(f"High CPU ({cpu}%)")

        if memory > self.thresholds["memory"]:
            score += 0.25
            reasons.append(f"High Memory ({memory}%)")

        if latency > self.thresholds["latency"]:
            score += 0.25
            reasons.append(f"High Latency ({latency}ms)")

        if error_rate > self.thresholds["error_rate"]:
            score += 0.20
            reasons.append(f"High Errors ({error_rate}%)")

        return round(min(score, 1.0), 4), reasons

    # ── Detect ───────────────────────────────────────────────────────────────

    def detect(self, data: Dict[str, float]):
        """
        Combines ML model + rule-based weighted scoring.

        anomaly_score (0–1, not a calibrated probability):
          - Rule-based contributes 60% weight  (interpretable, stable)
          - ML model contributes 40% weight    (catches unusual patterns)

        anomaly = True if combined score > 0.5
                  OR rule_score alone > 0.6    (explicit threshold breach)
        """
        # ── Rule-based ────────────────────────────────────────────────────────
        rule_score, rule_reasons = self._rule_based_score(data)
        cpu = float(data.get("cpu", 0))
        memory = float(data.get("memory", 0))
        latency = max(float(data.get("latency", 0)), float(data.get("response_time", 0)))
        error_rate = float(data.get("error_rate", 0))
        critical_breach = (
            cpu >= 85
            or memory >= 90
            or latency >= 350
            or error_rate >= 5
        )
        rule_anomaly = rule_score >= 0.5

        # ── ML model (if loaded) ──────────────────────────────────────────────
        ml_normalized = 0.0
        ml_anomaly    = False

        if self.model is not None:
            missing = [f for f in self.features if f not in data]
            if missing:
                logger.warning(f"Missing fields: {missing}")

            values    = [data.get(f, 0) for f in self.features]
            X         = pd.DataFrame([values], columns=self.features)
            X_scaled  = self.scaler.transform(X)
            prediction = self.model.predict(X_scaled)[0]
            ml_raw     = self.model.score_samples(X_scaled)[0]

            ml_anomaly    = (prediction == -1)
            # score_samples returns negative values; more negative = more anomalous
            # Normalize: typical range [-0.5, 0.1] → flip and scale to [0, 1]
            ml_normalized = max(0.0, min(1.0, (-ml_raw) / 0.6))

        # ── Combined score ────────────────────────────────────────────────────
        anomaly_score = round(
            (rule_score * 0.60) + (ml_normalized * 0.40), 4
        )
        is_anomaly = critical_breach or rule_anomaly or ml_anomaly or (anomaly_score > 0.50)

        # ── Reason string ─────────────────────────────────────────────────────
        if rule_reasons:
            reason = " + ".join(rule_reasons)
        elif is_anomaly:
            reason = "Unusual pattern detected by ML model"
        else:
            reason = "All metrics within normal range"

        return {
            "anomaly":       bool(is_anomaly),      # ← unified key (was is_anomaly)
            "anomaly_score": anomaly_score,          # ← 0–1 hybrid score, not a probability
            "reason":        reason,
            "is_anomaly":    bool(is_anomaly),       # ← kept for backward compat
            # Expose the existing rule contribution so host telemetry can be
            # debounced without treating an Isolation Forest trained on demo
            # service metrics as a direct host-alert source.
            "rule_score":    rule_score,
            # These are observability fields for the existing calculation. They
            # let API consumers explain a result without reimplementing the
            # detector or treating the hybrid score as a probability.
            "rule_evidence": bool(rule_anomaly),
            "ml_anomaly":    bool(ml_anomaly),
            "thresholds":    dict(self.thresholds),
        }

    # ── Explain (kept for internal use) ──────────────────────────────────────

    def _explain(self, data, is_anomaly):
        if not is_anomaly:
            return "All metrics normal"
        issues = []
        if data.get("cpu",           0) > self.thresholds["cpu"]:
            issues.append(f"High CPU ({data['cpu']}%)")
        if data.get("memory",        0) > self.thresholds["memory"]:
            issues.append(f"High Memory ({data['memory']}%)")
        if data.get("response_time", 0) > self.thresholds["response_time"]:
            issues.append(f"Slow Response ({data['response_time']}ms)")
        if data.get("error_rate",    0) > self.thresholds["error_rate"]:
            issues.append(f"High Errors ({data['error_rate']}%)")
        if data.get("latency",       0) > self.thresholds["latency"]:
            issues.append(f"High Latency ({data['latency']}ms)")
        return " + ".join(issues) if issues else "Unusual pattern detected"

    # ── Batch ─────────────────────────────────────────────────────────────────

    def batch_detect(self, data_list: list):
        return [self.detect(d) for d in data_list]


# ── Global instance ───────────────────────────────────────────────────────────

detector = AnomalyDetector()

if not detector.load_model():
    logger.warning("⚠️ Model not found. Rule-based detection still active.")


def detect_anomaly(data: Dict[str, float]):
    return detector.detect(data)
