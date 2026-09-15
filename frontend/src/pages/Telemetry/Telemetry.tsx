import { useState } from 'react';
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
import type { SystemTelemetry } from '../../services/api';

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

export default function Telemetry() {
  // Page is a UI-only shell for Phase 9A. No backend calls are made yet.
  const [telemetry] = useState<SystemTelemetry | null>(null);
  const [loading] = useState<boolean>(false);
  const [error] = useState<string | null>(null);

  const systemFields = [
    { label: 'OS', value: telemetry?.os_name ?? 'Unavailable' },
    { label: 'Version / release', value: telemetry?.os_release ?? telemetry?.os_version ?? 'Unavailable' },
    { label: 'Kernel', value: telemetry?.kernel_version ?? 'Unavailable' },
    { label: 'Architecture', value: telemetry?.architecture ?? 'Unavailable' },
    { label: 'Hostname', value: telemetry?.hostname ?? 'Unavailable' },
    { label: 'CPU logical cores', value: telemetry?.cpu_logical_cores == null ? 'Unavailable' : String(telemetry.cpu_logical_cores) },
    { label: 'Total memory', value: formatBytes(telemetry?.total_memory_bytes ?? null) },
    { label: 'Available memory', value: formatBytes(telemetry?.available_memory_bytes ?? null) },
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
                  {title === 'System Overview' ? (loading ? 'Loading' : telemetry ? 'Live' : 'Idle') : 'Idle'}
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
                        disabled
                        title="Telemetry backend not connected"
                        className="inline-flex w-fit items-center rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary/30 cursor-not-allowed"
                      >
                        Retry (awaiting backend)
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
                The System Overview section is populated from the local machine via the backend telemetry endpoint. The remaining sections are placeholders until their corresponding backend collectors are available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
