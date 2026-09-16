from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class SystemTelemetry(BaseModel):
    os_name: Optional[str] = None
    os_release: Optional[str] = None
    os_version: Optional[str] = None
    kernel_version: Optional[str] = None
    architecture: Optional[str] = None
    hostname: Optional[str] = None
    cpu_logical_cores: Optional[int] = None
    cpu_physical_cores: Optional[int] = None
    total_memory_bytes: Optional[int] = None
    available_memory_bytes: Optional[int] = None
    used_memory_bytes: Optional[int] = None
    memory_usage_percent: Optional[float] = None
    uptime_seconds: Optional[float] = None
    boot_time: Optional[str] = None
    collected_at: Optional[datetime] = None

    model_config = ConfigDict(extra='forbid')


class NetworkAddress(BaseModel):
    family: Optional[str] = None
    address: Optional[str] = None
    netmask: Optional[str] = None
    broadcast: Optional[str] = None
    ptp: Optional[str] = None

    model_config = ConfigDict(extra='forbid')


class NetworkInterface(BaseModel):
    name: str
    is_up: Optional[bool] = None
    speed_mbps: Optional[int] = None
    mtu: Optional[int] = None
    addresses: list[NetworkAddress] = Field(default_factory=list)
    mac_address: Optional[str] = None
    bytes_sent: Optional[int] = None
    bytes_received: Optional[int] = None
    packets_sent: Optional[int] = None
    packets_received: Optional[int] = None
    errors_sent: Optional[int] = None
    errors_received: Optional[int] = None
    drops_sent: Optional[int] = None
    drops_received: Optional[int] = None

    model_config = ConfigDict(extra='forbid')


class ListeningPort(BaseModel):
    protocol: str
    address_family: Optional[str] = None
    local_address: Optional[str] = None
    local_port: Optional[int] = None
    status: Optional[str] = None

    model_config = ConfigDict(extra='forbid')


class ProcessTelemetry(BaseModel):
    pid: int
    name: Optional[str] = None
    status: Optional[str] = None
    username: Optional[str] = None
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    memory_rss_bytes: Optional[int] = None
    thread_count: Optional[int] = None
    creation_time: Optional[str] = None

    model_config = ConfigDict(extra='forbid')
