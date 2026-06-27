from fastapi import FastAPI
from backend.app.api.incident_api import router as incident_router

app = FastAPI(
    title="AutoOps Pro",
    version="1.0.0"
)

app.include_router(
    incident_router,
    prefix="/incidents",
    tags=["Incident Management"]
)


@app.get("/")
def home():
    return {
        "message": "Welcome to AutoOps Pro"
    }