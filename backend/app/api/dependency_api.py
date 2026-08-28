from fastapi import APIRouter, HTTPException

from app.models.cascade_predictor import cascade_predict
from app.services.topology_service import get_topology


router = APIRouter(prefix="/dependency", tags=["Service Dependency Analysis"])


def _service_labels_by_id():
    return {service["id"]: service["label"] for service in get_topology()["nodes"]}


@router.get("/topology")
def get_service_topology():
    return get_topology()


@router.get("/impact/{service_id}")
def get_service_impact(service_id: str):
    service_label = _service_labels_by_id().get(service_id)
    if service_label is None:
        raise HTTPException(status_code=404, detail=f"Service '{service_id}' not found")
    return cascade_predict(service_label)