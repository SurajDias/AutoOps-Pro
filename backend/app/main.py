import asyncio
import os
import threading

from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# Services
from app.services.topology_service import get_topology
from app.services.health_service import update_service_health
from app.services.metrics_service import get_metrics_history
from app.services.service_graph import (
    UnknownServiceError,
    analyze_dependency_impact,
    simulate_failure,
)

# Models
from app.models.anomaly_detector import detect_anomaly

# Utils
from app.utils.metrics_generator import metrics, update_metrics

# Routes
from app.routes import ml
from app.routes import simulator
from app.routes import system

# Incident Management API
from app.api.incident_api import router as incident_router
from app.api.dependency_api import router as dependency_router


DEFAULT_CORS_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
CORS_ALLOW_CREDENTIALS = True


def parse_cors_origins(origins_value: str, *, allow_credentials: bool = CORS_ALLOW_CREDENTIALS) -> list[str]:
    """Parse CORS origins and reject credentialed wildcard access at startup."""
    origins = [origin.strip() for origin in origins_value.split(",") if origin.strip()]
    if allow_credentials and "*" in origins:
        raise RuntimeError("CORS_ORIGINS must not include '*' when credentials are enabled.")
    return origins


app = FastAPI(
    title="AutoOps Pro API",
    version="1.0.0"
)

# =========================
# CORS
# =========================
cors_origins = parse_cors_origins(os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# INCLUDE ROUTES
# =========================
app.include_router(ml.router)
app.include_router(system.router)
app.include_router(simulator.router)

app.include_router(
    incident_router,
    prefix="/incidents",
    tags=["Incident Management"]
)
app.include_router(dependency_router)

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
    return {
        "message": "Welcome to AutoOps Pro"
    }


@app.get("/metrics")
def get_metrics():
    return metrics


@app.get("/prediction")
def prediction():
    if metrics["cpu"] > 80:
        return {
            "prediction": "Possible system overload in 10 minutes",
            "confidence": "87%"
        }

    return {
        "prediction": "System stable",
        "confidence": "92%"
    }


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


@app.get("/service-dependencies/{service_id}/impact")
def service_dependency_impact(service_id: str):
    try:
        return analyze_dependency_impact(service_id)
    except UnknownServiceError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error


@app.get("/metrics/history")
def metrics_history(service: str = None, limit: int = 50):
    return get_metrics_history(service, limit)


@app.get("/metrics/live-with-anomaly")
def live_metrics_with_anomaly():
    current = metrics

    detection_input = {
        "cpu": current.get("cpu", 0),
        "memory": current.get("memory", 0),
        "response_time": current.get("response_time", 0),
        "requests": current.get("requests", 0),
        "error_rate": current.get("error_rate", 0),
        "latency": current.get("latency", 0),
    }

    result = detect_anomaly(detection_input)

    return {
        "metrics": current,
        "anomaly": result,
    }
