import asyncio
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app
from app.routes import telemetry as telemetry_route
from app.schemas.telemetry import RiskSignal
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

NETWORK_INTERFACE_FIELDS = {
    'name', 'is_up', 'speed_mbps', 'mtu', 'addresses', 'mac_address',
    'bytes_sent', 'bytes_received', 'packets_sent', 'packets_received',
    'errors_sent', 'errors_received', 'drops_sent', 'drops_received',
}

LISTENING_PORT_FIELDS = {
    'protocol', 'address_family', 'local_address', 'local_port', 'status',
}

PROCESS_FIELDS = {
    'pid', 'name', 'status', 'username', 'cpu_percent', 'memory_percent',
    'memory_rss_bytes', 'thread_count', 'creation_time',
}

RISK_SIGNAL_FIELDS = {
    'signal_id', 'severity', 'title', 'description', 'evidence', 'recommendation',
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
        assert set(interface) == NETWORK_INTERFACE_FIELDS
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


def test_get_network_interfaces_returns_expected_shape():
    with TestClient(app) as client:
        response = client.get('/telemetry/network-interfaces')

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    if payload:
        interface = payload[0]
        assert set(interface) == NETWORK_INTERFACE_FIELDS
        assert isinstance(interface['name'], str)
        assert interface['is_up'] is None or isinstance(interface['is_up'], bool)
        assert isinstance(interface['addresses'], list)
        for address in interface['addresses']:
            assert isinstance(address, dict)
            assert 'family' in address
            assert 'address' in address


def test_get_network_interfaces_handles_missing_optional_values(monkeypatch):
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
        response = client.get('/telemetry/network-interfaces')

    assert response.status_code == 200
    payload = response.json()
    assert payload[0]['speed_mbps'] is None
    assert payload[0]['mac_address'] is None
    assert payload[0]['addresses'][0]['netmask'] is None
    assert payload[0]['bytes_sent'] is None
    assert payload[0]['errors_sent'] is None
    assert payload[0]['drops_received'] is None


def test_get_network_interfaces_multiple_interfaces(monkeypatch):
    monkeypatch.setattr(
        'app.routes.telemetry.get_network_interfaces_telemetry',
        lambda: [
            {
                'name': 'eth0',
                'is_up': True,
                'speed_mbps': 1000,
                'mtu': 1500,
                'addresses': [{
                    'family': 'IPv4',
                    'address': '192.168.1.100',
                    'netmask': '255.255.255.0',
                    'broadcast': '192.168.1.255',
                    'ptp': None,
                }],
                'mac_address': '00:11:22:33:44:55',
                'bytes_sent': 1000000,
                'bytes_received': 2000000,
                'packets_sent': 10000,
                'packets_received': 20000,
            },
            {
                'name': 'lo',
                'is_up': True,
                'speed_mbps': None,
                'mtu': 65536,
                'addresses': [{
                    'family': 'IPv4',
                    'address': '127.0.0.1',
                    'netmask': '255.0.0.0',
                    'broadcast': None,
                    'ptp': None,
                }],
                'mac_address': None,
                'bytes_sent': 50000,
                'bytes_received': 50000,
                'packets_sent': 500,
                'packets_received': 500,
            },
        ],
    )

    with TestClient(app) as client:
        response = client.get('/telemetry/network-interfaces')

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 2
    assert payload[0]['name'] == 'eth0'
    assert payload[0]['is_up'] is True
    assert payload[0]['mac_address'] == '00:11:22:33:44:55'
    assert payload[1]['name'] == 'lo'
    assert payload[1]['mac_address'] is None


def test_get_network_interfaces_does_not_expose_sensitive_data():
    with TestClient(app) as client:
        payload = client.get('/telemetry/network-interfaces').json()

    payload_text = str(payload).lower()
    for secret_label in ['path', 'home', 'token', 'secret', 'api_key', 'password', 'command', 'process']:
        assert secret_label not in payload_text


def test_get_network_interfaces_returns_empty_list(monkeypatch):
    monkeypatch.setattr('app.routes.telemetry.get_network_interfaces_telemetry', lambda: [])

    with TestClient(app) as client:
        response = client.get('/telemetry/network-interfaces')

    assert response.status_code == 200
    assert response.json() == []


def test_network_interface_service_handles_missing_statistics(monkeypatch):
    ipv4 = SimpleNamespace(
        family=telemetry_service.socket.AF_INET,
        address='192.0.2.10',
        netmask=None,
        broadcast=None,
        ptp=None,
    )
    monkeypatch.setattr(telemetry_service.psutil, 'net_if_addrs', lambda: {'adapter-1': [ipv4]})
    monkeypatch.setattr(telemetry_service.psutil, 'net_if_stats', lambda: {})
    monkeypatch.setattr(telemetry_service.psutil, 'net_io_counters', lambda pernic: {})

    payload = telemetry_service.get_network_interfaces_telemetry()

    assert payload == [{
        'name': 'adapter-1',
        'is_up': None,
        'speed_mbps': None,
        'mtu': None,
        'addresses': [{
            'family': 'IPv4',
            'address': '192.0.2.10',
            'netmask': None,
            'broadcast': None,
            'ptp': None,
        }],
        'mac_address': None,
        'bytes_sent': None,
        'bytes_received': None,
        'packets_sent': None,
        'packets_received': None,
        'errors_sent': None,
        'errors_received': None,
        'drops_sent': None,
        'drops_received': None,
    }]


def test_network_interface_service_returns_empty_results(monkeypatch):
    monkeypatch.setattr(telemetry_service.psutil, 'net_if_addrs', lambda: {})
    monkeypatch.setattr(telemetry_service.psutil, 'net_if_stats', lambda: {})
    monkeypatch.setattr(telemetry_service.psutil, 'net_io_counters', lambda pernic: {})

    assert telemetry_service.get_network_interfaces_telemetry() == []


def test_listening_ports_filters_tcp_and_udp_and_sorts_results(monkeypatch):
    connections = [
        SimpleNamespace(family=telemetry_service.socket.AF_INET6, type=telemetry_service.socket.SOCK_DGRAM, laddr=('::', 53), raddr=(), status='NONE', pid=42),
        SimpleNamespace(family=telemetry_service.socket.AF_INET, type=telemetry_service.socket.SOCK_STREAM, laddr=('127.0.0.1', 8080), raddr=(), status='LISTEN', pid=99),
        SimpleNamespace(family=telemetry_service.socket.AF_INET, type=telemetry_service.socket.SOCK_STREAM, laddr=('127.0.0.1', 50000), raddr=('192.0.2.2', 443), status='ESTABLISHED', pid=7),
        SimpleNamespace(family=telemetry_service.socket.AF_INET, type=telemetry_service.socket.SOCK_DGRAM, laddr=('127.0.0.1', 9999), raddr=('192.0.2.2', 53), status='NONE', pid=8),
        SimpleNamespace(family=telemetry_service.socket.AF_INET, type=telemetry_service.socket.SOCK_STREAM, laddr=('0.0.0.0', 443), raddr=(), status='LISTEN', pid=11),
    ]
    monkeypatch.setattr(telemetry_service.psutil, 'net_connections', lambda kind: connections)

    payload = telemetry_service.get_listening_ports_telemetry()

    assert payload == [
        {'protocol': 'TCP', 'address_family': 'IPv4', 'local_address': '0.0.0.0', 'local_port': 443, 'status': 'LISTEN'},
        {'protocol': 'TCP', 'address_family': 'IPv4', 'local_address': '127.0.0.1', 'local_port': 8080, 'status': 'LISTEN'},
        {'protocol': 'UDP', 'address_family': 'IPv6', 'local_address': '::', 'local_port': 53, 'status': None},
    ]


def test_listening_ports_normalizes_missing_optional_values(monkeypatch):
    monkeypatch.setattr(
        telemetry_service.psutil,
        'net_connections',
        lambda kind: [SimpleNamespace(family=None, type=telemetry_service.socket.SOCK_STREAM, laddr=(None, 8080), raddr=(), status='LISTEN')],
    )

    assert telemetry_service.get_listening_ports_telemetry() == [{
        'protocol': 'TCP',
        'address_family': None,
        'local_address': None,
        'local_port': 8080,
        'status': 'LISTEN',
    }]


def test_listening_ports_handles_access_denied_and_empty_results(monkeypatch):
    def raise_access_denied(kind):
        raise telemetry_service.psutil.AccessDenied()

    monkeypatch.setattr(telemetry_service.psutil, 'net_connections', raise_access_denied)
    assert telemetry_service.get_listening_ports_telemetry() == []

    monkeypatch.setattr(telemetry_service.psutil, 'net_connections', lambda kind: [])
    assert telemetry_service.get_listening_ports_telemetry() == []


def test_listening_ports_endpoint_returns_safe_expected_shape(monkeypatch):
    monkeypatch.setattr(
        telemetry_route,
        'get_listening_ports_telemetry',
        lambda: [{'protocol': 'TCP', 'address_family': 'IPv4', 'local_address': '127.0.0.1', 'local_port': 3000, 'status': 'LISTEN'}],
    )

    ports = asyncio.run(telemetry_route.get_local_listening_ports())

    assert len(ports) == 1
    payload = ports[0].model_dump()
    assert set(payload) == LISTENING_PORT_FIELDS
    assert payload == {'protocol': 'TCP', 'address_family': 'IPv4', 'local_address': '127.0.0.1', 'local_port': 3000, 'status': 'LISTEN'}
    payload_text = str(payload).lower()
    for sensitive_label in ['pid', 'process', 'command', 'path', 'token', 'secret', 'password']:
        assert sensitive_label not in payload_text


class FakeProcess:
    def __init__(self, pid, name='worker', status='running', username='operator', cpu=0.0, memory=0.0, rss=1024, threads=1, created=1_700_000_000):
        self.pid = pid
        self._name = name
        self._status = status
        self._username = username
        self._cpu = cpu
        self._memory = memory
        self._rss = rss
        self._threads = threads
        self._created = created

    def name(self):
        return self._name

    def status(self):
        return self._status

    def username(self):
        return self._username

    def cpu_percent(self):
        return self._cpu

    def memory_percent(self):
        return self._memory

    def memory_info(self):
        return SimpleNamespace(rss=self._rss)

    def num_threads(self):
        return self._threads

    def create_time(self):
        return self._created


def test_processes_endpoint_returns_safe_expected_shape(monkeypatch):
    monkeypatch.setattr(
        telemetry_route,
        'get_processes_telemetry',
        lambda: [telemetry_service.get_processes_telemetry()[0]],
    )
    monkeypatch.setattr(telemetry_service.psutil, 'process_iter', lambda: [FakeProcess(42)])

    with TestClient(app) as client:
        response = client.get('/telemetry/processes')

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) == 1
    assert set(payload[0]) == PROCESS_FIELDS
    assert payload[0]['pid'] == 42
    assert payload[0]['name'] == 'worker'
    assert payload[0]['memory_rss_bytes'] == 1024
    assert isinstance(payload[0]['creation_time'], str)


def test_processes_normalize_missing_optional_values(monkeypatch):
    class MissingProcess(FakeProcess):
        def username(self):
            raise telemetry_service.psutil.AccessDenied()

        def memory_info(self):
            raise telemetry_service.psutil.NoSuchProcess(self.pid)

        def cpu_percent(self):
            raise telemetry_service.psutil.ZombieProcess(self.pid)

        def memory_percent(self):
            return None

        def num_threads(self):
            raise AttributeError('unsupported')

        def create_time(self):
            return None

    monkeypatch.setattr(telemetry_service.psutil, 'process_iter', lambda: [MissingProcess(7)])

    assert telemetry_service.get_processes_telemetry() == [{
        'pid': 7,
        'name': 'worker',
        'status': 'running',
        'username': None,
        'cpu_percent': None,
        'memory_percent': None,
        'memory_rss_bytes': None,
        'thread_count': None,
        'creation_time': None,
    }]


def test_processes_skip_inaccessible_processes_without_failing(monkeypatch):
    class InaccessibleProcess:
        @property
        def pid(self):
            raise telemetry_service.psutil.NoSuchProcess(99)

    monkeypatch.setattr(telemetry_service.psutil, 'process_iter', lambda: [InaccessibleProcess(), FakeProcess(2)])

    payload = telemetry_service.get_processes_telemetry()

    assert [process['pid'] for process in payload] == [2]


def test_processes_sort_deterministically_and_limit_response(monkeypatch):
    processes = [
        FakeProcess(3, name='beta', cpu=20, memory=1),
        FakeProcess(2, name='alpha', cpu=20, memory=1),
        FakeProcess(1, name='zeta', cpu=None, memory=None),
    ] + [FakeProcess(pid, name=f'worker-{pid}', cpu=0) for pid in range(4, 105)]
    monkeypatch.setattr(telemetry_service.psutil, 'process_iter', lambda: processes)

    payload = telemetry_service.get_processes_telemetry()

    assert len(payload) == telemetry_service.MAX_PROCESSES
    assert [process['pid'] for process in payload[:2]] == [2, 3]
    assert all(process['pid'] != 1 for process in payload)


def test_processes_do_not_expose_sensitive_data(monkeypatch):
    monkeypatch.setattr(telemetry_service.psutil, 'process_iter', lambda: [FakeProcess(1, name='safe-service')])

    payload = telemetry_service.get_processes_telemetry()
    payload_text = str(payload).lower()
    assert set(payload[0]) == PROCESS_FIELDS
    for sensitive_label in ['cmdline', 'exe', 'environ', 'open_files', 'connections', 'token', 'secret', 'password', 'path']:
        assert sensitive_label not in payload_text


def test_processes_return_empty_list(monkeypatch):
    monkeypatch.setattr(telemetry_service.psutil, 'process_iter', lambda: [])

    assert telemetry_service.get_processes_telemetry() == []


def _risk_system(memory_percent=20.0):
    return {'memory_usage_percent': memory_percent}


def _risk_processes(cpu_percent=10.0, count=1):
    return [{'cpu_percent': cpu_percent} for _ in range(count)]


def _risk_ports(address='127.0.0.1'):
    return [{'local_address': address}]


def test_risk_signals_endpoint_returns_strict_safe_schema(monkeypatch):
    monkeypatch.setattr(telemetry_route, 'get_risk_signals_telemetry', lambda: [{
        'signal_id': 'high-memory-utilization',
        'severity': 'MEDIUM',
        'title': 'High memory utilization',
        'description': 'Local memory utilization is elevated.',
        'evidence': 'Local memory utilization is 90.0%.',
        'recommendation': 'Review local applications using memory.',
    }])

    signals = asyncio.run(telemetry_route.get_local_risk_signals())

    assert len(signals) == 1
    payload = signals[0].model_dump()
    assert set(payload) == RISK_SIGNAL_FIELDS
    assert RiskSignal(**payload).severity == 'MEDIUM'
    assert not {'cmdline', 'environ', 'exe', 'path', 'remote_address', 'pid'} & set(payload)


def test_risk_signals_sort_by_severity_then_signal_id(monkeypatch):
    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', lambda: _risk_system(96.0))
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: _risk_processes(91.0, telemetry_service.MAX_PROCESSES))
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: _risk_ports('127.0.0.1'))

    payload = telemetry_service.get_risk_signals_telemetry()

    assert [signal['severity'] for signal in payload] == ['HIGH', 'HIGH', 'LOW']
    assert [signal['signal_id'] for signal in payload] == [
        'high-memory-utilization', 'high-process-cpu', 'high-process-count',
    ]


def test_risk_signals_thresholds_do_not_emit_below_limits(monkeypatch):
    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', lambda: _risk_system(84.9))
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: _risk_processes(74.9, telemetry_service.MAX_PROCESSES - 1))
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: _risk_ports('127.0.0.1'))

    assert telemetry_service.get_risk_signals_telemetry() == []


def test_risk_signals_handle_missing_values_without_noise(monkeypatch):
    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', lambda: {'memory_usage_percent': None})
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: [{'cpu_percent': None}, {}])
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: [{'local_address': None}])

    assert telemetry_service.get_risk_signals_telemetry() == []


def test_risk_signals_isolate_collector_failures(monkeypatch):
    def fail_system():
        raise telemetry_service.psutil.AccessDenied()

    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', fail_system)
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: _risk_processes(10.0))
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: _risk_ports('127.0.0.1'))

    payload = telemetry_service.get_risk_signals_telemetry()

    assert len(payload) == 1
    assert payload[0]['signal_id'] == 'telemetry-collection-limited'
    assert payload[0]['severity'] == 'INFO'
    assert 'system' in payload[0]['evidence']


def test_risk_signals_detect_non_loopback_listening_without_exposing_addresses(monkeypatch):
    monkeypatch.setattr(telemetry_service, 'get_system_telemetry', lambda: _risk_system())
    monkeypatch.setattr(telemetry_service, 'get_processes_telemetry', lambda: _risk_processes())
    monkeypatch.setattr(telemetry_service, 'get_listening_ports_telemetry', lambda: _risk_ports('::'))

    payload = telemetry_service.get_risk_signals_telemetry()

    assert [signal['signal_id'] for signal in payload] == ['non-loopback-listening']
    assert '::' not in str(payload)


def test_risk_signal_schema_rejects_unknown_severity():
    try:
        RiskSignal(
            signal_id='test',
            severity='CRITICAL',
            title='Test',
            description='Test',
            evidence='Test',
            recommendation=None,
        )
    except ValueError:
        pass
    else:
        raise AssertionError('RiskSignal accepted an unsupported severity')
