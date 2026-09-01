"""Explicit service-dependency analysis API."""

from fastapi import APIRouter, HTTPException

from app.models.cascade_predictor import cascade_predict
from app.services.service_graph import SERVICE_IDS
from app.services.topology_service import get_topology


router = APIRouter(prefix="/dependency", tags=["Service Dependency Analysis"])


@router.get("/topology")
def get_service_topology() -> dict:
    """Expose the same canonical topology used by the application."""
    return get_topology()


@router.get("/impact/{service_id}")
def get_service_impact(service_id: str) -> dict:
    """Analyze the direct and transitive blast radius of a selected service."""
    if service_id not in SERVICE_IDS:
        raise HTTPException(status_code=404, detail=f"Unknown service '{service_id}'.")
    return cascade_predict(service_id)
