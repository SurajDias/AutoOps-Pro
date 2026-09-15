from __future__ import annotations

import platform
import socket
import time
from datetime import datetime, timezone
from typing import Any, Callable

import psutil


def _safe_call(callback: Callable[[], Any]) -> Any:
    try:
        return callback()
    except Exception:
        return None


def _uptime_seconds() -> float | None:
    boot_time = _safe_call(psutil.boot_time)
    if boot_time is None:
        return None
    return max(0.0, time.time() - float(boot_time))


def _boot_time_iso() -> str | None:
    boot_epoch = _safe_call(psutil.boot_time)
    if boot_epoch is None:
        return None
    return datetime.fromtimestamp(float(boot_epoch), tz=timezone.utc).isoformat()


def get_system_telemetry() -> dict[str, Any]:
    memory = _safe_call(psutil.virtual_memory)
    total_memory = getattr(memory, 'total', None) if memory is not None else None
    available_memory = getattr(memory, 'available', None) if memory is not None else None

    telemetry: dict[str, Any] = {
        'os_name': _safe_call(platform.system),
        'os_release': _safe_call(platform.release),
        'os_version': _safe_call(platform.version),
        'kernel_version': _safe_call(lambda: platform.uname().release) or _safe_call(platform.version),
        'architecture': _safe_call(platform.machine),
        'hostname': _safe_call(socket.gethostname),
        'cpu_logical_cores': _safe_call(lambda: psutil.cpu_count(logical=True)),
        'total_memory_bytes': total_memory,
        'available_memory_bytes': available_memory,
        'uptime_seconds': _uptime_seconds(),
        'boot_time': _boot_time_iso(),
        'collected_at': datetime.now(timezone.utc),
    }
    return telemetry
