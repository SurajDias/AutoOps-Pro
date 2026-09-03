from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import JSONB

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
    # Captured once by the automatic incident-creation path. Resolution only
    # changes lifecycle state, preserving the original diagnostic evidence.
    evidence_snapshot = Column(JSONB, nullable=True)
