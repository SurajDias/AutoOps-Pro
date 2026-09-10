from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.database.postgres import Base


def _utc_now_naive() -> datetime:
    """Return the current UTC time in the legacy naive-column representation."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    anomaly_type = Column(String, nullable=False)
    root_cause = Column(String, nullable=False)
    recommendation = Column(String, nullable=False)
    status = Column(String, default="Open")
    timestamp = Column(DateTime, default=_utc_now_naive)
    # Set only when the lifecycle endpoint records a real resolution.  Keeping
    # this separate from ``timestamp`` lets the investigation timeline avoid
    # inventing a resolution time for historical rows.
    resolved_at = Column(DateTime, nullable=True)
    # One auditable operator response to the recommendation currently recorded
    # on this incident. This records review only, never action execution.
    feedback_status = Column(String, nullable=True)
    feedback_reason = Column(String(1000), nullable=True)
    feedback_created_at = Column(DateTime, nullable=True)
    feedback_action = Column(String, nullable=True)
    # Captured once by the automatic incident-creation path. Resolution only
    # changes lifecycle state, preserving the original diagnostic evidence.
    evidence_snapshot = Column(JSONB, nullable=True)


class RecommendationExecution(Base):
    __tablename__ = "recommendation_executions"
    __table_args__ = (
        CheckConstraint("attempt_number >= 1", name="ck_recommendation_exec_attempt_positive"),
    )

    id = Column(Integer, primary_key=True, index=True)
    # Link to the incident being targeted by the recommendation execution.
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=False, index=True)
    # Recommendation text or identifier recorded at execution time.
    recommendation = Column(String, nullable=False)

    # Execution lifecycle fields
    execution_status = Column(String, nullable=False)
    execution_method = Column(String, nullable=True)
    actor = Column(String, nullable=True)

    # Retry support: attempt number within the incident's execution attempts.
    attempt_number = Column(Integer, nullable=False, default=1)

    # Lifecycle timestamps (nullable until the lifecycle event occurs)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Error information (nullable unless execution fails)
    error_code = Column(String, nullable=True)
    error_message = Column(String(1000), nullable=True)

    # Outcome assessment (nullable until an outcome is recorded)
    outcome_status = Column(String, nullable=True)
    outcome_assessed_by = Column(String, nullable=True)
    outcome_assessed_at = Column(DateTime, nullable=True)

    # Relationship back to Incident
    incident = relationship("Incident", backref="recommendation_executions")
