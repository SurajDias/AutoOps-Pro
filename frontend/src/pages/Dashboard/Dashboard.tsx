import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, BrainCircuit, Database, RefreshCw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BorderGlow from '../../components/ui/BorderGlow';
import { api, formatConfidence, type DemoScenario, type Incident, type IncidentStatistics, type MetricHistoryRow, type Metrics, type MetricsMode, type SystemStatus } from '../../services/api';

const Beams = lazy(() => import('../../components/ui/Beams'));

const statusTone = (status?: string) => status === 'critical' || status === 'Critical' ? 'text-white border-white/20 bg-white/10' : status === 'warning' || status === 'Warning' ? 'text-accent border-accent/20 bg-accent/10' : 'text-primary border-primary/20 bg-primary/10';
const metricTone = (value: number, warning: number, critical: number) => value >= critical ? 'text-white' : value >= warning ? 'text-accent' : 'text-primary';
const friendlyError = (error: unknown) => error instanceof Error ? error.message : 'Unable to load the operational command center.';

export default function Dashboard() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<MetricsMode | null>(null);
  const [scenarios, setScenarios] = useState<Record<string, DemoScenario>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [history, setHistory] = useState<MetricHistoryRow[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentStats, setIncidentStats] = useState<IncidentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (signal?: AbortSignal, showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [modeData, scenarioData, metricData, statusData, historyData] = await Promise.all([
        api.getMetricsMode(signal), api.getDemoScenarios(signal), api.getMetrics(signal), api.getSystemStatus(signal), api.getMetricsHistory(24, undefined, signal),
      ]);
      const [incidentsResult, statisticsResult] = await Promise.allSettled([api.getIncidentHistory(signal), api.getIncidentStatistics(signal)]);
      setMode(modeData.mode); setScenarios(scenarioData); setMetrics(metricData); setStatus(statusData); setHistory(historyData);
      if (incidentsResult.status === 'fulfilled') setIncidents(incidentsResult.value.slice(0, 5));
      if (statisticsResult.status === 'fulfilled') setIncidentStats(statisticsResult.value);
      setLastUpdated(new Date()); setError(null); setStale(false);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setStale(true); setError(friendlyError(requestError));
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  const changeMode = useCallback(async (nextMode: MetricsMode) => {
    setRefreshing(true);
    try {
      const result = await api.setMetricsMode(nextMode);
      if (!result.success || !result.mode) throw new Error(result.message || 'The requested telemetry mode is unavailable.');
      setMode(result.mode); localStorage.setItem('autoops_live_mode', String(result.mode === 'live'));
      window.dispatchEvent(new CustomEvent('autoops-mode-synced', { detail: result.mode === 'live' }));
      await load();
    } catch (requestError) { setError(friendlyError(requestError)); setRefreshing(false); }
  }, [load]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    const interval = window.setInterval(() => void load(), 5000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [load]);

  useEffect(() => {
    const onMode = (event: Event) => void changeMode((event as CustomEvent<boolean>).detail ? 'live' : 'demo');
    window.addEventListener('autoops-mode-change', onMode);
    return () => window.removeEventListener('autoops-mode-change', onMode);
  }, [changeMode]);

  const activateScenario = async (name: string) => {
    setRefreshing(true);
    try {
      const result = await api.activateDemoScenario(name);
      if (!result.success) throw new Error(result.message || 'Unable to activate this demo scenario.');
      setMode('demo'); localStorage.setItem('autoops_live_mode', 'false'); window.dispatchEvent(new CustomEvent('autoops-mode-synced', { detail: false }));
      await load();
    } catch (requestError) { setError(friendlyError(requestError)); setRefreshing(false); }
  };

  const telemetry = useMemo(() => metrics ? [
    { label: 'CPU', value: `${metrics.cpu}%`, tone: metricTone(metrics.cpu, 60, 85) }, { label: 'Memory', value: `${metrics.memory}%`, tone: metricTone(metrics.memory, 75, 90) },
    { label: 'Latency', value: `${metrics.latency} ms`, tone: metricTone(metrics.latency, 120, 350) }, { label: 'Response time', value: `${metrics.response_time} ms`, tone: metricTone(metrics.response_time, 120, 350) },
    { label: 'Requests', value: String(metrics.requests), tone: 'text-primary' }, { label: 'Error rate', value: `${metrics.error_rate}%`, tone: metricTone(metrics.error_rate, 1, 5) },
  ] : [], [metrics]);
  const provenance = mode === 'live' ? 'Live host telemetry' : status?.scenario?.label ? `Synthetic demo · ${status.scenario.label}` : 'Synthetic demo telemetry';

  return <div className="p-8 bg-background/30 min-h-[calc(100vh-4rem)] text-text-primary overflow-y-auto relative">
    <div className="absolute inset-0 z-0 opacity-35 pointer-events-none"><Suspense fallback={null}><Beams beamWidth={2} beamHeight={18} beamNumber={8} lightColor="#4F8BFF" speed={1} noiseIntensity={0.8} scale={0.12} rotation={12} /></Suspense></div>
    <div className="max-w-7xl mx-auto space-y-6 relative z-10">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.06] pb-5"><div><h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">Operations command center</h1><div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] font-mono text-text-muted"><span className={`px-2 py-1 rounded border uppercase ${mode === 'live' ? 'text-primary border-primary/25 bg-primary/10' : 'text-accent border-accent/25 bg-accent/10'}`}>{mode || 'loading'} telemetry</span><span>{provenance}</span>{lastUpdated && <><span>•</span><span>Updated {lastUpdated.toLocaleTimeString()}</span></>}</div></div><div className="flex items-center gap-3"><button onClick={() => void load(undefined, true)} disabled={refreshing} className="p-2.5 rounded-xl border border-white/[0.08] bg-surface text-text-muted hover:text-white disabled:opacity-50" title="Refresh operational data"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button><div className={`px-3.5 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider ${statusTone(status?.severity)}`}>{status ? `${status.status} · ${formatConfidence(status.confidence)} confidence` : 'Status unavailable'}</div></div></header>
      {error && <div className="rounded-xl border border-white/15 bg-surface/90 px-4 py-3 text-xs text-text-muted flex flex-wrap justify-between gap-3"><span>{error}{stale && lastUpdated ? ' Showing the last successful operational response.' : ''}</span><button onClick={() => void load(undefined, true)} className="text-primary font-semibold">Retry</button></div>}
      {loading && !error && <div className="rounded-xl border border-white/[0.08] bg-surface/70 px-4 py-3 text-xs text-text-muted">Loading current telemetry and model analysis…</div>}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4"><BorderGlow glowSize={180} glowOpacity={0.4}><div className="p-5 min-h-[135px]"><div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-text-muted">System state</span><Activity className="h-4 w-4 text-primary" /></div><p className="mt-4 text-2xl font-bold font-heading text-white capitalize">{status?.status || 'Unavailable'}</p><p className="mt-1 text-xs text-text-muted">Severity: {status?.severity || '—'} · Risk: {status?.risk || '—'}</p></div></BorderGlow><BorderGlow glowSize={180} glowOpacity={0.4}><div className="p-5 min-h-[135px]"><div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-text-muted">Anomaly detection</span><BrainCircuit className="h-4 w-4 text-accent" /></div><p className="mt-4 text-2xl font-bold font-heading text-white">{status ? status.anomaly ? 'Anomaly detected' : 'No anomaly detected' : 'Unavailable'}</p><p className="mt-1 text-xs text-text-muted">Anomaly score: {status ? status.anomaly_score.toFixed(4) : '—'} · Model/rule-derived</p></div></BorderGlow><BorderGlow glowSize={180} glowOpacity={0.4}><div className="p-5 min-h-[135px]"><div className="flex justify-between"><span className="text-[10px] uppercase tracking-widest text-text-muted">Incident context</span><AlertTriangle className="h-4 w-4 text-primary" /></div><p className="mt-4 text-2xl font-bold font-heading text-white">{incidentStats?.open_incidents ?? '—'} open</p><p className="mt-1 text-xs text-text-muted">{incidentStats ? `${incidentStats.high_severity_incidents} high/critical · ${incidentStats.total_incidents} historical` : 'Historical incident data unavailable'}</p></div></BorderGlow></section>
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">{telemetry.map(item => <div key={item.label} className="bg-surface/75 border border-white/[0.08] rounded-xl p-4"><p className="text-[10px] text-text-muted uppercase tracking-wider">{item.label}</p><p className={`mt-2 font-heading text-xl font-bold ${item.tone}`}>{item.value}</p><p className="mt-1 text-[10px] text-text-muted">Current {mode === 'live' ? 'host' : 'synthetic'} reading</p></div>)}</section>
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6"><BorderGlow glowSize={340} glowOpacity={0.25}><div className="p-5 h-[350px] flex flex-col"><div><h2 className="text-base font-heading font-semibold text-white">Historical resource telemetry</h2><p className="text-[10px] text-text-muted mt-1">CSV-backed samples · CPU and memory percentage over time</p></div><div className="flex-1 min-h-0 mt-4">{history.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={history} margin={{ left: -25, right: 10, top: 10 }}><defs><linearGradient id="dashboardCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4F8BFF" stopOpacity={.2}/><stop offset="95%" stopColor="#4F8BFF" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.02)" vertical={false}/><XAxis dataKey="timestamp" stroke="rgba(255,255,255,.3)" fontSize={9} tickLine={false}/><YAxis stroke="rgba(255,255,255,.3)" fontSize={9} tickLine={false}/><Tooltip contentStyle={{ backgroundColor: '#0D1728', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, fontSize: 11 }}/><Area name="CPU" type="monotone" dataKey="cpu" stroke="#4F8BFF" fill="url(#dashboardCpu)"/><Area name="Memory" type="monotone" dataKey="memory" stroke="#63D6FF" fill="none"/></AreaChart></ResponsiveContainer> : <p className="h-full grid place-items-center text-xs text-text-muted">No historical telemetry available.</p>}</div></div></BorderGlow><BorderGlow glowSize={340} glowOpacity={0.25}><div className="p-5 h-[350px] flex flex-col"><div><h2 className="text-base font-heading font-semibold text-white">Diagnosis & decision</h2><p className="text-[10px] text-text-muted mt-1">Weighted root-cause analysis and recommendation</p></div>{status ? <div className="mt-5 space-y-4 text-xs overflow-auto"><div><p className="text-primary font-semibold uppercase tracking-wider text-[10px]">What is happening?</p><p className="text-white font-semibold mt-1">{status.root_cause}</p><p className="text-text-muted mt-1">Primary diagnosis: {status.primary_issue}</p></div><div><p className="text-accent font-semibold uppercase tracking-wider text-[10px]">Recommended next step</p><p className="text-white font-semibold mt-1">{status.recommended_action}</p><p className="text-text-muted mt-1">{status.reason}</p></div></div> : <p className="h-full grid place-items-center text-xs text-text-muted">Diagnosis unavailable until system status loads.</p>}</div></BorderGlow></section>
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 bg-surface/80 border border-white/[0.08] p-5 rounded-2xl shadow-glass"><div className="flex justify-between gap-3"><h2 className="text-base font-heading font-semibold text-white">Prediction & evidence</h2><Link to="/predictions" className="text-xs text-primary font-semibold">View Prediction</Link></div>{status ? <div className="mt-4 grid sm:grid-cols-2 gap-5 text-xs"><div><p className="text-text-muted uppercase tracking-wider text-[10px]">Failure forecast</p><p className="text-white font-semibold mt-1">{status.prediction}</p><p className="text-accent mt-2">Time to failure: {status.time_to_failure}</p><p className="text-text-muted mt-1">Trend direction: {status.trends.risk_direction} ({status.trends.sample_size} samples)</p></div><div><p className="text-text-muted uppercase tracking-wider text-[10px]">Why this result?</p><p className="text-white mt-1">Detection: {status.anomaly_reason}</p><ul className="mt-2 space-y-1 text-text-muted list-disc pl-4">{status.explainability.map(item => <li key={item}>{item}</li>)}</ul></div></div> : <p className="mt-4 text-xs text-text-muted">No prediction evidence available.</p>}</div><div className="bg-surface/80 border border-white/[0.08] p-5 rounded-2xl shadow-glass"><h2 className="text-base font-heading font-semibold text-white">Telemetry mode</h2><div className="flex gap-2 mt-4"><button onClick={() => void changeMode('live')} className={`flex-1 rounded-lg py-2 text-xs font-semibold border ${mode === 'live' ? 'bg-primary/15 border-primary/30 text-primary' : 'border-white/[.08] text-text-muted'}`}>Live</button><button onClick={() => void changeMode('demo')} className={`flex-1 rounded-lg py-2 text-xs font-semibold border ${mode === 'demo' ? 'bg-accent/15 border-accent/30 text-accent' : 'border-white/[.08] text-text-muted'}`}>Demo</button></div><p className="text-[10px] text-text-muted mt-3">{mode === 'live' ? 'Host metrics collected by the backend.' : 'Controlled synthetic metrics generated by the backend.'}</p>{mode === 'demo' && <div className="mt-3 space-y-2 max-h-36 overflow-auto">{Object.entries(scenarios).map(([name, scenario]) => <button key={name} onClick={() => void activateScenario(name)} className={`w-full text-left rounded-lg border px-3 py-2 ${status?.scenario.name === name ? 'border-accent/30 bg-accent/10' : 'border-white/[.07] bg-elevated/30 hover:border-primary/25'}`}><span className="block text-xs text-white font-semibold">{scenario.label}</span><span className="block text-[10px] text-text-muted mt-1">{scenario.service} · {scenario.description}</span></button>)}</div>}</div></section>
      <section className="bg-surface/80 border border-white/[0.08] p-5 rounded-2xl shadow-glass"><div className="flex justify-between items-center gap-4"><div><h2 className="text-base font-heading font-semibold text-white">Recent incident history</h2><p className="text-[10px] text-text-muted mt-1">Persisted operational records · newest first</p></div><Database className="h-4 w-4 text-primary" /></div><div className="mt-4 space-y-2">{incidents.length ? incidents.map(incident => <div key={incident.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-elevated/40 p-3.5 rounded-xl border border-white/[.05]"><div><p className="text-sm text-white font-semibold">INC-{String(incident.id).padStart(4, '0')} · {incident.anomaly_type}</p><p className="text-[11px] text-text-muted mt-1">{incident.service_name} · {incident.status} · {new Date(incident.timestamp).toLocaleString()}</p></div><div className="flex items-center gap-3"><span className={`w-fit px-2 py-1 rounded border text-[10px] font-semibold uppercase ${statusTone(incident.severity)}`}>{incident.severity}</span><button onClick={() => navigate('/incidents')} className="rounded-lg border border-primary/30 px-3 py-2 text-[10px] font-bold text-primary">Investigate</button></div></div>) : <p className="py-5 text-xs text-text-muted">No persisted incidents are available.</p>}</div></section>
    </div>
  </div>;
}
