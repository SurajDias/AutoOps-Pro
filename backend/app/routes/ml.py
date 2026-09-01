from fastapi import APIRouter, HTTPException, status
from app.schemas.anomaly import MetricInput, AnomalyResult, TrainingRequest, TrainingResponse
from app.models.anomaly_detector import detector
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


# =========================
# DETECT ANOMALY
# =========================
@router.post("/detect-anomaly", response_model=AnomalyResult)
async def detect_anomaly(metrics: MetricInput):
    try:
        if detector.model is None:
            if not detector.load_model():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Model not trained yet. Please train first."
                )

        data = metrics.dict()
        service_name = data.pop("service")

        result = detector.detect(data)
        result["service"] = service_name

        return result

    except HTTPException:
        raise
    except Exception:
        logger.exception("Anomaly detection failed")
        raise HTTPException(status_code=500, detail="Unable to process anomaly detection.")


# =========================
# TRAIN MODEL (FIXED ✅)
# =========================
@router.post("/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest):
    try:
        # ✅ CORRECT PATH (YOUR FILE LOCATION)
        stats = detector.train(
            data_path="system_metrics.csv",
            contamination=request.contamination
        )

        return TrainingResponse(
            success=True,
            message="Model trained successfully",
            **stats
        )

    except Exception:
        logger.exception("Model training failed")
        raise HTTPException(
            status_code=500,
            detail="Unable to train the model.",
        )


# =========================
# MODEL STATUS
# =========================
@router.get("/model-status")
async def get_model_status():
    return {
        "model_loaded": detector.model is not None,
        "model_path": detector.model_path.name if detector.model else None,
        "features": detector.features,
        "status": "ready" if detector.model else "not_trained"
    }
