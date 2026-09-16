from __future__ import annotations

import platform
import socket
import time
import ipaddress
from math import isfinite
from datetime import datetime, timezone
from typing import Any, Callable

import psutil


MAX_PROCESSES = 100

# These thresholds are intentionally conservative and informational. They are
# evaluated against one local snapshot and do not represent incident criteria.
MEMORY_MEDIUM_THRESHOLD = 85.0
MEMORY_HIGH_THRESHOLD = 95.0
CPU_MEDIUM_THRESHOLD = 75.0
CPU_HIGH_THRESHOLD = 90.0
PROCESS_COUNT_SIGNAL_THRESHOLD = MAX_PROCESSES


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


def get_risk_signals_telemetry() -> list[dict[str, Any]]:
    """Derive explainable risk signals from one local telemetry snapshot."""
    collector_failures: list[str] = []

    system = _collect_risk_source('system', get_system_telemetry, collector_failures)
    processes = _collect_risk_source('processes', get_processes_telemetry, collector_failures)
    listening_ports = _collect_risk_source('listening ports', get_listening_ports_telemetry, collector_failures)
    return _build_risk_signals(system, processes, listening_ports, collector_failures)


def _build_risk_signals(
    system: Any,
    processes: Any,
    listening_ports: Any,
    collector_failures: list[str],
) -> list[dict[str, Any]]:
    signals: list[dict[str, Any]] = []

    if isinstance(system, dict):
        memory_percent = _optional_float(system.get('memory_usage_percent'))
        if memory_percent is not None and memory_percent >= MEMORY_MEDIUM_THRESHOLD:
            severity = 'HIGH' if memory_percent >= MEMORY_HIGH_THRESHOLD else 'MEDIUM'
            signals.append({
                'signal_id': 'high-memory-utilization',
                'severity': severity,
                'title': 'High memory utilization',
                'description': 'Local memory utilization is elevated in the current snapshot.',
                'evidence': f'Local memory utilization is {memory_percent:.1f}%.',
                'recommendation': 'Review local applications using memory if the condition persists.',
            })

    if isinstance(processes, list):
        cpu_values = [
            value for process in processes
            if isinstance(process, dict)
            for value in [_optional_float(process.get('cpu_percent'))]
            if value is not None
        ]
        if cpu_values:
            highest_cpu = max(cpu_values)
            if highest_cpu >= CPU_MEDIUM_THRESHOLD:
                severity = 'HIGH' if highest_cpu >= CPU_HIGH_THRESHOLD else 'MEDIUM'
                signals.append({
                    'signal_id': 'high-process-cpu',
                    'severity': severity,
                    'title': 'High process CPU utilization',
                    'description': 'At least one local process reported elevated CPU utilization.',
                    'evidence': f'The highest reported local process CPU utilization is {highest_cpu:.1f}%.',
                    'recommendation': 'Review local workload activity if elevated CPU usage persists.',
                })

        if len(processes) >= PROCESS_COUNT_SIGNAL_THRESHOLD:
            signals.append({
                'signal_id': 'high-process-count',
                'severity': 'LOW',
                'title': 'High local process count',
                'description': 'The bounded local process collector reached its configured result limit.',
                'evidence': f'At least {PROCESS_COUNT_SIGNAL_THRESHOLD} local processes were reported.',
                'recommendation': 'Review the local process list if this count is unexpected.',
            })

    if isinstance(listening_ports, list):
        non_loopback_count = sum(
            1 for port in listening_ports
            if isinstance(port, dict) and _is_non_loopback_address(port.get('local_address'))
        )
        if non_loopback_count:
            signals.append({
                'signal_id': 'non-loopback-listening',
                'severity': 'LOW',
                'title': 'Service listening beyond loopback',
                'description': 'One or more local listening sockets are bound beyond loopback.',
                'evidence': f'{non_loopback_count} local listening socket(s) are bound beyond loopback.',
                'recommendation': 'Confirm that locally exposed services are intentionally reachable on this host network.',
            })

    if collector_failures:
        collector_failures.sort()
        signals.append({
            'signal_id': 'telemetry-collection-limited',
            'severity': 'INFO',
            'title': 'Some telemetry is unavailable',
            'description': 'One or more local telemetry collectors could not provide a snapshot.',
            'evidence': f'Unavailable local collectors: {", ".join(collector_failures)}.',
            'recommendation': 'Review local permissions or collector availability before relying on a complete snapshot.',
        })

    severity_priority = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2, 'INFO': 3}
    return sorted(signals, key=lambda signal: (severity_priority[signal['severity']], signal['signal_id']))


def collect_incident_telemetry_snapshot() -> dict[str, Any]:
    """Collect one safe, JSON-serializable local snapshot for incident history."""
    captured_at = datetime.now(timezone.utc).isoformat()
    limitations: list[str] = []

    system = _collect_snapshot_source('system', get_system_telemetry, limitations)
    interfaces = _collect_snapshot_source('network interfaces', get_network_interfaces_telemetry, limitations)
    listening_ports = _collect_snapshot_source('listening ports', get_listening_ports_telemetry, limitations)
    processes = _collect_snapshot_source('processes', get_processes_telemetry, limitations)

    risk_signals = _build_risk_signals(system, processes, listening_ports, limitations)
    return {
        'captured_at': captured_at,
        'system': _snapshot_system_summary(system),
        'network_interfaces': _snapshot_network_summary(interfaces),
        'listening_ports': _snapshot_listening_ports_summary(listening_ports),
        'processes': _snapshot_process_summary(processes),
        'risk_signals': risk_signals,
        'limitations': sorted(set(limitations)),
    }


def _collect_snapshot_source(name: str, collector: Callable[[], Any], limitations: list[str]) -> Any:
    try:
        value = collector()
    except Exception:
        limitations.append(f'{name} collector unavailable')
        return None
    if value is None:
        limitations.append(f'{name} collector returned no data')
    return value


def _snapshot_system_summary(system: Any) -> dict[str, Any]:
    if not isinstance(system, dict):
        return {}
    fields = (
        'os_name', 'os_release', 'architecture', 'cpu_logical_cores',
        'cpu_physical_cores', 'total_memory_bytes', 'memory_usage_percent',
        'uptime_seconds',
    )
    return {field: system.get(field) for field in fields if system.get(field) is not None}


def _snapshot_network_summary(interfaces: Any) -> list[dict[str, Any]]:
    if not isinstance(interfaces, list):
        return []
    summary = []
    for interface in interfaces:
        if not isinstance(interface, dict):
            continue
        summary.append({
            'name': _optional_string(interface.get('name')),
            'is_up': interface.get('is_up') if isinstance(interface.get('is_up'), bool) else None,
            'speed_mbps': _optional_int(interface.get('speed_mbps')),
            'mtu': _optional_int(interface.get('mtu')),
            'address_count': len(interface.get('addresses') or []) if isinstance(interface.get('addresses'), list) else 0,
        })
    return summary


def _snapshot_listening_ports_summary(listening_ports: Any) -> dict[str, int]:
    ports = listening_ports if isinstance(listening_ports, list) else []
    tcp_count = sum(1 for port in ports if isinstance(port, dict) and port.get('protocol') == 'TCP')
    udp_count = sum(1 for port in ports if isinstance(port, dict) and port.get('protocol') == 'UDP')
    non_loopback_count = sum(
        1 for port in ports
        if isinstance(port, dict) and _is_non_loopback_address(port.get('local_address'))
    )
    return {
        'count': len(ports),
        'tcp_count': tcp_count,
        'udp_count': udp_count,
        'non_loopback_count': non_loopback_count,
    }


def _snapshot_process_summary(processes: Any) -> dict[str, Any]:
    records = processes if isinstance(processes, list) else []
    status_counts: dict[str, int] = {}
    cpu_values: list[float] = []
    memory_values: list[float] = []
    total_rss = 0
    rss_available = False

    for process in records:
        if not isinstance(process, dict):
            continue
        status = _optional_string(process.get('status'))
        if status:
            status_counts[status] = status_counts.get(status, 0) + 1
        cpu = _optional_float(process.get('cpu_percent'))
        if cpu is not None:
            cpu_values.append(cpu)
        memory = _optional_float(process.get('memory_percent'))
        if memory is not None:
            memory_values.append(memory)
        rss = _optional_int(process.get('memory_rss_bytes'))
        if rss is not None:
            total_rss += rss
            rss_available = True

    return {
        'count': len(records),
        'status_counts': dict(sorted(status_counts.items())),
        'cpu_percent_available': bool(cpu_values),
        'max_cpu_percent': max(cpu_values) if cpu_values else None,
        'max_memory_percent': max(memory_values) if memory_values else None,
        'total_memory_rss_bytes': total_rss if rss_available else None,
        'at_collector_limit': len(records) >= MAX_PROCESSES,
    }


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


def _collect_risk_source(name: str, collector: Callable[[], Any], failures: list[str]) -> Any:
    try:
        return collector()
    except Exception:
        failures.append(name)
        return None


def _is_non_loopback_address(address: Any) -> bool:
    if not isinstance(address, str) or not address.strip():
        return False
    try:
        return not ipaddress.ip_address(address.strip()).is_loopback
    except ValueError:
        return False


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
