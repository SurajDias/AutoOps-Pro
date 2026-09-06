from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.database.postgres import get_db
from backend.app.database.models import Incident
from backend.app.schemas.incident import IncidentCreate

router = APIRouter()


@router.get("/")
def home():
    return {
        "message": "Incident Management API is working!"
    }


@router.post("/")
def create_incident(
    incident: IncidentCreate,
    db: Session = Depends(get_db)
):
    new_incident = Incident(
        service_name=incident.service_name,
        severity=incident.severity,
        anomaly_type=incident.anomaly_type,
        root_cause=incident.root_cause,
        recommendation=incident.recommendation,
        status=incident.status
    )

    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)

    return {
        "message": "Incident saved successfully",
        "incident_id": new_incident.id
    }
@router.get("/all")
def get_all_incidents(db: Session = Depends(get_db)):
    incidents = db.query(Incident).all()
    return incidents

from fastapi import HTTPException


@router.get("/{incident_id}")
def get_incident(
    incident_id: int,
    db: Session = Depends(get_db)
):
    incident = db.query(Incident).filter(
        Incident.id == incident_id
    ).first()

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident