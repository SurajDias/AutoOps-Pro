from fastapi import APIRouter

# IMPORT METRICS + MODEL
from app.utils.metrics_generator import metrics
from app.models.anomaly_detector import detect_anomaly

router = APIRouter()

@router.get("/system-status")
def get_system_status():

    # 1️⃣ Get current metrics
    current = metrics

    # 2️⃣ Prepare input for model
    detection_input = {
        "cpu": current.get("cpu_usage", 0),
        "memory": current.get("memory_usage", 0),
        "response_time": current.get("response_time", 0),
        "requests": current.get("requests_per_sec", 0),
        "error_rate": current.get("error_rate", 0),
        "latency": current.get("latency", 0)
    }

    # 3️⃣ Detect anomaly
    result = detect_anomaly(detection_input)

    # 4️⃣ Decide status
    if result.get("anomaly"):
        status = "critical"
    else:
        status = "normal"

    # 5️⃣ Final response (basic)
    return {
        "service": "payment",  # temporary
        "status": status,
        "anomaly": result.get("anomaly")
    }