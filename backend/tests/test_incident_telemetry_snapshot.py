"""Focused coverage for immutable incident-time telemetry snapshots."""

import json
from types import SimpleNamespace

from app.api import incident_api
from app.database.models import Incident
from app.schemas.incident import IncidentCreate
from app.services import telemetry_service


SAFE_SNAPSHOT_KEYS = {
    'captured_at', 'system', 'network_interfaces', 'listening_ports',
    'processes', 'risk_signals', 'limitations',
}


class FakeSession:
    def __init__(self):
        self.record = None

    def add(self, record):
        self.record = record

    def commit(self):
        self.record.id = 41

    def refresh(self, record):
        return record

    def rollback(self):
        return None


def _incident_create():
    return IncidentCreate(
        service_name='api',
        severity='High',
        anomaly_type='local overload',
        root_cause='High CPU',
        recommendation='Investigate local workload',
    )


def test_incident_creation_persists_telemetry_snapshot(monkeypatch):
    snapshot = {
        'captured_at': '2026-09-16T10:00:00+00:00',
        'system': {'memory_usage_percent': 88.0},
        'network_interfaces': [],
        'listening_ports': {'count': 0, 'tcp_count': 0, 'udp_count': 0, 'non_loopback_count': 0},
        'processes': {'count': 2, 'status_counts': {'running': 2}},
        'risk_signals': [],
        'limitations': [],
    }
    monkeypatch.setattr(incident_api, 'collect_incident_telemetry_snapshot', lambda: snapshot)
    db = FakeSession()

    result = incident_api.create_incident(_incident_create(), db)

    assert result == {'message': 'Incident saved successfully', 'incident_id': 41}
    assert db.record.telemetry_snapshot == snapshot
    assert json.loads(json.dumps(db.record.telemetry_snapshot)) == snapshot


def test_incident_creation_succeeds_when_telemetry_collector_partially_fails(monkeypatch):
    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', lambda: {'memory_usage_percent': 10.0})
    monkeypatch.setattr(telemetry_service, 'get_network_interfaces_telemetry', lambda: (_ for _ in ()).throw(RuntimeError('permission denied')))
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: [])
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: [])
    db = FakeSession()

    result = incident_api.create_incident(_incident_create(), db)

    assert result['incident_id'] == 41
    assert db.record.telemetry_snapshot['limitations'] == ['network interfaces collector unavailable']
    assert db.record.telemetry_snapshot['system']['memory_usage_percent'] == 10.0


def test_snapshot_contains_only_safe_summary_fields(monkeypatch):
    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', lambda: {
        'os_name': 'Linux', 'os_release': 'test', 'architecture': 'x86_64',
        'cpu_logical_cores': 4, 'total_memory_bytes': 1000,
        'memory_usage_percent': 20.0, 'hostname': 'must-not-be-captured',
        'environment': 'secret', 'path': '/private/path',
    })
    monkeypatch.setattr(telemetry_service, 'get_network_interfaces_telemetry', lambda: [{
        'name': 'eth0', 'is_up': True, 'addresses': [{'address': '192.0.2.10'}],
        'remote_endpoint': '203.0.113.10', 'path': '/private/path',
    }])
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: [{
        'protocol': 'TCP', 'local_address': '0.0.0.0', 'local_port': 8080,
        'remote_endpoint': '203.0.113.10', 'pid': 123,
    }])
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: [{
        'pid': 123, 'name': 'worker', 'status': 'running', 'cpu_percent': 4.0,
        'memory_percent': 1.0, 'memory_rss_bytes': 100, 'cmdline': 'secret --token=x',
        'executable_path': '/private/bin/worker', 'environment': {'TOKEN': 'x'},
    }])

    snapshot = telemetry_service.collect_incident_telemetry_snapshot()
    serialized = json.dumps(snapshot).lower()

    assert set(snapshot) == SAFE_SNAPSHOT_KEYS
    assert snapshot['network_interfaces'][0] == {
        'name': 'eth0', 'is_up': True, 'speed_mbps': None, 'mtu': None, 'address_count': 1,
    }
    assert snapshot['listening_ports']['non_loopback_count'] == 1
    assert snapshot['processes']['count'] == 1
    for forbidden in ('cmdline', 'environment', 'executable_path', 'remote_endpoint', 'token', 'secret', 'private/path', 'pid'):
        assert forbidden not in serialized


def test_existing_incident_can_keep_null_telemetry_snapshot():
    incident = Incident(
        service_name='legacy',
        severity='Low',
        anomaly_type='legacy',
        root_cause='legacy cause',
        recommendation='monitor',
    )

    assert incident.telemetry_snapshot is None


def test_incident_detail_serializes_persisted_telemetry_snapshot():
    incident = Incident(
        id=7,
        service_name='api',
        severity='High',
        anomaly_type='cpu',
        root_cause='High CPU',
        recommendation='Investigate',
        telemetry_snapshot={
            'captured_at': '2026-09-16T10:00:00+00:00',
            'system': {}, 'network_interfaces': [],
            'listening_ports': {'count': 0}, 'processes': {'count': 0},
            'risk_signals': [], 'limitations': [],
        },
    )

    class Query:
        def filter(self, *_args):
            return self

        def first(self):
            return incident

    response = incident_api.get_incident(7, SimpleNamespace(query=lambda *_args: Query()))

    assert response['telemetry_snapshot']['captured_at'] == '2026-09-16T10:00:00+00:00'
