import React from 'react';
import CardSwap from '../CardSwap/CardSwap';

/* ─────────────────────────────────────────────────────────────────────────────
   Shared primitives
───────────────────────────────────────────────────────────────────────────── */
const s = {
  fontFamily: 'Inter, system-ui, sans-serif',
};

/** Window chrome title bar — identical to real macOS-style header */
const Chrome: React.FC<{ title: string; dot?: string }> = ({ title, dot = '#38BDF8' }) => (
  <div style={{
    height: 42,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(5,12,24,0.7)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px',
    gap: 10,
    flexShrink: 0,
  }}>
    {/* Title */}
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}`, marginRight: 7, flexShrink: 0 }} />
      <span style={{ ...s, fontSize: 12, fontWeight: 500, color: 'rgba(148,163,184,0.85)', letterSpacing: '0.02em' }}>
        {title}
      </span>
    </div>
  </div>
);

/** Small stat box */
const Stat: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = '#38BDF8' }) => (
  <div style={{ background: 'rgba(5,12,24,0.65)', border: '1px solid rgba(56,189,248,0.09)', borderRadius: 9, padding: '9px 11px' }}>
    <div style={{ ...s, fontSize: 9, color: 'rgba(148,163,184,0.65)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
    <div style={{ ...s, fontSize: 14, fontWeight: 700, color }}>{value}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 1 — Live Telemetry
───────────────────────────────────────────────────────────────────────────── */
const LiveTelemetryCard: React.FC = () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Chrome title="Live Telemetry · AutoOps Pro" dot="#10B981" />
    <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', display: 'inline-block' }} />
          <span style={{ ...s, fontSize: 11, fontWeight: 600, color: '#10B981', letterSpacing: '0.05em', textTransform: 'uppercase' }}>All Systems Operational</span>
        </div>
        <span style={{ ...s, fontSize: 9, color: 'rgba(148,163,184,0.5)', fontFamily: 'monospace' }}>LIVE</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <Stat label="CPU Usage"  value="42%"   color="#38BDF8" />
        <Stat label="Memory"     value="16 GB"  color="#818CF8" />
        <Stat label="Latency"    value="12 ms"  color="#10B981" />
        <Stat label="Uptime"     value="99.9%"  color="#10B981" />
      </div>
      <div style={{ flex: 1, background: 'rgba(5,12,24,0.55)', borderRadius: 9, border: '1px solid rgba(56,189,248,0.07)', padding: '7px 9px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ ...s, fontSize: 9, color: 'rgba(148,163,184,0.5)', marginBottom: 5 }}>CPU · Last 60s</div>
        <svg viewBox="0 0 220 48" style={{ width: '100%', height: 38 }}>
          <defs>
            <linearGradient id="ltg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#38BDF8" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d="M0,42 C15,35 30,20 50,26 S85,14 110,16 S148,9 175,11 S205,7 220,9 L220,48 L0,48 Z" fill="url(#ltg)" />
          <path d="M0,42 C15,35 30,20 50,26 S85,14 110,16 S148,9 175,11 S205,7 220,9" fill="none" stroke="#38BDF8" strokeWidth={1.5} />
        </svg>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 2 — Anomaly Detection
───────────────────────────────────────────────────────────────────────────── */
const AnomalyDetectionCard: React.FC = () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Chrome title="Anomaly Detection · AutoOps Pro" dot="#EF4444" />
    <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444', display: 'inline-block' }} />
        <span style={{ ...s, fontSize: 12, fontWeight: 700, color: '#EF4444', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Anomaly Detected</span>
        <span style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, padding: '2px 7px', ...s, fontSize: 9, color: '#EF4444', fontWeight: 700 }}>HIGH</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <Stat label="Anomaly Score"  value="0.94"   color="#EF4444" />
        <Stat label="Active Alerts"  value="3"      color="#F59E0B" />
        <Stat label="Confidence"     value="94%"    color="#38BDF8" />
        <Stat label="AI Status"      value="Active" color="#10B981" />
      </div>
      <div style={{ flex: 1, background: 'rgba(5,12,24,0.55)', borderRadius: 9, border: '1px solid rgba(239,68,68,0.1)', padding: '7px 9px' }}>
        <div style={{ ...s, fontSize: 9, color: 'rgba(148,163,184,0.5)', marginBottom: 4 }}>Anomaly Signal · Recent Window</div>
        <svg viewBox="0 0 220 42" style={{ width: '100%', height: 36 }}>
          <defs>
            <linearGradient id="adg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d="M0,33 C30,32 60,33 90,32 L100,32" fill="none" stroke="#38BDF8" strokeWidth={1.1} opacity={0.45} />
          <path d="M100,32 L110,7 L120,32" fill="none" stroke="#EF4444" strokeWidth={1.8} />
          <path d="M120,32 C150,32 180,33 220,32" fill="none" stroke="#38BDF8" strokeWidth={1.1} opacity={0.45} />
          <path d="M100,32 L110,7 L120,32 L120,42 L100,42 Z" fill="url(#adg)" />
          <circle cx={110} cy={7} r={3} fill="#EF4444" />
          <circle cx={110} cy={7} r={6} fill="none" stroke="#EF4444" strokeWidth={1} opacity={0.35} />
        </svg>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 3 — Root Cause Analysis
───────────────────────────────────────────────────────────────────────────── */
const RCANode: React.FC<{ label: string; status?: 'ok' | 'warn' | 'err' }> = ({ label, status = 'ok' }) => {
  const color = status === 'err' ? '#EF4444' : status === 'warn' ? '#F59E0B' : '#10B981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
      <div style={{ padding: '5px 12px', background: 'rgba(5,12,24,0.7)', border: `1px solid ${color}33`, borderRadius: 7, ...s, fontSize: 11, color: '#E2E8F0', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

const RootCauseCard: React.FC = () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Chrome title="Root Cause Analysis · AutoOps Pro" dot="#A78BFA" />
    <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'flex-start' }}>
        <RCANode label="API Gateway"     status="ok" />
        <div style={{ width: 2, height: 12, background: 'rgba(56,189,248,0.22)', marginLeft: 2 }} />
        <RCANode label="Auth Service"    status="ok" />
        <div style={{ width: 2, height: 12, background: 'rgba(56,189,248,0.22)', marginLeft: 2 }} />
        <RCANode label="Payment Service" status="warn" />
        <div style={{ width: 2, height: 12, background: 'rgba(239,68,68,0.4)', marginLeft: 2 }} />
        <RCANode label="Database"        status="err" />
      </div>
      <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 9, padding: '11px 13px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
        <div style={{ ...s, fontSize: 9, color: 'rgba(239,68,68,0.7)', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>🔍 Root Cause Identified</div>
        <div style={{ ...s, fontSize: 12, color: '#F1F5F9', fontWeight: 600, lineHeight: 1.5 }}>Database Connection Pool Exhaustion</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ ...s, fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>AI Confidence</div>
          <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '91%', background: 'linear-gradient(90deg,#38BDF8,#818CF8)', borderRadius: 4 }} />
          </div>
          <div style={{ ...s, fontSize: 11, fontWeight: 700, color: '#38BDF8', fontFamily: 'monospace' }}>91%</div>
        </div>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 4 — Predictive Intelligence
───────────────────────────────────────────────────────────────────────────── */
const PredictiveCard: React.FC = () => (
  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
    <Chrome title="Predictive Intelligence · AutoOps Pro" dot="#F59E0B" />
    <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
      <div style={{ background: 'rgba(5,12,24,0.65)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 11, padding: '13px 15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <span style={{ ...s, fontSize: 11, color: 'rgba(148,163,184,0.8)' }}>Failure Risk</span>
          <span style={{ ...s, fontSize: 22, fontWeight: 800, color: '#F59E0B' }}>78%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '78%', background: 'linear-gradient(90deg,#F59E0B,#EF4444)', borderRadius: 5 }} />
        </div>
      </div>
      <div style={{ flex: 1, background: 'rgba(5,12,24,0.55)', borderRadius: 9, border: '1px solid rgba(56,189,248,0.07)', padding: '7px 9px' }}>
        <div style={{ ...s, fontSize: 9, color: 'rgba(148,163,184,0.5)', marginBottom: 4 }}>Trend · Projected</div>
        <svg viewBox="0 0 220 44" style={{ width: '100%', height: 36 }}>
          <defs>
            <linearGradient id="pig" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d="M0,40 C30,38 60,34 90,28 C120,22 150,14 180,8 S202,5 220,3 L220,44 L0,44 Z" fill="url(#pig)" />
          <path d="M0,40 C30,38 60,34 90,28 C120,22 150,14 180,8 S202,5 220,3" fill="none" stroke="#F59E0B" strokeWidth={1.5} />
          <path d="M180,8 L220,3" fill="none" stroke="#EF4444" strokeWidth={1.5} strokeDasharray="4,3" />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { label: 'Predicted Event',  value: 'High latency — Payment Service', color: '#F59E0B' },
          { label: 'Estimated Time',   value: '≈ 18 minutes',                  color: '#EF4444' },
        ].map(r => (
          <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ ...s, fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>{r.label}</span>
            <span style={{ ...s, fontSize: 11, fontWeight: 600, color: r.color }}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   CARD 5 — AI Recommendations
───────────────────────────────────────────────────────────────────────────── */
const RecommendationsCard: React.FC = () => {
  const actions = [
    { label: 'Scale Payment Service replicas',    done: true  },
    { label: 'Increase DB connection pool size',   done: true  },
    { label: 'Restart unhealthy Auth Service pod', done: true  },
    { label: 'Enable circuit-breaker on Gateway',  done: false },
  ];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Chrome title="AI Recommendations · AutoOps Pro" dot="#38BDF8" />
      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#1E3A5F,#0F172A)', border: '1px solid rgba(56,189,248,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🤖</div>
          <div>
            <div style={{ ...s, fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>AutoOps AI Engine</div>
            <div style={{ ...s, fontSize: 10, color: 'rgba(56,189,248,0.8)' }}>4 actions generated</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ ...s, fontSize: 10, color: 'rgba(148,163,184,0.6)' }}>Confidence</span>
            <span style={{ ...s, fontSize: 13, fontWeight: 800, color: '#38BDF8' }}>96%</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          {actions.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 9,
              background: a.done ? 'rgba(16,185,129,0.07)' : 'rgba(5,12,24,0.55)',
              border: `1px solid ${a.done ? 'rgba(16,185,129,0.22)' : 'rgba(56,189,248,0.09)'}`,
              borderRadius: 9, padding: '8px 11px',
            }}>
              <div style={{ width: 17, height: 17, borderRadius: '50%', background: a.done ? '#10B981' : 'rgba(56,189,248,0.12)', border: `1px solid ${a.done ? '#10B981' : 'rgba(56,189,248,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, color: '#fff', fontWeight: 700 }}>
                {a.done ? '✓' : '○'}
              </div>
              <span style={{ ...s, fontSize: 11, color: a.done ? '#94A3B8' : '#CBD5E1', lineHeight: 1.4 }}>{a.label}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '96%', background: 'linear-gradient(90deg,#06B6D4,#38BDF8)', borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   WorkspaceCardSwap — just the animated card stack
   Layout (left-copy / right-stack) is handled by LandingPage.
───────────────────────────────────────────────────────────────────────────── */
export const WorkspaceCardSwap: React.FC = () => (
  <CardSwap
    cardDistance={52}
    verticalDistance={52}
    delay={5000}
    pauseOnHover={true}
    skewAmount={4}
    easing="elastic"
  >
    <LiveTelemetryCard />
    <AnomalyDetectionCard />
    <RootCauseCard />
    <PredictiveCard />
    <RecommendationsCard />
  </CardSwap>
);
