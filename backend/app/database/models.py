from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database.postgres import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    service_name = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    anomaly_type = Column(String, nullable=False)
    root_cause = Column(String, nullable=False)
    recommendation = Column(String, nullable=False)
    status = Column(String, default="Open")
    timestamp = Column(DateTime, default=datetime.utcnow)
