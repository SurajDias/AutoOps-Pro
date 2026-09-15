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

export default function Telemetry() {
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
            Collection pending
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
                  Idle
                </div>
              </div>

              <EmptyTelemetryState />
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
                This interface is intentionally empty until the corresponding backend telemetry endpoints are available. No current values are displayed for system metrics, interfaces, ports, processes, or risk signals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
