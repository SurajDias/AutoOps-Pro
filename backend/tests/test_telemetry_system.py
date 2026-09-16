from fastapi.testclient import TestClient

from app.main import app
from app.routes import telemetry as telemetry_route
from app.services import telemetry_service


EXPECTED_FIELDS = {
    'os_name',
    'os_release',
    'os_version',
    'kernel_version',
    'architecture',
    'hostname',
    'cpu_logical_cores',
    'cpu_physical_cores',
    'total_memory_bytes',
    'available_memory_bytes',
    'used_memory_bytes',
    'memory_usage_percent',
    'uptime_seconds',
    'boot_time',
    'collected_at',
}


def test_get_system_telemetry_returns_expected_shape():
    with TestClient(app) as client:
        response = client.get('/telemetry/system')

    assert response.status_code == 200
    payload = response.json()
    assert set(payload) == EXPECTED_FIELDS
    assert isinstance(payload['collected_at'], str)
    assert payload['os_name'] is None or isinstance(payload['os_name'], str)
    assert payload['hostname'] is None or isinstance(payload['hostname'], str)
    assert payload.get('cpu_physical_cores') is None or isinstance(payload.get('cpu_physical_cores'), int)
    assert payload.get('used_memory_bytes') is None or isinstance(payload.get('used_memory_bytes'), int)
    assert payload.get('memory_usage_percent') is None or isinstance(payload.get('memory_usage_percent'), float)


def test_get_system_telemetry_handles_missing_optional_values(monkeypatch):
    monkeypatch.setattr(
        telemetry_route,
        'get_system_telemetry',
        lambda: {
            'os_name': 'Linux',
            'os_release': None,
            'os_version': None,
            'kernel_version': None,
            'architecture': 'x86_64',
            'hostname': None,
            'cpu_logical_cores': 8,
            'cpu_physical_cores': None,
            'total_memory_bytes': None,
            'available_memory_bytes': None,
            'used_memory_bytes': None,
            'memory_usage_percent': None,
            'uptime_seconds': None,
            'boot_time': None,
            'collected_at': '2026-09-15T00:00:00+00:00',
        },
    )

    with TestClient(app) as client:
        response = client.get('/telemetry/system')

    assert response.status_code == 200
    payload = response.json()
    assert payload['os_release'] is None
    assert payload['hostname'] is None
    assert payload['available_memory_bytes'] is None
    assert payload['uptime_seconds'] is None


def test_system_service_normalizes_unavailable_optional_values(monkeypatch):
    monkeypatch.setattr(telemetry_service.psutil, 'cpu_count', lambda logical: None)
    monkeypatch.setattr(telemetry_service.psutil, 'virtual_memory', lambda: None)
    monkeypatch.setattr(telemetry_service.psutil, 'boot_time', lambda: None)

    payload = telemetry_service.get_system_telemetry()

    assert payload['cpu_logical_cores'] is None
    assert payload['cpu_physical_cores'] is None
    assert payload['total_memory_bytes'] is None
    assert payload['available_memory_bytes'] is None
    assert payload['used_memory_bytes'] is None
    assert payload['memory_usage_percent'] is None
    assert payload['boot_time'] is None
    assert payload['uptime_seconds'] is None
    assert payload['collected_at'].tzinfo is not None


def test_get_system_telemetry_does_not_expose_environment_details():
    with TestClient(app) as client:
        payload = client.get('/telemetry/system').json()

    payload_text = str(payload).lower()
    for secret_label in ['path', 'home', 'token', 'secret', 'api_key', 'password']:
        assert secret_label not in payload_text


def test_get_network_telemetry_returns_expected_shape():
    with TestClient(app) as client:
        response = client.get('/telemetry/network')

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    if payload:
        interface = payload[0]
        assert isinstance(interface['name'], str)
        assert isinstance(interface['is_up'], bool)
        assert isinstance(interface['addresses'], list)
        for address in interface['addresses']:
            assert isinstance(address, dict)
            assert 'family' in address
            assert 'address' in address


def test_get_network_telemetry_handles_missing_optional_values(monkeypatch):
    monkeypatch.setattr(
        'app.routes.telemetry.get_network_interfaces_telemetry',
        lambda: [{
            'name': 'eth0',
            'is_up': True,
            'speed_mbps': None,
            'mtu': None,
            'addresses': [{
                'family': 'IPv4',
                'address': '10.0.0.2',
                'netmask': None,
                'broadcast': None,
                'ptp': None,
            }],
            'mac_address': None,
            'bytes_sent': None,
            'bytes_received': None,
            'packets_sent': None,
            'packets_received': None,
        }],
    )

    with TestClient(app) as client:
        response = client.get('/telemetry/network')

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]['speed_mbps'] is None
    assert payload[0]['mac_address'] is None
    assert payload[0]['addresses'][0]['netmask'] is None
    assert payload[0]['bytes_sent'] is None


def test_get_network_telemetry_does_not_expose_sensitive_data():
    with TestClient(app) as client:
        payload = client.get('/telemetry/network').json()

    payload_text = str(payload).lower()
    for secret_label in ['path', 'home', 'token', 'secret', 'api_key', 'password', 'command', 'process']:
        assert secret_label not in payload_text
