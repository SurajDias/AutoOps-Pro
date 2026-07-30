from pydantic import BaseModel


class IncidentCreate(BaseModel):
    service_name: str
    severity: str
    anomaly_type: str
    root_cause: str
    recommendation: str
    status: str = "Open"


class IncidentResponse(IncidentCreate):
    id: int

    class Config:
        from_attributes = True


class IncidentUpdate(BaseModel):
    status: str