import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IncidentTelemetrySnapshot from './IncidentTelemetrySnapshot';
import type { IncidentTelemetrySnapshot as IncidentTelemetrySnapshotData } from '../../services/api';

const populatedSnapshot: IncidentTelemetrySnapshotData = {
  captured_at: '2026-09-16T10:00:00+00:00',
  system: {
    os_name: 'Linux',
    os_release: '6.8',
    architecture: 'x86_64',
    cpu_logical_cores: 8,
    cpu_physical_cores: 4,
    total_memory_bytes: 16 * 1024 ** 3,
    memory_usage_percent: 61.2,
    uptime_seconds: 90061,
  },
  network_interfaces: [
    { name: 'eth0', is_up: true, speed_mbps: 1000, mtu: 1500, address_count: 1 },
  ],
  listening_ports: { count: 4, tcp_count: 3, udp_count: 1, non_loopback_count: 2 },
  processes: {
    count: 25,
    status_counts: { running: 20, sleeping: 5 },
    cpu_percent_available: true,
    max_cpu_percent: 87.5,
    max_memory_percent: 12.4,
    total_memory_rss_bytes: 456789,
    at_collector_limit: false,
  },
  risk_signals: [{
    signal_id: 'high-memory-utilization',
    severity: 'MEDIUM',
    title: 'High memory utilization',
    description: 'Local memory utilization is elevated.',
    evidence: 'Local memory utilization is 61.2%.',
    recommendation: 'Review local applications using memory.',
  }],
  limitations: ['network interfaces collector unavailable'],
};

function fieldValue(label: string) {
  const labelElement = screen.getByText(label, { selector: 'p' });
  const field = labelElement.parentElement;
  if (!field) throw new Error(`Field not found: ${label}`);
  return within(field);
}

describe('IncidentTelemetrySnapshot', () => {
  it('renders nothing for null or undefined snapshots', () => {
    const { container, rerender } = render(<IncidentTelemetrySnapshot telemetry_snapshot={null} />);
    expect(container.firstChild).toBeNull();

    rerender(<IncidentTelemetrySnapshot />);
    expect(container.firstChild).toBeNull();
  });

  it('renders safely for an empty snapshot', () => {
    render(<IncidentTelemetrySnapshot telemetry_snapshot={{}} />);

    expect(screen.getByRole('heading', { name: 'Incident-time telemetry' })).toBeInTheDocument();
    expect(screen.getByText('No interface summaries recorded.')).toBeInTheDocument();
    expect(screen.getByText('No risk signals recorded.')).toBeInTheDocument();
    expect(screen.getByText('No collection limitations recorded.')).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  it('renders the populated system summary with formatted safe fields', () => {
    render(<IncidentTelemetrySnapshot telemetry_snapshot={populatedSnapshot} />);

    expect(screen.getByText('Linux 6.8')).toBeInTheDocument();
    expect(screen.getByText('x86_64')).toBeInTheDocument();
    expect(screen.getByText('8 / 4')).toBeInTheDocument();
    expect(screen.getByText('61.2%')).toBeInTheDocument();
    expect(screen.getByText('16 GB')).toBeInTheDocument();
    expect(screen.getByText('1d 1h 1m')).toBeInTheDocument();
    expect(screen.getByText('9/16/2026, 3:30:00 PM')).toBeInTheDocument();
  });

  it('renders network interface summaries safely', () => {
    render(<IncidentTelemetrySnapshot telemetry_snapshot={populatedSnapshot} />);

    expect(screen.getByText('eth0')).toBeInTheDocument();
    expect(screen.getByText('1,000 Mbps')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(fieldValue('Up').getByText('Yes')).toBeInTheDocument();
    expect(fieldValue('Address count').getByText('1')).toBeInTheDocument();
  });

  it('renders listening-port aggregate counts', () => {
    render(<IncidentTelemetrySnapshot telemetry_snapshot={populatedSnapshot} />);

    const portsHeading = screen.getByRole('heading', { name: 'Listening ports' });
    const portsSection = portsHeading.closest('section');
    expect(portsSection).not.toBeNull();
    expect(within(portsSection as HTMLElement).getByText('4')).toBeInTheDocument();
    expect(within(portsSection as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(portsSection as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(portsSection as HTMLElement).getByText('2')).toBeInTheDocument();
  });

  it('renders process aggregates and nullable metrics safely', () => {
    const nullableProcesses: IncidentTelemetrySnapshotData = {
      processes: {
        count: 2,
        status_counts: { sleeping: 2 },
        cpu_percent_available: false,
        max_cpu_percent: null,
        max_memory_percent: null,
        total_memory_rss_bytes: null,
        at_collector_limit: true,
      },
    };
    render(<IncidentTelemetrySnapshot telemetry_snapshot={nullableProcesses} />);

    expect(screen.getByText('Process count')).toBeInTheDocument();
    expect(fieldValue('Process count').getByText('2')).toBeInTheDocument();
    expect(fieldValue('CPU data available').getByText('No')).toBeInTheDocument();
    expect(fieldValue('At collector limit').getByText('Yes')).toBeInTheDocument();
    expect(fieldValue('Process statuses').getByText('sleeping: 2')).toBeInTheDocument();
    expect(fieldValue('Max CPU').getByText('Unavailable')).toBeInTheDocument();
    expect(fieldValue('Max memory').getByText('Unavailable')).toBeInTheDocument();
    expect(fieldValue('Total resident memory').getByText('Unavailable')).toBeInTheDocument();
  });

  it('renders risk signals and collection limitations', () => {
    render(<IncidentTelemetrySnapshot telemetry_snapshot={populatedSnapshot} />);

    expect(screen.getByText('High memory utilization')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('Local memory utilization is elevated.')).toBeInTheDocument();
    expect(screen.getByText('Local memory utilization is 61.2%.')).toBeInTheDocument();
    expect(screen.getByText('Review local applications using memory.')).toBeInTheDocument();
    expect(screen.getByText('network interfaces collector unavailable')).toBeInTheDocument();
  });

  it('does not render raw sensitive fields', () => {
    const snapshotWithSensitiveFields = {
      ...populatedSnapshot,
      system: {
        ...populatedSnapshot.system,
        hostname: 'host-secret.example',
        filesystem_path: '/private/ops',
        environment: 'TOKEN=secret-value',
      },
      network_interfaces: [{
        ...populatedSnapshot.network_interfaces?.[0],
        address: '192.0.2.10',
        remote_endpoint: '203.0.113.10',
      }],
      processes: {
        ...populatedSnapshot.processes,
        pid: 123,
        command_line: 'worker --token=secret-value',
        executable_path: '/private/bin/worker',
        environment: { TOKEN: 'secret-value' },
      },
      listening_ports: {
        ...populatedSnapshot.listening_ports,
        raw_ports: [{ local_address: '0.0.0.0', remote_endpoint: '203.0.113.10' }],
      },
    } as unknown as IncidentTelemetrySnapshotData;

    const { container } = render(<IncidentTelemetrySnapshot telemetry_snapshot={snapshotWithSensitiveFields} />);
    const rendered = container.textContent || '';

    for (const sensitiveValue of [
      'host-secret.example',
      '/private/ops',
      'TOKEN=secret-value',
      '192.0.2.10',
      '203.0.113.10',
      '123',
      'worker --token=secret-value',
      '/private/bin/worker',
      'raw_ports',
    ]) {
      expect(rendered).not.toContain(sensitiveValue);
    }
  });
});
