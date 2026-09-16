import { Activity, AlertTriangle, Clock3, Cpu, HardDrive, Network, ShieldAlert } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import type {
  IncidentTelemetrySnapshot as IncidentTelemetrySnapshotData,
  TelemetryNetworkInterface,
  TelemetryRiskSignal,
  TelemetrySystemSummary,
} from '../../services/api';

const unavailable = 'Unavailable';

function formatBytes(bytes: number | null | undefined) {
  if (bytes == null || !Number.isFinite(bytes)) return unavailable;

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatDuration(seconds: number | null | undefined) {
  if (seconds == null || !Number.isFinite(seconds)) return unavailable;

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(' ') : `${totalSeconds}s`;
}

function formatNumber(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? unavailable : value.toLocaleString();
}

function formatPercentage(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? unavailable : `${value.toFixed(1)}%`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return unavailable;
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? unavailable : timestamp.toLocaleString();
}

function formatBoolean(value: boolean | null | undefined) {
  if (value == null) return unavailable;
  return value ? 'Yes' : 'No';
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-xs text-white">{value}</p>
    </div>
  );
}

function SystemSummary({ system }: { system: TelemetrySystemSummary }) {
  return (
    <section className="rounded-xl border border-white/[.06] bg-background/30 p-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">System summary</h3>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Operating system" value={[system.os_name, system.os_release].filter(Boolean).join(' ') || unavailable} />
        <Field label="Architecture" value={system.architecture || unavailable} />
        <Field label="Logical / physical cores" value={`${formatNumber(system.cpu_logical_cores)} / ${formatNumber(system.cpu_physical_cores)}`} />
        <Field label="Memory usage" value={formatPercentage(system.memory_usage_percent)} />
        <Field label="Total memory" value={formatBytes(system.total_memory_bytes)} />
        <Field label="Uptime" value={formatDuration(system.uptime_seconds)} />
      </div>
    </section>
  );
}

function NetworkSummary({ interfaces }: { interfaces: TelemetryNetworkInterface[] }) {
  return (
    <section className="rounded-xl border border-white/[.06] bg-background/30 p-4">
      <div className="flex items-center gap-2">
        <Network className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Network interfaces</h3>
      </div>
      {interfaces.length === 0 ? (
        <p className="mt-4 text-xs text-text-muted">No interface summaries recorded.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {interfaces.map((networkInterface, index) => (
            <div key={`${networkInterface.name || 'interface'}-${index}`} className="grid gap-3 rounded-lg border border-white/[.05] bg-surface/50 p-3 sm:grid-cols-5">
              <Field label="Interface" value={networkInterface.name || unavailable} />
              <Field label="Up" value={formatBoolean(networkInterface.is_up)} />
              <Field label="Speed" value={networkInterface.speed_mbps == null ? unavailable : `${formatNumber(networkInterface.speed_mbps)} Mbps`} />
              <Field label="MTU" value={formatNumber(networkInterface.mtu)} />
              <Field label="Address count" value={formatNumber(networkInterface.address_count)} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function RiskSignal({ signal, index }: { signal: TelemetryRiskSignal; index: number }) {
  const severity = signal.severity?.toUpperCase();
  const variant = severity === 'HIGH' ? 'critical' : severity === 'MEDIUM' ? 'high' : severity === 'LOW' ? 'info' : 'neutral';

  return (
    <div className="rounded-lg border border-white/[.06] bg-background/30 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-white">{signal.title || signal.signal_id || `Risk signal ${index + 1}`}</p>
          {signal.signal_id && <p className="mt-1 text-[10px] uppercase tracking-wider text-text-muted">{signal.signal_id}</p>}
        </div>
        <Badge variant={variant} dot={false}>{severity || 'INFO'}</Badge>
      </div>
      {signal.description && <p className="mt-3 text-xs text-text-muted">{signal.description}</p>}
      {signal.evidence && <p className="mt-2 text-[11px] text-white">{signal.evidence}</p>}
      {signal.recommendation && <p className="mt-2 text-[11px] text-primary">{signal.recommendation}</p>}
    </div>
  );
}

export default function IncidentTelemetrySnapshot({ telemetry_snapshot }: { telemetry_snapshot?: IncidentTelemetrySnapshotData | null }) {
  if (telemetry_snapshot == null) return null;

  const system = telemetry_snapshot.system || {};
  const interfaces = telemetry_snapshot.network_interfaces || [];
  const listeningPorts = telemetry_snapshot.listening_ports || {};
  const processes = telemetry_snapshot.processes || {};
  const riskSignals = telemetry_snapshot.risk_signals || [];
  const limitations = telemetry_snapshot.limitations || [];

  return (
    <Card className="bg-surface/80" noPadding>
      <CardHeader className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle>Incident-time telemetry</CardTitle>
            </div>
            <CardDescription className="mt-1">Safe local summary persisted when this incident was created.</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-text-muted">
            <Clock3 className="h-3.5 w-3.5" />
            {formatTimestamp(telemetry_snapshot.captured_at)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        <SystemSummary system={system} />

        <div className="grid gap-4 lg:grid-cols-2">
          <NetworkSummary interfaces={interfaces} />
          <section className="rounded-xl border border-white/[.06] bg-background/30 p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Listening ports</h3>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Field label="Total" value={formatNumber(listeningPorts.count)} />
              <Field label="TCP" value={formatNumber(listeningPorts.tcp_count)} />
              <Field label="UDP" value={formatNumber(listeningPorts.udp_count)} />
              <Field label="Beyond loopback" value={formatNumber(listeningPorts.non_loopback_count)} />
            </div>
          </section>
        </div>

        <section className="rounded-xl border border-white/[.06] bg-background/30 p-4">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Process summary</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Process count" value={formatNumber(processes.count)} />
            <Field label="Max CPU" value={formatPercentage(processes.max_cpu_percent)} />
            <Field label="Max memory" value={formatPercentage(processes.max_memory_percent)} />
            <Field label="Total resident memory" value={formatBytes(processes.total_memory_rss_bytes)} />
            <Field label="CPU data available" value={formatBoolean(processes.cpu_percent_available)} />
            <Field label="At collector limit" value={formatBoolean(processes.at_collector_limit)} />
            <Field label="Process statuses" value={Object.entries(processes.status_counts || {}).map(([status, count]) => `${status}: ${formatNumber(count)}`).join(' · ') || unavailable} />
          </div>
        </section>

        <section className="rounded-xl border border-white/[.06] bg-background/30 p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Risk signals</h3>
          </div>
          {riskSignals.length === 0 ? <p className="mt-4 text-xs text-text-muted">No risk signals recorded.</p> : <div className="mt-4 space-y-3">{riskSignals.map((signal, index) => <RiskSignal key={`${signal.signal_id || 'signal'}-${index}`} signal={signal} index={index} />)}</div>}
        </section>

        <section className="rounded-xl border border-white/[.06] bg-background/30 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white">Collection limitations</h3>
          </div>
          {limitations.length === 0 ? <p className="mt-4 text-xs text-text-muted">No collection limitations recorded.</p> : <ul className="mt-4 space-y-2 text-xs text-text-muted">{limitations.map((limitation, index) => <li key={`${limitation}-${index}`} className="flex gap-2"><span className="text-primary">•</span><span>{limitation}</span></li>)}</ul>}
        </section>
      </CardContent>
    </Card>
  );
}
