from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database.postgres import get_db
from backend.app.database.models import Incident
from backend.app.schemas.incident import IncidentCreate, IncidentUpdate

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

@router.get("/history")
def incident_history(db: Session = Depends(get_db)):

    history = (
        db.query(Incident)
        .order_by(Incident.timestamp.desc())
        .all()
    )

    return history

@router.get("/statistics")
def incident_statistics(db: Session = Depends(get_db)):

    total = db.query(Incident).count()

    open_count = db.query(Incident).filter(
        Incident.status == "Open"
    ).count()

    resolved_count = db.query(Incident).filter(
        Incident.status == "Resolved"
    ).count()

    high_count = db.query(Incident).filter(
        Incident.severity == "High"
    ).count()

    return {
        "total_incidents": total,
        "open_incidents": open_count,
        "resolved_incidents": resolved_count,
        "high_severity_incidents": high_count
    }

@router.get("/patterns")
def incident_patterns(db: Session = Depends(get_db)):

    common_root = (
        db.query(
            Incident.root_cause,
            func.count(Incident.root_cause).label("count")
        )
        .group_by(Incident.root_cause)
        .order_by(func.count(Incident.root_cause).desc())
        .first()
    )

    common_service = (
        db.query(
            Incident.service_name,
            func.count(Incident.service_name).label("count")
        )
        .group_by(Incident.service_name)
        .order_by(func.count(Incident.service_name).desc())
        .first()
    )

    return {
        "most_common_root_cause":
            common_root[0] if common_root else None,

        "most_affected_service":
            common_service[0] if common_service else None,

        "recurring_incidents":
            common_root[1] if common_root else 0
    }
@router.get("/search")
def search_incidents(
    service_name: str = None,
    root_cause: str = None,
    severity: str = None,
    db: Session = Depends(get_db)
):

    query = db.query(Incident)

    if service_name:
        query = query.filter(Incident.service_name.ilike(f"%{service_name}%"))

    if root_cause:
        query = query.filter(Incident.root_cause.ilike(f"%{root_cause}%"))

    if severity:
        query = query.filter(Incident.severity.ilike(f"%{severity}%"))

    results = query.all()

    return {
        "total_matches": len(results),
        "incidents": results
    }

@router.get("/{incident_id}")
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = db.query(Incident).filter(Incident.id == incident_id).first()

    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    return incident
@router.put("/{incident_id}")
def update_incident(
    incident_id: int,
    updated: IncidentUpdate,
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

    incident.status = updated.status

    db.commit()
    db.refresh(incident)

    return {
        "message": "Incident updated successfully",
        "incident": incident
    }
@router.delete("/{incident_id}")
def delete_incident(
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

    db.delete(incident)
    db.commit()

    return {
        "message": "Incident deleted successfully"
    }
