from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


# These are the only lifecycle states implemented by the incident API and UI.
# Keeping this at the request boundary prevents statistics and filters from
# silently receiving unsupported values such as "Acknowledged".
IncidentStatus = Literal["Open", "Resolved"]


class IncidentCreate(BaseModel):
    service_name: str
    severity: str
    anomaly_type: str
    root_cause: str
    recommendation: str
    status: IncidentStatus = "Open"
    evidence_snapshot: dict[str, Any] | None = None


class IncidentResponse(IncidentCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)


class IncidentUpdate(BaseModel):
    status: IncidentStatus


class HistoricalIncidentData(BaseModel):
    """Persisted historical incident record for intelligence response."""

    id: int
    service_name: str
    severity: str
    anomaly_type: str
    root_cause: str
    recommendation: str
    status: IncidentStatus
    timestamp: str | None = None
    resolved_at: str | None = None
    incident_duration: str | None = None


class HistoricalSummary(BaseModel):
    """Deterministic statistics derived from persisted incidents.

    most_frequently_recorded_recommendation: The recommendation most often recorded for this root cause
    in historical incidents. This is a frequency metric only; it does not reflect execution or success rates.
    """

    same_service_count: int
    same_root_cause_count: int
    same_anomaly_count: int
    most_frequently_recorded_recommendation: str | None = Field(
        None,
        description="Recommendation appearing most frequently in historical incidents with this root cause"
    )
    most_affected_service: str | None
    root_cause_seen_before: bool
    similar_incidents_available: bool


class HistoricalIntelligence(BaseModel):
    """Historical incident intelligence for investigation context."""

    incident_id: int
    historical_summary: HistoricalSummary
    similar_incidents: list[HistoricalIncidentData]


class IncidentFeedbackCreate(BaseModel):
    status: Literal["accepted", "rejected"]
    reason: str | None = Field(default=None, max_length=1000)


class RecommendationExecutionCreate(BaseModel):
    """Create a recommendation execution record."""

    incident_id: int
    recommendation: str
    execution_start: str
    execution_end: str
    outcome: str
    notes: str | None = None


class RecommendationExecutionResponse(BaseModel):
    """Response for a recommendation execution record."""

    id: int
    incident_id: int
    recommendation: str
    execution_start: str
    execution_end: str
    outcome: str
    notes: str | None = None


class RecommendationOutcomeAssessment(BaseModel):
    """Assessment of a recommendation execution."""

    incident_id: int
    recommendation: str
    outcome: str
    notes: str | None = None


ExecutionStatus = Literal[
    "PLANNED",
    "ACCEPTED",
    "EXECUTING",
    "EXECUTED",
    "FAILED",
    "CANCELLED",
]

OutcomeStatus = Literal[
    "IMPROVED",
    "NO_CHANGE",
    "DEGRADED",
    "INCONCLUSIVE",
    "UNKNOWN",
]

OutcomeAssessedBy = Literal["AUTOMATED", "OPERATOR", "EXTERNAL"]


class ExecutionCreate(BaseModel):
    recommendation: str = Field(..., min_length=1, max_length=2000)
    execution_method: str | None = Field(default=None, max_length=255)
    actor: str | None = Field(default=None, max_length=255)

    @field_validator("recommendation", "execution_method", "actor")
    @classmethod
    def _validate_nonempty_string(cls, value: str | None):
        if value is None:
            return value
        trimmed = value.strip()
        if trimmed == "":
            raise ValueError("must not be blank")
        return trimmed


class ExecutionFailureCreate(BaseModel):
    error_code: str | None = Field(default=None, max_length=255)
    error_message: str | None = Field(default=None, max_length=1000)

    @field_validator("error_code", "error_message")
    @classmethod
    def _validate_failure_text(cls, value: str | None):
        if value is None:
            return value
        trimmed = value.strip()
        if trimmed == "":
            raise ValueError("must not be blank")
        return trimmed


class ExecutionOutcomeCreate(BaseModel):
    outcome_status: OutcomeStatus
    outcome_assessed_by: OutcomeAssessedBy


class ExecutionResponse(BaseModel):
    id: int
    incident_id: int
    recommendation: str
    execution_status: ExecutionStatus
    execution_method: str | None = None
    actor: str | None = None
    attempt_number: int
    started_at: str | None = None
    completed_at: str | None = None
    error_code: str | None = None
    error_message: str | None = None
    outcome_status: OutcomeStatus | None = None
    outcome_assessed_by: OutcomeAssessedBy | None = None
    outcome_assessed_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InvestigationIncidentDetails(BaseModel):
    """Persisted incident fields included in an investigation summary."""

    id: int
    service_name: str
    severity: str
    anomaly_type: str
    root_cause: str
    recommendation: str
    status: IncidentStatus
    timestamp: str | None = None
    resolved_at: str | None = None
    evidence_snapshot: dict[str, Any] | None = None


class InvestigationTimelineEvent(BaseModel):
    timestamp: str | None = None
    event_type: str
    title: str
    description: str


class InvestigationSummary(BaseModel):
    """Read-only, fact-bounded composition of incident investigation data."""

    incident: InvestigationIncidentDetails
    telemetry_snapshot: dict[str, Any] | None = None
    historical_intelligence: HistoricalIntelligence | None = None
    recommendation_explanation: dict[str, Any] | None = None
    operator_feedback: dict[str, Any] | None = None
    executions: list[ExecutionResponse]
    timeline: list[InvestigationTimelineEvent]
    limitations: list[str]
