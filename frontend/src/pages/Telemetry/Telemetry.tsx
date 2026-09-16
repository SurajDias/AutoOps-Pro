import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Monitor,
  Radio,
  Server,
  ShieldAlert,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { api, type ListeningPort, type NetworkInterface, type ProcessTelemetry, type RiskSignal, type SystemTelemetry } from '../../services/api';

type TelemetrySection = {
  title: string;
  summary: string;
  icon: LucideIcon;
  tone: string;
};

const sections: TelemetrySection[] = [
  {
    title: 'System Overview',
    summary: 'High-level local host health snapshot.',
    icon: Monitor,
    tone: 'border-primary/25 bg-primary/5 text-primary',
  },
  {
    title: 'Network Interfaces',
    summary: 'Local adapter and link state details.',
    icon: Wifi,
    tone: 'border-cyan-400/25 bg-cyan-500/5 text-cyan-300',
  },
  {
    title: 'Listening Ports',
    summary: 'Local service endpoints and socket activity.',
    icon: Radio,
    tone: 'border-violet-400/25 bg-violet-500/5 text-violet-300',
  },
  {
    title: 'Processes',
    summary: 'Local runtime processes and service activity.',
    icon: Server,
    tone: 'border-amber-400/25 bg-amber-500/5 text-amber-300',
  },
  {
    title: 'Risk Signals',
    summary: 'Local warning indicators and notable diagnostics.',
    icon: ShieldAlert,
    tone: 'border-rose-400/25 bg-rose-500/5 text-rose-300',
  },
];

function EmptyTelemetryState() {
  return (
    <div className="mt-5 rounded-2xl border border-dashed border-white/[0.08] bg-elevated/35 p-5 min-h-[140px] flex flex-col justify-center">
      <p className="text-sm font-semibold text-white">No telemetry collected yet</p>
      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        Data will appear when the corresponding backend endpoint is available.
      </p>
    </div>
  );
}

function formatBytes(bytes: number | null) {
  if (bytes == null) {
    return 'Unavailable';
  }

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

function formatUptime(seconds: number | null) {
  if (seconds == null) {
    return 'Unavailable';
  }

  const totalSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [
    days > 0 ? `${days}d` : null,
    hours > 0 ? `${hours}h` : null,
    minutes > 0 ? `${minutes}m` : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) {
    return `${totalSeconds}s`;
  }

  return parts.join(' ');
}

function formatBootTime(value: string | null) {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Unavailable';
  }

  return parsed.toLocaleString();
}

function formatNetworkBytes(bytes: number | null) {
  return bytes == null ? '—' : formatBytes(bytes);
}

function formatCount(value: number | null) {
  return value == null ? '—' : value.toLocaleString();
}

function formatPercentage(value: number | null) {
  return value == null ? '—' : `${value.toFixed(1)}%`;
}

function NetworkInterfacesContent({
  interfaces,
  loading,
  error,
  onRetry,
}: {
  interfaces: NetworkInterface[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="flex min-h-[110px] items-center justify-center text-xs text-text-muted">Loading local network interfaces…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center gap-3">
        <p className="text-sm font-semibold text-white">Unable to load network interfaces</p>
        <p className="text-xs leading-relaxed text-text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex w-fit items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20">Retry</button>
      </div>
    );
  }

  if (!interfaces?.length) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center">
        <p className="text-sm font-semibold text-white">No network interfaces available</p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">No local network interfaces were reported by this machine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">Network interfaces detected on this machine.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.14em] text-text-muted">
            <tr><th className="pb-3 pr-4 font-medium">Interface</th><th className="pb-3 pr-4 font-medium">Status & addresses</th><th className="pb-3 pr-4 font-medium">Traffic</th><th className="pb-3 font-medium">Packets / errors</th></tr>
          </thead>
          <tbody>
            {interfaces.map((networkInterface) => {
              const addresses = networkInterface.addresses.filter(({ family }) => family !== 'MAC');
              const hasErrorsOrDrops = [networkInterface.errors_sent, networkInterface.errors_received, networkInterface.drops_sent, networkInterface.drops_received].some((value) => value != null);
              return (
                <tr key={networkInterface.name} className="border-b border-white/[0.06] align-top last:border-0">
                  <td className="py-3 pr-4"><p className="font-semibold text-white">{networkInterface.name}</p><p className="mt-1 text-text-muted">MAC: {networkInterface.mac_address ?? '—'}</p></td>
                  <td className="py-3 pr-4"><p className={networkInterface.is_up === true ? 'text-emerald-300' : networkInterface.is_up === false ? 'text-rose-300' : 'text-text-muted'}>{networkInterface.is_up === true ? 'Up' : networkInterface.is_up === false ? 'Down' : '—'}</p><div className="mt-1 space-y-1 text-text-muted">{addresses.length ? addresses.map((address, index) => <p key={`${address.family}-${address.address}-${index}`}>{address.family ?? 'Address'}: {address.address ?? '—'}{address.netmask ? ` / ${address.netmask}` : ''}{address.broadcast ? ` · broadcast ${address.broadcast}` : ''}</p>) : <p>Addresses: —</p>}</div></td>
                  <td className="py-3 pr-4 text-text-muted"><p>Sent: <span className="text-white">{formatNetworkBytes(networkInterface.bytes_sent)}</span></p><p className="mt-1">Received: <span className="text-white">{formatNetworkBytes(networkInterface.bytes_received)}</span></p></td>
                  <td className="py-3 text-text-muted"><p>Sent / received: <span className="text-white">{formatCount(networkInterface.packets_sent)} / {formatCount(networkInterface.packets_received)}</span></p>{hasErrorsOrDrops && <p className="mt-1">Errors S/R: <span className="text-white">{formatCount(networkInterface.errors_sent)} / {formatCount(networkInterface.errors_received)}</span> · Drops S/R: <span className="text-white">{formatCount(networkInterface.drops_sent)} / {formatCount(networkInterface.drops_received)}</span></p>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListeningPortsContent({
  ports,
  loading,
  error,
  onRetry,
}: {
  ports: ListeningPort[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="flex min-h-[110px] items-center justify-center text-xs text-text-muted">Loading local listening ports…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center gap-3">
        <p className="text-sm font-semibold text-white">Unable to load listening ports</p>
        <p className="text-xs leading-relaxed text-text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex w-fit items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20">Retry</button>
      </div>
    );
  }

  if (!ports?.length) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center">
        <p className="text-sm font-semibold text-white">No listening sockets available</p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">No local listening TCP or UDP sockets were reported by this machine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">Listening sockets detected on this machine.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.14em] text-text-muted">
            <tr><th className="pb-3 pr-4 font-medium">Protocol</th><th className="pb-3 pr-4 font-medium">Family</th><th className="pb-3 pr-4 font-medium">Local address</th><th className="pb-3 pr-4 font-medium">Port</th><th className="pb-3 font-medium">Status</th></tr>
          </thead>
          <tbody>
            {ports.map((port) => (
              <tr key={`${port.protocol}-${port.address_family}-${port.local_address}-${port.local_port}`} className="border-b border-white/[0.06] last:border-0">
                <td className="py-3 pr-4"><span className={port.protocol === 'TCP' ? 'rounded-full border border-primary/30 bg-primary/10 px-2 py-1 font-semibold text-primary' : 'rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-300'}>{port.protocol}</span></td>
                <td className="py-3 pr-4 text-text-muted">{port.address_family ?? '—'}</td>
                <td className="py-3 pr-4 font-medium text-white">{port.local_address ?? '—'}</td>
                <td className="py-3 pr-4 text-white">{port.local_port ?? '—'}</td>
                <td className="py-3 text-text-muted">{port.status ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProcessesContent({
  processes,
  loading,
  error,
  onRetry,
}: {
  processes: ProcessTelemetry[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="flex min-h-[110px] items-center justify-center text-xs text-text-muted">Loading local processes…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center gap-3">
        <p className="text-sm font-semibold text-white">Unable to load processes</p>
        <p className="text-xs leading-relaxed text-text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex w-fit items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20">Retry</button>
      </div>
    );
  }

  if (!processes?.length) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center">
        <p className="text-sm font-semibold text-white">No processes available</p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">No local processes were reported by this machine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">Processes detected on this machine.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.14em] text-text-muted">
            <tr><th className="pb-3 pr-4 font-medium">PID</th><th className="pb-3 pr-4 font-medium">Process name</th><th className="pb-3 pr-4 font-medium">Status</th><th className="pb-3 pr-4 font-medium">CPU</th><th className="pb-3 pr-4 font-medium">Memory</th><th className="pb-3 pr-4 font-medium">RSS</th><th className="pb-3 pr-4 font-medium">Threads</th><th className="pb-3 font-medium">Creation time</th></tr>
          </thead>
          <tbody>
            {processes.map((process) => (
              <tr key={process.pid} className="border-b border-white/[0.06] align-top last:border-0">
                <td className="py-3 pr-4 font-medium text-white">{formatCount(process.pid)}</td>
                <td className="py-3 pr-4 font-semibold text-white">{process.name ?? '—'}</td>
                <td className="py-3 pr-4 text-text-muted">{process.status ?? '—'}</td>
                <td className="py-3 pr-4 text-text-muted">{formatPercentage(process.cpu_percent)}</td>
                <td className="py-3 pr-4 text-text-muted">{formatPercentage(process.memory_percent)}</td>
                <td className="py-3 pr-4 text-text-muted">{process.memory_rss_bytes == null ? '—' : formatBytes(process.memory_rss_bytes)}</td>
                <td className="py-3 pr-4 text-text-muted">{formatCount(process.thread_count)}</td>
                <td className="py-3 text-text-muted">{process.creation_time == null ? '—' : formatBootTime(process.creation_time)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskSignalsContent({
  signals,
  loading,
  error,
  onRetry,
}: {
  signals: RiskSignal[] | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading) {
    return <div className="flex min-h-[110px] items-center justify-center text-xs text-text-muted">Loading local risk signals…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center gap-3">
        <p className="text-sm font-semibold text-white">Unable to load risk signals</p>
        <p className="text-xs leading-relaxed text-text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex w-fit items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20">Retry</button>
      </div>
    );
  }

  if (!signals?.length) {
    return (
      <div className="flex min-h-[110px] flex-col justify-center">
        <p className="text-sm font-semibold text-white">No active risk signals</p>
        <p className="mt-2 text-xs leading-relaxed text-text-muted">No informational risk signals were detected on this machine.</p>
      </div>
    );
  }

  const severityClasses: Record<RiskSignal['severity'], string> = {
    HIGH: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
    MEDIUM: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
    LOW: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
    INFO: 'border-white/[0.12] bg-white/[0.04] text-text-muted',
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted">Risk signals detected on this machine.</p>
      <div className="space-y-3">
        {signals.map((signal) => (
          <article key={signal.signal_id} className="rounded-xl border border-white/[0.08] bg-surface/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-white">{signal.title}</h3>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[0.12em] ${severityClasses[signal.severity]}`} aria-label={`Severity ${signal.severity}`}>
                {signal.severity}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">{signal.description}</p>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <p className="text-text-muted"><span className="font-semibold text-white">Evidence:</span> {signal.evidence}</p>
              {signal.recommendation && <p className="text-text-muted"><span className="font-semibold text-white">Recommendation:</span> {signal.recommendation}</p>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Telemetry() {
  const [telemetry, setTelemetry] = useState<SystemTelemetry | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [networkInterfaces, setNetworkInterfaces] = useState<NetworkInterface[] | null>(null);
  const [networkLoading, setNetworkLoading] = useState<boolean>(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [listeningPorts, setListeningPorts] = useState<ListeningPort[] | null>(null);
  const [listeningPortsLoading, setListeningPortsLoading] = useState<boolean>(true);
  const [listeningPortsError, setListeningPortsError] = useState<string | null>(null);
  const [processes, setProcesses] = useState<ProcessTelemetry[] | null>(null);
  const [processesLoading, setProcessesLoading] = useState<boolean>(true);
  const [processesError, setProcessesError] = useState<string | null>(null);
  const [riskSignals, setRiskSignals] = useState<RiskSignal[] | null>(null);
  const [riskSignalsLoading, setRiskSignalsLoading] = useState<boolean>(true);
  const [riskSignalsError, setRiskSignalsError] = useState<string | null>(null);

  const loadTelemetry = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSystemTelemetry(signal);
      setTelemetry(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setTelemetry(null);
      setError(err instanceof Error ? err.message : 'Unable to load local host telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadListeningPorts = useCallback(async (signal?: AbortSignal) => {
    setListeningPortsLoading(true);
    setListeningPortsError(null);
    try {
      setListeningPorts(await api.getListeningPorts(signal));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setListeningPorts(null);
      setListeningPortsError(err instanceof Error ? err.message : 'Unable to load local listening ports.');
    } finally {
      setListeningPortsLoading(false);
    }
  }, []);

  const loadNetworkInterfaces = useCallback(async (signal?: AbortSignal) => {
    setNetworkLoading(true);
    setNetworkError(null);
    try {
      setNetworkInterfaces(await api.getNetworkInterfaces(signal));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setNetworkInterfaces(null);
      setNetworkError(err instanceof Error ? err.message : 'Unable to load local network interfaces.');
    } finally {
      setNetworkLoading(false);
    }
  }, []);

  const loadProcesses = useCallback(async (signal?: AbortSignal) => {
    setProcessesLoading(true);
    setProcessesError(null);
    try {
      setProcesses(await api.getProcesses(signal));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setProcesses(null);
      setProcessesError(err instanceof Error ? err.message : 'Unable to load local processes.');
    } finally {
      setProcessesLoading(false);
    }
  }, []);

  const loadRiskSignals = useCallback(async (signal?: AbortSignal) => {
    setRiskSignalsLoading(true);
    setRiskSignalsError(null);
    try {
      setRiskSignals(await api.getRiskSignals(signal));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setRiskSignals(null);
      setRiskSignalsError(err instanceof Error ? err.message : 'Unable to load local risk signals.');
    } finally {
      setRiskSignalsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadTelemetry(controller.signal);
    return () => controller.abort();
  }, [loadTelemetry]);

  useEffect(() => {
    const controller = new AbortController();
    void loadNetworkInterfaces(controller.signal);
    return () => controller.abort();
  }, [loadNetworkInterfaces]);

  useEffect(() => {
    const controller = new AbortController();
    void loadListeningPorts(controller.signal);
    return () => controller.abort();
  }, [loadListeningPorts]);

  useEffect(() => {
    const controller = new AbortController();
    void loadProcesses(controller.signal);
    return () => controller.abort();
  }, [loadProcesses]);

  useEffect(() => {
    const controller = new AbortController();
    void loadRiskSignals(controller.signal);
    return () => controller.abort();
  }, [loadRiskSignals]);

  const systemFields = [
    { label: 'OS', value: telemetry?.os_name ?? 'Unavailable' },
    { label: 'Version / release', value: telemetry?.os_release ?? telemetry?.os_version ?? 'Unavailable' },
    { label: 'Kernel', value: telemetry?.kernel_version ?? 'Unavailable' },
    { label: 'Architecture', value: telemetry?.architecture ?? 'Unavailable' },
    { label: 'Hostname', value: telemetry?.hostname ?? 'Unavailable' },
    { label: 'CPU logical cores', value: telemetry?.cpu_logical_cores == null ? 'Unavailable' : String(telemetry.cpu_logical_cores) },
    { label: 'CPU physical cores', value: telemetry?.cpu_physical_cores == null ? 'Unavailable' : String(telemetry.cpu_physical_cores) },
    { label: 'Total memory', value: formatBytes(telemetry?.total_memory_bytes ?? null) },
    { label: 'Available memory', value: formatBytes(telemetry?.available_memory_bytes ?? null) },
    { label: 'Used memory', value: formatBytes(telemetry?.used_memory_bytes ?? null) },
    { label: 'Memory usage', value: telemetry?.memory_usage_percent == null ? 'Unavailable' : `${telemetry.memory_usage_percent.toFixed(1)}%` },
    { label: 'Uptime', value: formatUptime(telemetry?.uptime_seconds ?? null) },
    { label: 'Boot time', value: formatBootTime(telemetry?.boot_time ?? null) },
  ];

  return (
    <div className="p-8 bg-background min-h-screen text-text-primary">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-primary">Local host telemetry</p>
            <h1 className="mt-3 text-2xl font-bold font-heading text-white tracking-tight md:text-3xl">
              Local host telemetry & diagnostics
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
              Diagnostics for this machine only. This page is for local system and network inspection and does not scan remote hosts or the public internet.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-3 py-2 text-[11px] font-semibold text-primary">
            <Activity className="h-4 w-4" />
            {loading ? 'Collection pending' : telemetry ? 'Local host data' : 'No local data'}
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          {sections.map(({ title, summary, icon: Icon, tone }, index) => (
            <motion.section
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-white/[0.08] bg-surface/85 p-5 shadow-glass"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-[11px] text-text-muted">{summary}</p>
                  </div>
                </div>

                <div className="rounded-full border border-white/[0.08] bg-elevated/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-text-muted">
                  {title === 'System Overview' ? (loading ? 'Loading' : telemetry ? 'Live' : 'Idle') : title === 'Network Interfaces' ? (networkLoading ? 'Loading' : networkInterfaces ? 'Live' : 'Idle') : title === 'Listening Ports' ? (listeningPortsLoading ? 'Loading' : listeningPorts ? 'Live' : 'Idle') : title === 'Processes' ? (processesLoading ? 'Loading' : processes ? 'Live' : 'Idle') : title === 'Risk Signals' ? (riskSignalsLoading ? 'Loading' : riskSignals ? 'Live' : 'Idle') : 'Idle'}
                </div>
              </div>

              {title === 'System Overview' ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-elevated/35 p-5 min-h-[140px]">
                  {loading ? (
                    <div className="flex min-h-[110px] items-center justify-center text-xs text-text-muted">
                      Loading local system telemetry…
                    </div>
                        ) : error ? (
                    <div className="flex min-h-[110px] flex-col justify-center gap-3">
                      <p className="text-sm font-semibold text-white">Unable to load local telemetry</p>
                      <p className="text-xs leading-relaxed text-text-muted">{error}</p>
                      <button
                        type="button"
                        onClick={() => void loadTelemetry()}
                        className="inline-flex w-fit items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        Retry
                      </button>
                    </div>
                  ) : telemetry ? (
                    <>
                      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-3">
                        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Local host</div>
                        <div className="text-[10px] text-text-muted">
                          Updated: {telemetry.collected_at ? new Date(telemetry.collected_at).toLocaleString() : 'Not yet available'}
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {systemFields.map(({ label, value }) => (
                          <div key={label} className="rounded-xl border border-white/[0.06] bg-surface/50 p-3">
                            <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted">{label}</div>
                            <div className="mt-2 text-sm font-medium text-white break-words">{value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <EmptyTelemetryState />
                  )}
                </div>
              ) : title === 'Network Interfaces' ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-elevated/35 p-5 min-h-[140px]">
                  <NetworkInterfacesContent interfaces={networkInterfaces} loading={networkLoading} error={networkError} onRetry={() => void loadNetworkInterfaces()} />
                </div>
              ) : title === 'Listening Ports' ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-elevated/35 p-5 min-h-[140px]">
                  <ListeningPortsContent ports={listeningPorts} loading={listeningPortsLoading} error={listeningPortsError} onRetry={() => void loadListeningPorts()} />
                </div>
              ) : title === 'Processes' ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-elevated/35 p-5 min-h-[140px]">
                  <ProcessesContent processes={processes} loading={processesLoading} error={processesError} onRetry={() => void loadProcesses()} />
                </div>
              ) : title === 'Risk Signals' ? (
                <div className="mt-5 rounded-2xl border border-white/[0.08] bg-elevated/35 p-5 min-h-[140px]">
                  <RiskSignalsContent signals={riskSignals} loading={riskSignalsLoading} error={riskSignalsError} onRetry={() => void loadRiskSignals()} />
                </div>
              ) : (
                <EmptyTelemetryState />
              )}
            </motion.section>
          ))}
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-elevated/30 p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-warning/20 bg-warning/5 text-warning">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Local telemetry shell ready</p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                System Overview, Network Interfaces, Listening Ports, Processes, and Risk Signals are populated from this machine via local backend telemetry endpoints. No remote hosts or external services are queried.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
