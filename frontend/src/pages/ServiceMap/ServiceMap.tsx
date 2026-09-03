import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, Play, X } from 'lucide-react';
import { api, type DependencyImpact, type Metrics, type ServiceHealth, type SystemStatus, type Topology } from '../../services/api';

interface ServiceNode { id: string; label: string; x: number; y: number; status: ServiceHealth[string]; }
const positions: Record<string, [number, number]> = { gateway: [100, 300], auth: [330, 145], order: [330, 430], payment: [570, 345], inventory: [570, 500], db: [830, 300] };
const statusClasses: Record<string, string> = { healthy: 'border-primary/30 bg-primary/10 text-primary', degraded: 'border-accent/30 bg-accent/10 text-accent', failed: 'border-white/25 bg-white/10 text-white' };
const nodeColor = (status: string) => status === 'failed' ? '#f7fafc' : status === 'degraded' ? '#63d6ff' : '#4f8bff';

export default function ServiceMap() {
  const [searchParams] = useSearchParams();
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [health, setHealth] = useState<ServiceHealth>({});
  const [scenario, setScenario] = useState<SystemStatus['scenario'] | null>(null);
  const [syntheticMetrics, setSyntheticMetrics] = useState<Metrics | null>(null);
  const [edges, setEdges] = useState<Topology['edges']>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [impact, setImpact] = useState<DependencyImpact | null>(null);
  const [topologyError, setTopologyError] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [impactError, setImpactError] = useState<string | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  useEffect(() => {
    const requested = searchParams.get('service');
    if (requested) setSelectedId(requested);
  }, [searchParams]);

  useEffect(() => {
    const controller = new AbortController();
    void api.getTopology(controller.signal).then((topology) => {
      setEdges(topology.edges);
      setNodes(topology.nodes.map((node, index) => ({ ...node, x: positions[node.id]?.[0] ?? 120 + index * 120, y: positions[node.id]?.[1] ?? 300, status: 'healthy' })));
      setTopologyError(null); setLastRefresh(new Date());
    }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setTopologyError(error instanceof Error ? error.message : 'Topology is unavailable.'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refreshOverlay = () => {
      void api.getServiceHealth(controller.signal).then((response) => {
        setHealth(response); setHealthError(null);
      }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === 'AbortError')) setHealthError(error instanceof Error ? error.message : 'Synthetic service health is unavailable.'); });
      void api.getSystemStatus(controller.signal).then((status) => setScenario(status.scenario)).catch(() => undefined);
      void api.getMetrics(controller.signal).then(setSyntheticMetrics).catch(() => undefined);
    };
    refreshOverlay();
    const interval = window.setInterval(refreshOverlay, 5_000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    setNodes((current) => current.map((node) => ({ ...node, status: health[node.id] || 'healthy' })));
  }, [health]);

  useEffect(() => {
    if (!selectedId) { setImpact(null); setImpactError(null); return; }
    const controller = new AbortController(); setLoadingImpact(true); setImpactError(null);
    void api.getServiceDependencyImpact(selectedId, controller.signal).then(setImpact).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setImpactError(error instanceof Error ? error.message : 'Dependency analysis is unavailable.');
    }).finally(() => { if (!controller.signal.aborted) setLoadingImpact(false); });
    return () => controller.abort();
  }, [selectedId]);

  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const related = useMemo(() => new Map((impact?.affected_services ?? []).map((service) => [service.service_id, service.depth])), [impact]);
  const dependencies = selectedId ? edges.filter((edge) => edge.source === selectedId).map((edge) => nodes.find((node) => node.id === edge.target)?.label ?? edge.target) : [];
  const dependents = selectedId ? edges.filter((edge) => edge.target === selectedId).map((edge) => nodes.find((node) => node.id === edge.source)?.label ?? edge.source) : [];

  return <div className="min-h-[calc(100vh-4rem)] bg-background/30 p-4 sm:p-6 lg:p-8 text-text-primary overflow-y-auto"><div className="mx-auto max-w-7xl space-y-5">
    <header className="border-b border-white/[.06] pb-5"><h1 className="font-heading text-2.5xl font-bold tracking-tight text-white">Service topology</h1><p className="mt-1 text-xs leading-relaxed text-text-muted">Arrow direction: a service points to the service it depends on. Health is scenario-aware synthetic backend data; this is deterministic dependency analysis, not distributed tracing.</p>{lastRefresh && <p className="mt-2 text-[10px] text-text-muted">Topology refreshed {lastRefresh.toLocaleTimeString()}{scenario ? ` · Active scenario: ${scenario.label}` : ''}</p>}</header>
    <div className="flex flex-wrap items-center gap-3"><button onClick={() => setSelectedId('db')} className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-bold text-accent"><Play className="h-3.5 w-3.5 fill-current" />Simulate database cascade</button><span className="text-[10px] text-text-muted">Deterministic canonical graph</span></div>
    {topologyError && <div className="rounded-xl border border-white/15 bg-surface px-4 py-3 text-xs text-text-muted">Topology error: {topologyError}</div>}{healthError && <div className="rounded-xl border border-white/15 bg-surface px-4 py-3 text-xs text-text-muted">Health status unavailable; topology remains available. {healthError}</div>}
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]"><div className="min-w-0 overflow-hidden rounded-2xl border border-white/[.08] bg-surface/65 shadow-glass">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.06] px-4 py-3 text-[10px] text-text-muted"><span>Click a service to inspect dependencies and impact.</span><span className="flex items-center gap-2"><span className="inline-block h-px w-6 bg-primary" /> depends on →</span></div>
      <div className="relative min-h-[480px] p-2 sm:p-4">{!topologyError && nodes.length === 0 && <p className="absolute inset-0 grid place-items-center text-xs text-text-muted">Loading topology…</p>}<svg className="h-full min-h-[450px] w-full" viewBox="0 0 960 620" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Service dependency map"><defs><marker id="dependency-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#4f8bff" /></marker></defs>
        {edges.map((edge) => { const source = nodes.find((node) => node.id === edge.source); const target = nodes.find((node) => node.id === edge.target); if (!source || !target) return null; const involved = selectedId === source.id || selectedId === target.id || related.has(source.id) || related.has(target.id); return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={involved ? '#63d6ff' : 'rgba(79,139,255,.32)'} strokeWidth={involved ? 3 : 2} markerEnd="url(#dependency-arrow)" />; })}
        {nodes.map((node) => { const isSelected = node.id === selectedId; const depth = related.get(node.id); const color = nodeColor(node.status); return <g key={node.id} role="button" tabIndex={0} aria-label={`Inspect ${node.label}; ${node.status}`} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(node.id); } }} className="cursor-pointer">{isSelected && <circle cx={node.x} cy={node.y} r="48" fill="none" stroke="#63d6ff" strokeWidth="3" opacity=".65" />}{depth && !isSelected && <circle cx={node.x} cy={node.y} r="42" fill="none" stroke={depth === 1 ? '#63d6ff' : '#4f8bff'} strokeWidth="2" strokeDasharray="5 5" opacity=".7" />}<circle cx={node.x} cy={node.y} r="31" fill="#081120" stroke={color} strokeWidth={isSelected ? 4 : 2} />{node.id === 'db' ? <ellipse cx={node.x} cy={node.y} rx="13" ry="6" fill="none" stroke={color} /> : <rect x={node.x - 12} y={node.y - 10} width="24" height="20" rx="3" fill="none" stroke={color} />}<text x={node.x} y={node.y + 59} textAnchor="middle" fill="#dce7f7" fontSize="14" fontWeight={isSelected ? 700 : 500}>{node.label}</text>{depth && <text x={node.x} y={node.y - 48} textAnchor="middle" fill="#63d6ff" fontSize="11">{depth === 1 ? 'DIRECT IMPACT' : 'TRANSITIVE IMPACT'}</text>}</g>; })}</svg></div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[.06] px-4 py-3 text-[10px] text-text-muted"><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-primary" />Healthy</span><span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-accent" />Degraded</span><span>Solid ring: selected</span><span>Dashed ring: affected by selected failure</span></div></div>
      <aside className="min-w-0 rounded-2xl border border-white/[.08] bg-surface/85 p-5 shadow-glass xl:min-h-[540px]">{!selected ? <div className="grid h-full min-h-48 place-items-center text-center text-xs text-text-muted"><div><Activity className="mx-auto mb-3 h-5 w-5 text-primary" /><p className="text-white">Select a service</p><p className="mt-1">Inspect health, dependencies, and deterministic blast radius.</p></div></div> : <div className="space-y-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-widest text-text-muted">Selected service</p><h2 className="mt-1 font-heading text-xl font-bold text-white">{selected.label}</h2></div><button aria-label="Close service detail" onClick={() => setSelectedId(null)} className="rounded-lg p-1 text-text-muted hover:text-white"><X className="h-4 w-4" /></button></div><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClasses[selected.status]}`}>Synthetic health: {selected.status}</span><div className="rounded-xl border border-white/[.06] bg-background/45 p-3 text-xs"><p className="font-semibold text-white">Active scenario</p><p className="mt-1 text-text-muted">{scenario ? `${scenario.label} · ${scenario.description}` : 'Scenario state is loading from the backend.'}</p></div><SyntheticMetrics metrics={syntheticMetrics} /><Relation title="Depends on →" values={dependencies} empty="No service dependencies." /><Relation title="← Required by" values={dependents} empty="No services depend on this service." />{impactError && <div className="rounded-xl border border-white/15 p-3 text-xs text-text-muted">Dependency analysis error: {impactError}</div>}{loadingImpact && <p className="text-xs text-text-muted">Loading dependency analysis…</p>}{impact && <div className="space-y-3 border-t border-white/[.06] pt-4"><p className="text-[10px] font-bold uppercase tracking-widest text-accent">Failure impact if {impact.failed_service_label} fails</p><ImpactList title="Direct impact" values={impact.directly_affected_services.map((item) => item.label)} /><ImpactList title="Transitive impact" values={impact.transitively_affected_services.map((item) => item.label)} /><div className="grid grid-cols-3 gap-2 text-center text-[10px]"><Metric label="Affected" value={String(impact.impact_count)} /><Metric label="Depth" value={String(impact.cascade_depth)} /><Metric label="Severity" value={impact.severity} /></div></div>}</div>}</aside>
    </section></div></div>;
}
function Relation({ title, values, empty }: { title: string; values: string[]; empty: string }) { return <div><p className="text-[10px] uppercase tracking-widest text-text-muted">{title}</p><p className="mt-1 text-xs text-white">{values.length ? values.join(', ') : empty}</p></div>; }
function ImpactList({ title, values }: { title: string; values: string[] }) { return <div><p className="text-[10px] uppercase tracking-widest text-text-muted">{title}</p><p className="mt-1 text-xs text-white">{values.length ? values.join(', ') : 'None'}</p></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-white/[.06] bg-background/45 p-2"><p className="text-text-muted">{label}</p><p className="mt-1 font-semibold capitalize text-white">{value}</p></div>; }
function SyntheticMetrics({ metrics }: { metrics: Metrics | null }) { return <div className="rounded-xl border border-white/[.06] bg-background/45 p-3 text-xs"><p className="font-semibold text-white">Current synthetic system metrics</p>{metrics ? <div className="mt-2 grid grid-cols-3 gap-2 text-text-muted"><span>Synthetic CPU<br /><b className="text-white">{metrics.cpu}%</b></span><span>Synthetic memory<br /><b className="text-white">{metrics.memory}%</b></span><span>Synthetic latency<br /><b className="text-white">{metrics.latency} ms</b></span></div> : <p className="mt-1 text-text-muted">Synthetic metrics are loading from the backend.</p>}<p className="mt-2 text-[10px] text-text-muted">System-level scenario data, not per-service production telemetry.</p></div>; }
