from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class SystemTelemetry(BaseModel):
    os_name: Optional[str] = None
    os_release: Optional[str] = None
    os_version: Optional[str] = None
    kernel_version: Optional[str] = None
    architecture: Optional[str] = None
    hostname: Optional[str] = None
    cpu_logical_cores: Optional[int] = None
    total_memory_bytes: Optional[int] = None
    available_memory_bytes: Optional[int] = None
    uptime_seconds: Optional[float] = None
    boot_time: Optional[str] = None
    collected_at: Optional[datetime] = None

    model_config = ConfigDict(extra='forbid')
