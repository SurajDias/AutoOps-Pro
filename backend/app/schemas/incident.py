from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


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
