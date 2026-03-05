from fastapi import FastAPI
import threading

from app.utils.metrics_generator import metrics, update_metrics

app = FastAPI(title="AutoOps Pro API")

# Start background metrics simulation
thread = threading.Thread(target=update_metrics, daemon=True)
thread.start()

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
