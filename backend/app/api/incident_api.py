import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database.models import Incident, RecommendationExecution
from app.schemas.incident import (
    ExecutionCreate,
    ExecutionFailureCreate,
    ExecutionOutcomeCreate,
    ExecutionResponse,
    IncidentCreate,
    IncidentFeedbackCreate,
    IncidentUpdate,
    HistoricalIntelligence,
    InvestigationSummary,
)
from app.services.historical_intelligence import get_historical_intelligence
from app.services.telemetry_service import collect_incident_telemetry_snapshot
from app.storytelling.incident_report_generator import build_incident_report
from app.database.postgres import get_db

ALLOWED_EXECUTION_TRANSITIONS = {
    "PLANNED": {"ACCEPTED", "CANCELLED"},
    "ACCEPTED": {"EXECUTING", "CANCELLED"},
    "EXECUTING": {"EXECUTED", "FAILED"},
}
TERMINAL_EXECUTION_STATES = {"EXECUTED", "FAILED", "CANCELLED"}


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

    feedback = _operator_feedback_for(incident)
    if feedback is not None and feedback["created_at"] is not None:
        decision = "accepted" if feedback["status"] == "accepted" else "rejected"
        description = f"Operator {decision} the recommendation '{feedback['action']}'."
        if feedback["reason"]:
            description += f" Reason: {feedback['reason']}"
        events.append({
            "timestamp": feedback["created_at"],
            "event_type": f"recommendation_{decision}",
            "title": f"Recommendation {decision}",
            "description": description,
            "order": 4,
        })

    # Older resolved rows may predate the persisted resolved_at field. Do not
    # infer a resolution time for them from a current request or another field.
    if incident.status == "Resolved" and incident.resolved_at is not None:
        events.append({
            "timestamp": _iso_timestamp(incident.resolved_at),
            "event_type": "resolved",
            "title": "Incident resolved",
            "description": f"Incident status recorded as {incident.status}.",
            "order": 5,
        })

    return [
        {key: value for key, value in event.items() if key != "order"}
        for event in sorted(events, key=lambda event: (event["timestamp"] or "", event["order"]))
    ]


def _recorded_recommendation_explanation(incident: Incident):
    """Return only reasoning captured with the historical incident, if any."""
    snapshot = incident.evidence_snapshot or {}
    return snapshot.get("recommendation_explanation")


def _operator_feedback_for(incident: Incident):
    """Serialize feedback that was explicitly persisted by an operator."""
    if incident.feedback_status is None:
        return None
    return {
        "status": incident.feedback_status,
        "reason": incident.feedback_reason,
        "created_at": _iso_timestamp(incident.feedback_created_at),
        "action": incident.feedback_action,
    }


def _database_unavailable(error: Exception) -> HTTPException:
    """Keep infrastructure details in server logs while returning a safe API error."""
    logger.exception("Incident database operation failed: %s", error)
    return HTTPException(503, "Incident database is temporarily unavailable. No incident data was substituted.")


router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/")
def home(db: Session = Depends(get_db)):
    try:
        return db.query(Incident).all()
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.post("/")
def create_incident(incident: IncidentCreate, db: Session = Depends(get_db)):
    try:
        incident_data = incident.model_dump()
        incident_data["telemetry_snapshot"] = collect_incident_telemetry_snapshot()
        new_incident = Incident(**incident_data)
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


@router.post("/{incident_id}/feedback")
def record_operator_feedback(incident_id: int, feedback: IncidentFeedbackCreate, db: Session = Depends(get_db)):
    """Persist one operator acceptance/rejection; this does not execute an action."""
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).with_for_update().first()
        if incident is None:
            raise HTTPException(404, "Incident not found")
        if incident.feedback_status is not None:
            raise HTTPException(409, "Operator feedback has already been recorded for this incident")

        snapshot = incident.evidence_snapshot or {}
        incident.feedback_status = feedback.status
        incident.feedback_reason = feedback.reason
        incident.feedback_created_at = datetime.now(timezone.utc).replace(tzinfo=None)
        incident.feedback_action = snapshot.get("recommended_action") or incident.recommendation
        db.commit()
        db.refresh(incident)
        return {
            "message": "Operator feedback recorded. This does not execute the recommendation.",
            "operator_feedback": _operator_feedback_for(incident),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.get("/{incident_id}/report")
def get_incident_report(incident_id: int, db: Session = Depends(get_db)):
    """Generate an auditable report from persisted incident facts only."""
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        historical_intelligence = get_historical_intelligence(incident_id, db)
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error
    if incident is None:
        raise HTTPException(404, "Incident not found")
    return build_incident_report(
        incident,
        _timeline_for(incident),
        historical_intelligence=historical_intelligence,
    )


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
        "recommendation_explanation": _recorded_recommendation_explanation(incident),
        "operator_feedback": _operator_feedback_for(incident),
    }


@router.get("/{incident_id}/intelligence")
def get_incident_intelligence(incident_id: int, db: Session = Depends(get_db)):
    """Get historical incident intelligence for investigation context.

    Returns deterministic historical context derived from persisted incidents:
    - count of previous incidents affecting the same service
    - count of previous incidents with the same root cause
    - count of previous incidents with the same anomaly type
    - most common recommendation historically associated with the root cause
    - most frequently affected service historically
    - whether this root cause has been seen before
    - list of relevant previous incidents (up to 5, deterministically selected)

    All data comes from persisted incident records; no current telemetry or inference.
    """
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error
    if incident is None:
        raise HTTPException(404, "Incident not found")

    try:
        intelligence = get_historical_intelligence(incident_id, db)
        return HistoricalIntelligence(**intelligence)
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/{incident_id}/investigation-summary", response_model=InvestigationSummary)
def get_investigation_summary(incident_id: int, db: Session = Depends(get_db)):
    """Compose persisted incident facts and read-only investigation context."""
    try:
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error
    if incident is None:
        raise HTTPException(404, "Incident not found")

    try:
        historical_intelligence = HistoricalIntelligence(
            **get_historical_intelligence(incident_id, db)
        )
        executions = (
            db.query(RecommendationExecution)
            .filter(RecommendationExecution.incident_id == incident_id)
            .order_by(
                RecommendationExecution.attempt_number.desc(),
                RecommendationExecution.id.desc(),
            )
            .all()
        )
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error

    recommendation_explanation = _recorded_recommendation_explanation(incident)
    operator_feedback = _operator_feedback_for(incident)
    telemetry_snapshot = incident.telemetry_snapshot
    limitations = list((telemetry_snapshot or {}).get("limitations") or [])
    if telemetry_snapshot is None:
        limitations.append("Telemetry snapshot was not captured for this incident.")
    if incident.evidence_snapshot is None:
        limitations.append("Historical evidence was not captured for this incident.")
    if recommendation_explanation is None:
        limitations.append("Recommendation explanation is not available in the persisted incident record.")
    if operator_feedback is None:
        limitations.append("Operator feedback has not been recorded for this incident.")
    if not executions:
        limitations.append("No recommendation execution records are available for this incident.")

    incident_details = {
        "id": incident.id,
        "service_name": incident.service_name,
        "severity": incident.severity,
        "anomaly_type": incident.anomaly_type,
        "root_cause": incident.root_cause,
        "recommendation": incident.recommendation,
        "status": incident.status,
        "timestamp": _iso_timestamp(incident.timestamp),
        "resolved_at": _iso_timestamp(incident.resolved_at),
        "evidence_snapshot": incident.evidence_snapshot,
    }
    return InvestigationSummary(
        incident=incident_details,
        telemetry_snapshot=telemetry_snapshot,
        historical_intelligence=historical_intelligence,
        recommendation_explanation=recommendation_explanation,
        operator_feedback=operator_feedback,
        executions=[_execution_response_payload(item) for item in executions],
        timeline=_timeline_for(incident),
        limitations=sorted(set(limitations)),
    )


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


@router.post("/{incident_id}/executions")
def create_execution(incident_id: int, payload: ExecutionCreate, db: Session = Depends(get_db)):
    """Create a planned recommendation execution record without performing any infrastructure action."""
    try:
        execution = _record_execution_attempt(db, incident_id, payload)
        return {
            "message": "Execution planned and recorded.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.post("/{incident_id}/executions/{execution_id}/accept")
def accept_execution(incident_id: int, execution_id: int, db: Session = Depends(get_db)):
    """Transition a planned execution to ACCEPTED without executing the recommendation."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        if execution.execution_status != "PLANNED":
            raise HTTPException(409, "Execution can only be accepted from PLANNED state.")
        execution.execution_status = "ACCEPTED"
        db.commit()
        db.refresh(execution)
        return {
            "message": "Execution accepted.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.post("/{incident_id}/executions/{execution_id}/start")
def start_execution(incident_id: int, execution_id: int, db: Session = Depends(get_db)):
    """Mark a previously accepted execution as actively executing."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        if execution.execution_status != "ACCEPTED":
            raise HTTPException(409, "Execution can only start from ACCEPTED state.")
        execution.execution_status = "EXECUTING"
        execution.started_at = _utc_now_naive()
        db.commit()
        db.refresh(execution)
        return {
            "message": "Execution started.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.post("/{incident_id}/executions/{execution_id}/complete")
def complete_execution(incident_id: int, execution_id: int, db: Session = Depends(get_db)):
    """Record that an executing recommendation reached the EXECUTED lifecycle state."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        if execution.execution_status != "EXECUTING":
            raise HTTPException(409, "Execution can only be completed from EXECUTING state.")
        execution.execution_status = "EXECUTED"
        execution.completed_at = _utc_now_naive()
        db.commit()
        db.refresh(execution)
        return {
            "message": "Execution completed.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.post("/{incident_id}/executions/{execution_id}/fail")
def fail_execution(
    incident_id: int,
    execution_id: int,
    payload: ExecutionFailureCreate,
    db: Session = Depends(get_db),
):
    """Record an execution failure without claiming the incident was remediated."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        if execution.execution_status != "EXECUTING":
            raise HTTPException(409, "Execution can only fail from EXECUTING state.")
        execution.execution_status = "FAILED"
        execution.completed_at = _utc_now_naive()
        execution.error_code = payload.error_code.strip() if payload.error_code else None
        execution.error_message = payload.error_message.strip() if payload.error_message else None
        db.commit()
        db.refresh(execution)
        return {
            "message": "Execution failed.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.post("/{incident_id}/executions/{execution_id}/cancel")
def cancel_execution(incident_id: int, execution_id: int, db: Session = Depends(get_db)):
    """Cancel a planned or accepted execution without performing infrastructure cancellation."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        if execution.execution_status not in {"PLANNED", "ACCEPTED"}:
            raise HTTPException(409, "Execution can only be cancelled from PLANNED or ACCEPTED state.")
        execution.execution_status = "CANCELLED"
        execution.completed_at = _utc_now_naive()
        db.commit()
        db.refresh(execution)
        return {
            "message": "Execution cancelled.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.post("/{incident_id}/executions/{execution_id}/outcome")
def assess_outcome(
    incident_id: int,
    execution_id: int,
    payload: ExecutionOutcomeCreate,
    db: Session = Depends(get_db),
):
    """Record outcome assessment separately from incident resolution or execution status."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        if execution.execution_status != "EXECUTED":
            raise HTTPException(409, "Outcome assessment can only be recorded for an EXECUTED execution.")
        execution.outcome_status = payload.outcome_status
        execution.outcome_assessed_by = payload.outcome_assessed_by
        execution.outcome_assessed_at = _utc_now_naive()
        db.commit()
        db.refresh(execution)
        return {
            "message": "Outcome assessment recorded.",
            "execution": _execution_response_payload(execution),
        }
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as error:
        db.rollback()
        raise _database_unavailable(error) from error


@router.get("/{incident_id}/executions/{execution_id}")
def get_execution(incident_id: int, execution_id: int, db: Session = Depends(get_db)):
    """Return a persisted execution record for the incident."""
    try:
        execution = _require_execution_for_incident(db, incident_id, execution_id)
        return _execution_response_payload(execution)
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


@router.get("/{incident_id}/executions")
def list_executions(incident_id: int, db: Session = Depends(get_db)):
    """List all execution attempts for an incident in deterministic order."""
    _require_incident(db, incident_id)
    try:
        executions = (
            db.query(RecommendationExecution)
            .filter(RecommendationExecution.incident_id == incident_id)
            .order_by(RecommendationExecution.attempt_number.desc(), RecommendationExecution.id.desc())
            .all()
        )
        return {
            "incident_id": incident_id,
            "executions": [_execution_response_payload(item) for item in executions],
        }
    except SQLAlchemyError as error:
        raise _database_unavailable(error) from error


def _utc_now_naive() -> datetime:
    """Return the current UTC time in the same naive-datetime format used by the persisted models."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _execution_response_payload(execution: RecommendationExecution) -> dict:
    """Serialize a persisted execution record using the request/response schema."""
    payload = {column.name: getattr(execution, column.name) for column in RecommendationExecution.__table__.columns}
    for field_name in ("started_at", "completed_at", "outcome_assessed_at"):
        payload[field_name] = _iso_timestamp(payload.get(field_name))
    return ExecutionResponse.model_validate(payload).model_dump()


def _require_incident(db: Session, incident_id: int) -> Incident:
    """Fetch an incident and raise a 404 when it is absent."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if incident is None:
        raise HTTPException(404, "Incident not found")
    return incident


def _require_execution_for_incident(db: Session, incident_id: int, execution_id: int) -> RecommendationExecution:
    """Fetch an execution scoped to the incident path; cross-incident access is not allowed."""
    execution = db.query(RecommendationExecution).filter(RecommendationExecution.id == execution_id).first()
    if execution is None or execution.incident_id != incident_id:
        raise HTTPException(404, "Execution not found for incident")
    return execution


def _next_attempt_number(db: Session, incident_id: int) -> int:
    """Allocate a deterministic next attempt number using a PostgreSQL advisory lock."""
    db.execute(
        text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
        {"lock_key": f"recommendation_execution:{incident_id}"},
    )
    max_attempt = (
        db.query(func.coalesce(func.max(RecommendationExecution.attempt_number), 0))
        .filter(RecommendationExecution.incident_id == incident_id)
        .scalar()
    )
    return int(max_attempt) + 1


def _record_execution_attempt(db: Session, incident_id: int, payload: ExecutionCreate) -> RecommendationExecution:
    """Persist a new planned execution attempt without performing any infrastructure action."""
    incident = _require_incident(db, incident_id)
    recommendation = payload.recommendation.strip()
    if not recommendation:
        raise HTTPException(422, "Recommendation must not be blank.")
    attempt_number = _next_attempt_number(db, incident_id)
    execution = RecommendationExecution(
        incident_id=incident.id,
        recommendation=recommendation,
        execution_status="PLANNED",
        execution_method=payload.execution_method.strip() if payload.execution_method else None,
        actor=payload.actor.strip() if payload.actor else None,
        attempt_number=attempt_number,
        started_at=None,
        completed_at=None,
        error_code=None,
        error_message=None,
        outcome_status=None,
        outcome_assessed_by=None,
        outcome_assessed_at=None,
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)
    return execution
