from __future__ import annotations

import platform
import socket
import time
from math import isfinite
from datetime import datetime, timezone
from typing import Any, Callable

import psutil


MAX_PROCESSES = 100


def _safe_call(callback: Callable[[], Any]) -> Any:
    try:
        return callback()
    except Exception:
        return None


def _uptime_seconds() -> float | None:
    boot_time = _safe_call(psutil.boot_time)
    if boot_time is None:
        return None
    try:
        return max(0.0, time.time() - float(boot_time))
    except (TypeError, ValueError, OverflowError):
        return None


def _boot_time_iso() -> str | None:
    boot_epoch = _safe_call(psutil.boot_time)
    if boot_epoch is None:
        return None
    try:
        return datetime.fromtimestamp(float(boot_epoch), tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OverflowError, OSError):
        return None


def _optional_int(value: Any) -> int | None:
    """Return JSON-safe integer telemetry values without coercing invalid data."""
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _optional_float(value: Any) -> float | None:
    """Return JSON-safe numeric telemetry values without coercing invalid data."""
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    normalized = float(value)
    return normalized if isfinite(normalized) else None


def get_system_telemetry() -> dict[str, Any]:
    memory = _safe_call(psutil.virtual_memory)
    total_memory = getattr(memory, 'total', None) if memory is not None else None
    available_memory = getattr(memory, 'available', None) if memory is not None else None
    used_memory = getattr(memory, 'used', None) if memory is not None else None
    memory_percent = getattr(memory, 'percent', None) if memory is not None else None

    telemetry: dict[str, Any] = {
        'os_name': _safe_call(platform.system),
        'os_release': _safe_call(platform.release),
        'os_version': _safe_call(platform.version),
        'kernel_version': _safe_call(lambda: platform.uname().release) or _safe_call(platform.version),
        'architecture': _safe_call(platform.machine),
        'hostname': _safe_call(socket.gethostname),
        'cpu_logical_cores': _optional_int(_safe_call(lambda: psutil.cpu_count(logical=True))),
        'cpu_physical_cores': _optional_int(_safe_call(lambda: psutil.cpu_count(logical=False))),
        'total_memory_bytes': _optional_int(total_memory),
        'available_memory_bytes': _optional_int(available_memory),
        'used_memory_bytes': _optional_int(used_memory),
        'memory_usage_percent': _optional_float(memory_percent),
        'uptime_seconds': _uptime_seconds(),
        'boot_time': _boot_time_iso(),
        'collected_at': datetime.now(timezone.utc),
    }
    return telemetry


def get_network_interfaces_telemetry() -> list[dict[str, Any]]:
    addrs_by_name = _safe_call(psutil.net_if_addrs) or {}
    stats_by_name = _safe_call(psutil.net_if_stats) or {}
    counters_by_name = _safe_call(lambda: psutil.net_io_counters(pernic=True)) or {}

    interface_names = sorted({
        *[str(name) for name in addrs_by_name.keys()],
        *[str(name) for name in stats_by_name.keys()],
        *[str(name) for name in counters_by_name.keys()],
    })

    payload: list[dict[str, Any]] = []
    for name in interface_names:
        stat = stats_by_name.get(name)
        counters = counters_by_name.get(name)
        interface_addresses = addrs_by_name.get(name, []) or []

        normalized_addresses: list[dict[str, Any]] = []
        mac_address: str | None = None

        for address in interface_addresses:
            family_name = _normalize_family_name(getattr(address, 'family', None))
            address_value = getattr(address, 'address', None)
            if getattr(address, 'family', None) == getattr(psutil, 'AF_LINK', None) and address_value:
                mac_address = str(address_value)

            normalized_addresses.append({
                'family': family_name,
                'address': str(address_value) if address_value is not None else None,
                'netmask': _optional_string(getattr(address, 'netmask', None)),
                'broadcast': _optional_string(getattr(address, 'broadcast', None)),
                'ptp': _optional_string(getattr(address, 'ptp', None)),
            })

        normalized_addresses.sort(
            key=lambda item: (
                str(item.get('family') or ''),
                str(item.get('address') or ''),
                str(item.get('netmask') or ''),
            )
        )

        payload.append({
            'name': name,
            'is_up': bool(getattr(stat, 'isup')) if getattr(stat, 'isup', None) is not None else None,
            'speed_mbps': _optional_int(getattr(stat, 'speed', None)) if stat is not None else None,
            'mtu': _optional_int(getattr(stat, 'mtu', None)) if stat is not None else None,
            'addresses': normalized_addresses,
            'mac_address': mac_address,
            'bytes_sent': _optional_int(getattr(counters, 'bytes_sent', None)) if counters is not None else None,
            'bytes_received': _optional_int(getattr(counters, 'bytes_recv', None)) if counters is not None else None,
            'packets_sent': _optional_int(getattr(counters, 'packets_sent', None)) if counters is not None else None,
            'packets_received': _optional_int(getattr(counters, 'packets_recv', None)) if counters is not None else None,
            'errors_sent': _optional_int(getattr(counters, 'errout', None)) if counters is not None else None,
            'errors_received': _optional_int(getattr(counters, 'errin', None)) if counters is not None else None,
            'drops_sent': _optional_int(getattr(counters, 'dropout', None)) if counters is not None else None,
            'drops_received': _optional_int(getattr(counters, 'dropin', None)) if counters is not None else None,
        })

    return payload


def get_listening_ports_telemetry() -> list[dict[str, Any]]:
    connections = _safe_call(lambda: psutil.net_connections(kind='inet')) or []
    listening_ports: list[dict[str, Any]] = []
    seen: set[tuple[str, str | None, str | None, int | None, str | None]] = set()

    for connection in connections:
        protocol = _connection_protocol(getattr(connection, 'type', None))
        local_address, local_port = _connection_local_endpoint(getattr(connection, 'laddr', None))
        address_family = _normalize_family_name(getattr(connection, 'family', None))
        connection_status = _optional_string(getattr(connection, 'status', None))
        has_remote_endpoint = bool(getattr(connection, 'raddr', None))

        if protocol == 'TCP':
            if connection_status != 'LISTEN':
                continue
        elif protocol == 'UDP':
            # psutil represents bound UDP sockets with no remote endpoint and
            # usually a status of NONE. Connected UDP sockets are excluded.
            if has_remote_endpoint:
                continue
            connection_status = None if connection_status in {None, 'NONE'} else connection_status
        else:
            continue

        if local_port is None:
            continue

        record_key = (protocol, address_family, local_address, local_port, connection_status)
        if record_key in seen:
            continue
        seen.add(record_key)
        listening_ports.append({
            'protocol': protocol,
            'address_family': address_family,
            'local_address': local_address,
            'local_port': local_port,
            'status': connection_status,
        })

    return sorted(
        listening_ports,
        key=lambda item: (
            item['protocol'],
            item['address_family'] or '',
            item['local_address'] or '',
            item['local_port'] if item['local_port'] is not None else -1,
        ),
    )


def get_processes_telemetry() -> list[dict[str, Any]]:
    """Return bounded, non-sensitive telemetry for locally running processes."""
    processes = _safe_call(lambda: psutil.process_iter()) or []
    normalized: list[dict[str, Any]] = []

    for process in processes:
        pid = _optional_int(_safe_process_call(process, 'pid'))
        if pid is None:
            continue

        creation_epoch = _optional_float(_safe_process_call(process, 'create_time'))
        creation_time = None
        if creation_epoch is not None:
            try:
                creation_time = datetime.fromtimestamp(creation_epoch, tz=timezone.utc).isoformat()
            except (OverflowError, OSError, ValueError):
                creation_time = None

        memory_info = _safe_process_call(process, 'memory_info')
        normalized.append({
            'pid': pid,
            'name': _optional_string(_safe_process_call(process, 'name')),
            'status': _optional_string(_safe_process_call(process, 'status')),
            'username': _optional_string(_safe_process_call(process, 'username')),
            'cpu_percent': _optional_float(_safe_process_call(process, 'cpu_percent')),
            'memory_percent': _optional_float(_safe_process_call(process, 'memory_percent')),
            'memory_rss_bytes': _optional_int(getattr(memory_info, 'rss', None)),
            'thread_count': _optional_int(_safe_process_call(process, 'num_threads')),
            'creation_time': creation_time,
        })

    normalized.sort(key=lambda item: (
        -(item['cpu_percent']) if item['cpu_percent'] is not None else float('inf'),
        -(item['memory_percent']) if item['memory_percent'] is not None else float('inf'),
        (item['name'] or '').casefold(),
        item['pid'],
    ))
    return normalized[:MAX_PROCESSES]


def _connection_protocol(connection_type: Any) -> str | None:
    if connection_type == getattr(socket, 'SOCK_STREAM', None):
        return 'TCP'
    if connection_type == getattr(socket, 'SOCK_DGRAM', None):
        return 'UDP'
    return None


def _connection_local_endpoint(local_endpoint: Any) -> tuple[str | None, int | None]:
    if local_endpoint is None:
        return None, None

    address = getattr(local_endpoint, 'ip', None)
    port = getattr(local_endpoint, 'port', None)
    if address is None and isinstance(local_endpoint, tuple) and local_endpoint:
        address = local_endpoint[0]
    if port is None and isinstance(local_endpoint, tuple) and len(local_endpoint) > 1:
        port = local_endpoint[1]
    return _optional_string(address), _optional_int(port)


def _optional_string(value: Any) -> str | None:
    return str(value) if value is not None else None


def _safe_process_call(process: Any, attribute: str) -> Any:
    try:
        value = getattr(process, attribute)
        return value() if callable(value) else value
    except (psutil.AccessDenied, psutil.NoSuchProcess, psutil.ZombieProcess, AttributeError, OSError):
        return None
    except Exception:
        return None


def _normalize_family_name(family: int | str | None) -> str | None:
    if family is None:
        return None

    if isinstance(family, str):
        normalized = family.strip().upper()
        if normalized in {'AF_INET', 'INET', 'IPv4', 'INET4'}:
            return 'IPv4'
        if normalized in {'AF_INET6', 'INET6', 'IPv6', 'INET46'}:
            return 'IPv6'
        if normalized in {'AF_LINK', 'MAC', 'LINK'}:
            return 'MAC'
        return normalized

    mapping = {
        getattr(socket, 'AF_INET', None): 'IPv4',
        getattr(socket, 'AF_INET6', None): 'IPv6',
        getattr(socket, 'AF_LINK', None): 'MAC',
        getattr(psutil, 'AF_LINK', None): 'MAC',
    }
    return mapping.get(family)
