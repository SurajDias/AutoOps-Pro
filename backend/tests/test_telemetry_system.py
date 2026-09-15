from fastapi.testclient import TestClient

from app.main import app
from app.routes import telemetry as telemetry_route


EXPECTED_FIELDS = {
    'os_name',
    'os_release',
    'os_version',
    'kernel_version',
    'architecture',
    'hostname',
    'cpu_logical_cores',
    'total_memory_bytes',
    'available_memory_bytes',
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
            'total_memory_bytes': None,
            'available_memory_bytes': None,
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


def test_get_system_telemetry_does_not_expose_environment_details():
    with TestClient(app) as client:
        payload = client.get('/telemetry/system').json()

    payload_text = str(payload).lower()
    for secret_label in ['path', 'home', 'token', 'secret', 'api_key', 'password']:
        assert secret_label not in payload_text
