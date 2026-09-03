import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.models import Incident
from app.database.postgres import get_db
from app.schemas.incident import IncidentCreate, IncidentUpdate

router = APIRouter()
logger = logging.getLogger(__name__)


def _iso_timestamp(value):
    """Serialize a persisted datetime without assigning a new time to it."""
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat() if value.tzinfo is None else value.isoformat()


def _timeline_for(incident: Incident) -> list[dict[str, str]]:
    """Derive an ordered investigation timeline entirely from incident facts."""
    created_at = _iso_timestamp(incident.timestamp)
    snapshot = incident.evidence_snapshot or None
    events = [
        {
            "timestamp": created_at,
            "event_type": "created",
            "title": "Incident created",
            "description": "Incident record was created.",
            "order": 0,
        },
    ]

    if snapshot:
        captured_at = snapshot.get("captured_at") or created_at
        events.append({
            "timestamp": captured_at,
            "event_type": "evidence_captured",
            "title": "Evidence captured",
            "description": "Historical telemetry and diagnostic evidence were captured with this incident.",
            "order": 1,
        })
    else:
        events.append({
            "timestamp": created_at,
            "event_type": "evidence_unavailable",
            "title": "Historical evidence unavailable",
            "description": "Historical evidence was not captured for this legacy incident.",
            "order": 1,
        })

    persisted_root_cause = (snapshot or {}).get("root_cause") or incident.root_cause
    events.append({
        "timestamp": created_at,
        "event_type": "diagnosed",
        "title": "Diagnosis recorded with incident",
        "description": f"{incident.anomaly_type}. Root cause recorded: {persisted_root_cause}.",
        "order": 2,
    })
    recommendation = (snapshot or {}).get("recommended_action") or incident.recommendation
    events.append({
        "timestamp": created_at,
        "event_type": "recommended",
        "title": "Recommendation recorded with incident",
        "description": recommendation,
        "order": 3,
    })

    # Older resolved rows may predate the persisted resolved_at field. Do not
    # infer a resolution time for them from a current request or another field.
    if incident.status == "Resolved" and incident.resolved_at is not None:
        events.append({
            "timestamp": _iso_timestamp(incident.resolved_at),
            "event_type": "resolved",
            "title": "Incident resolved",
            "description": f"Incident status recorded as {incident.status}.",
            "order": 4,
        })

    return [
        {key: value for key, value in event.items() if key != "order"}
        for event in sorted(events, key=lambda event: (event["timestamp"] or "", event["order"]))
    ]


def _database_unavailable(error: Exception) -> HTTPException:
    """Keep infrastructure details in server logs while returning a safe API error."""
    logger.exception("Incident database operation failed: %s", error)
    return HTTPException(503, "Incident database is temporarily unavailable. No incident data was substituted.")


@router.get("/")
def home():
    return {"message": "Incident Management API is working!"}


@router.post("/")
def create_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    try:
        new_incident = Incident(**incident.model_dump())
        db.add(new_incident)
        db.commit()
        db.refresh(new_incident)
        return {"message": "Incident saved successfully", "incident_id": new_incident.id}
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.get("/all")
def get_all_incidents(db: Session = Depends(get_db)):
    try:
        return db.query(Incident).all()
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/history")
def incident_history(db: Session = Depends(get_db)):
    try:
        return db.query(Incident).order_by(Incident.timestamp.desc()).all()
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/statistics")
def incident_statistics(db: Session = Depends(get_db)):
    try:
        total = db.query(Incident).count()
        open_count = db.query(Incident).filter(Incident.status == "Open").count()
        resolved_count = db.query(Incident).filter(Incident.status == "Resolved").count()
        high_count = db.query(Incident).filter(Incident.severity.in_(["High", "Critical"])).count()
        return {"total_incidents": total, "open_incidents": open_count, "resolved_incidents": resolved_count, "high_severity_incidents": high_count}
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/patterns")
def incident_patterns(db: Session = Depends(get_db)):
    try:
        common_root = db.query(Incident.root_cause, func.count(Incident.root_cause).label("count")).group_by(Incident.root_cause).order_by(func.count(Incident.root_cause).desc()).first()
        common_service = db.query(Incident.service_name, func.count(Incident.service_name).label("count")).group_by(Incident.service_name).order_by(func.count(Incident.service_name).desc()).first()
        return {"most_common_root_cause": common_root[0] if common_root else None, "most_affected_service": common_service[0] if common_service else None, "recurring_incidents": common_root[1] if common_root else 0}
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/search")
def search_incidents(service_name: str | None = None, root_cause: str | None = None, severity: str | None = None, db: Session = Depends(get_db)):
    try:
        query = db.query(Incident)
        if service_name:
            query = query.filter(Incident.service_name.ilike(f"%{service_name}%"))
        if root_cause:
            query = query.filter(Incident.root_cause.ilike(f"%{root_cause}%"))
        if severity:
            query = query.filter(Incident.severity.ilike(f"%{severity}%"))
        results = query.all()
        return {"total_matches": len(results), "incidents": results}
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/{incident_id}")
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error
    if incident is None:
        raise HTTPException(404, "Incident not found")
    # Detail-only enrichment preserves list/history API response contracts.
    return {
        **{column.name: getattr(incident, column.name) for column in Incident.__table__.columns},
        "timeline": _timeline_for(incident),
    }


@router.put("/{incident_id}")
def update_incident(incident_id: int, updated: IncidentUpdate, db: Session = Depends(get_db)):
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident is None:
            raise HTTPException(404, "Incident not found")
        if updated.status == "Resolved" and incident.status != "Resolved":
            incident.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
        incident.status = updated.status
        db.commit()
        db.refresh(incident)
        return {"message": "Incident updated successfully", "incident": incident}
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.delete("/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if incident is None:
            raise HTTPException(404, "Incident not found")
        db.delete(incident)
        db.commit()
        return {"message": "Incident deleted successfully"}
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error
