from app.routes import simulator
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import threading
import asyncio

# Services
from app.services.topology_service import get_topology
from app.services.health_service import update_service_health
from app.services.metrics_service import get_metrics_history
from app.services.service_graph import simulate_failure
from app.models.anomaly_detector import detect_anomaly

# Utils
from app.utils.metrics_generator import metrics, update_metrics

# Routes
from app.routes import ml
from app.routes import system


app = FastAPI(title="AutoOps Pro API")

# =========================
# ✅ CORS FIX (IMPORTANT)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # allow frontend (localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# INCLUDE ROUTES
# =========================
app.include_router(ml.router)
app.include_router(system.router)
app.include_router(simulator.router)


# =========================
# BACKGROUND METRICS THREAD
# =========================
thread = threading.Thread(target=update_metrics, daemon=True)
thread.start()


# =========================
# BASIC ROUTES
# =========================
@app.get("/")
def home():
    return {"message": "AutoOps Pro Backend Running"}


@app.get("/metrics")
def get_metrics():
    return metrics


@app.get("/prediction")
def prediction():
    if metrics["cpu_usage"] > 80:
        return {
            "prediction": "Possible system overload in 10 minutes",
            "confidence": "87%"
        }
    else:
        return {
            "prediction": "System stable",
            "confidence": "92%"
        }


@app.get("/incidents")
def incidents():
    if metrics["memory_usage"] > 85:
        return {
            "incident": "Memory leak detected",
            "severity": "high"
        }
    return {"incident": "No active incidents"}


@app.get("/simulate-cascade")
def simulate_cascade():
    return simulate_failure()


# =========================
# WEBSOCKET
# =========================
@app.websocket("/ws/metrics")
async def websocket_metrics(websocket: WebSocket):
    await websocket.accept()

    while True:
        await websocket.send_json(metrics)
        await asyncio.sleep(2)


# =========================
# SYSTEM INFO ROUTES
# =========================
@app.get("/topology")
def topology():
    return get_topology()


@app.get("/service-health")
def service_health():
    return update_service_health()


@app.get("/metrics/history")
def metrics_history(service: str = None, limit: int = 50):
    return get_metrics_history(service, limit)


@app.get("/metrics/live-with-anomaly")
def live_metrics_with_anomaly():
    current = metrics

    detection_input = {
        "cpu": current.get("cpu_usage", 0),
        "memory": current.get("memory_usage", 0),
        "response_time": current.get("response_time", 0),
        "requests": current.get("requests_per_sec", 0),
        "error_rate": current.get("error_rate", 0),
        "latency": current.get("latency", 0)
    }

    result = detect_anomaly(detection_input)

    return {
        "metrics": current,
        "anomaly": result
    }