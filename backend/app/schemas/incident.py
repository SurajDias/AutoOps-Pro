from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


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
