import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Activity, Cpu, Play } from 'lucide-react';
import { api } from '../../services/api';

interface TopologyNode { id: string; label: string; name?: string; }
interface TopologyEdge { source: string; target: string; }
interface ServiceNode extends TopologyNode {
  x: number;
  y: number;
  status: string;
  type: string;
}

export default function ServiceMap() {
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [edges, setEdges] = useState<TopologyEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<ServiceNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [cascade, setCascade] = useState<{ failed_service: string; cascade_services: string[]; status: Record<string, string> } | null>(null);
  const [cascadeError, setCascadeError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedNode(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.getTopology(controller.signal), api.getServiceHealth(controller.signal)])
      .then(([topology, health]) => {
        if (topology?.nodes && topology?.edges) {
          setError(null);
          const positions: Record<string, [number, number]> = {
            gateway: [150, 200], auth: [360, 100], order: [360, 235],
            payment: [590, 170], inventory: [590, 300], db: [730, 235],
          };
          setNodes((topology.nodes as TopologyNode[]).map((node, index) => ({
            ...node,
            x: positions[node.id]?.[0] ?? 120 + index * 110,
            y: positions[node.id]?.[1] ?? 200,
            status: (health as Record<string, string>)?.[node.id] === 'failed' ? 'critical' : (health as Record<string, string>)?.[node.id] || 'healthy',
            type: node.id === 'db' ? 'database' : node.id === 'gateway' ? 'gateway' : 'service',
          })));
          setEdges(topology.edges);
          setLastRefresh(new Date());
        } else throw new Error('Topology response was incomplete');
      })
      .catch((requestError) => { if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) setError(requestError instanceof Error ? requestError.message : 'Topology request failed'); });
    return () => controller.abort();
  }, []);

  const simulateCascade = async () => {
    setSimulating(true); setCascade(null); setCascadeError(null);
    try { setCascade(await api.simulateCascade()); }
    catch (requestError) { setCascadeError(requestError instanceof Error ? requestError.message : 'Cascade simulation unavailable.'); }
    finally { setSimulating(false); }
  };

  const getStatusColor = (status: string) => {
    // Preserving ONLY shades of blue, navy, and white
    switch (status) {
      case 'critical':
        return '#F7FAFC'; // White highlight for critical failures
      case 'warning':
      case 'degraded':
        return '#63D6FF'; // Cyan accent for warnings/degraded
      default:
        return '#4F8BFF'; // Primary blue for healthy
    }
  };

  return (
    <div className="p-8 bg-background min-h-screen text-text-primary flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-5 mb-6">
        <h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">Service Topology</h1>
        <p className="text-text-muted text-xs mt-1 leading-relaxed">Static backend topology · service health is synthetic/random, not production discovery or tracing.</p>
        <p className="text-text-muted text-[10px] mt-2">Topology source: backend static graph · Health source: synthetic backend generator{lastRefresh ? ' · Refreshed ' + lastRefresh.toLocaleTimeString() : ''}</p>
      </div>
      {error && <p className="mb-4 text-xs text-primary">{error}</p>}
      <div className="mb-4 flex flex-wrap items-center gap-3"><button onClick={() => void simulateCascade()} disabled={simulating} className="px-4 py-2 rounded-lg border border-accent/30 bg-accent/10 text-accent text-xs font-bold disabled:opacity-50 flex gap-2"><Play className="h-3.5 w-3.5 fill-current"/>{simulating ? 'Simulating…' : 'Simulate Cascade'}</button><span className="text-[10px] text-text-muted">SIMULATION ONLY</span></div>
      {cascadeError && <div className="mb-4 rounded-xl border border-white/15 bg-surface px-4 py-3 text-xs text-text-muted">{cascadeError}</div>}
      {cascade && <div className="mb-4 rounded-xl border border-accent/25 bg-surface p-4 text-xs"><p className="text-accent font-bold tracking-wider">CASCADE SIMULATION</p><p className="mt-2 text-white">Failed service: {cascade.failed_service}</p><p className="mt-1 text-text-muted">Affected services: {cascade.cascade_services.length ? cascade.cascade_services.join(', ') : 'None returned by backend'}</p></div>}

      <div className="flex-1 bg-surface/65 border border-white/[0.08] rounded-2xl relative overflow-hidden flex shadow-glass min-h-[500px]">
        {/* SVG Canvas Topology */}
        <div className="flex-grow relative h-full">
          {!error && nodes.length === 0 && <p className="absolute inset-0 flex items-center justify-center text-xs text-text-muted">Loading topology…</p>}
          <svg className="w-full h-full min-h-[450px]" viewBox="0 0 800 400">
            {/* Connection Edges */}
            {edges.map((edge, i) => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              const isCriticalEdge = source.status === 'critical' || target.status === 'critical';
              const strokeColor = isCriticalEdge ? 'rgba(255,255,255,0.2)' : 'rgba(79,139,255,0.3)';

              return (
                <motion.line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth="1.5"
                  strokeDasharray="5,5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const color = getStatusColor(node.status);
              const isSelected = selectedNode?.id === node.id;

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedNode(node); } }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Inspect ${node.label || node.name}; synthetic health ${node.status}`}
                  className="cursor-pointer group"
                >
                  {/* Orbit Glow Ring for selected node */}
                  {isSelected && (
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="32"
                      fill="none"
                      stroke={color}
                      strokeWidth="1"
                      className="opacity-30 animate-pulse-ring"
                    />
                  )}

                  {/* Node Circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="22"
                    fill="#081120"
                    stroke={color}
                    strokeWidth={isSelected ? '2.5' : '1.5'}
                    className="transition-all duration-300 group-hover:stroke-accent"
                  />

                  {/* Type Icon indicators inside the node */}
                  <g className="opacity-80" transform={`translate(${node.x - 7}, ${node.y - 7})`}>
                    {node.type === 'database' ? (
                      <Database className="w-3.5 h-3.5 text-text-primary" strokeWidth={1.5} />
                    ) : node.type === 'gateway' ? (
                      <Cpu className="w-3.5 h-3.5 text-text-primary" strokeWidth={1.5} />
                    ) : (
                      <Server className="w-3.5 h-3.5 text-text-primary" strokeWidth={1.5} />
                    )}
                  </g>

                  {/* Node Label Text */}
                  <text
                    x={node.x}
                    y={node.y + 36}
                    fill={isSelected ? '#FFFFFF' : '#9FB0C7'}
                    fontSize="11"
                    fontWeight={isSelected ? '600' : '400'}
                    textAnchor="middle"
                    className="font-heading transition-colors"
                  >
                    {node.label || node.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Drawer */}
        {selectedNode && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-elevated/75 p-6 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold font-heading text-white tracking-tight leading-tight">
                  {selectedNode.label || selectedNode.name}
                </h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  aria-label="Close service detail"
                  className="text-text-muted hover:text-white text-xs font-mono"
                >
                  ESC
                </button>
              </div>

              {/* Status Badge */}
              <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 border ${
                selectedNode.status === 'critical'
                  ? 'bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.15)]'
                  : selectedNode.status === 'warning' || selectedNode.status === 'degraded'
                  ? 'bg-accent/15 border-accent/20 text-accent'
                  : 'bg-primary/15 border-primary/20 text-primary'
              }`}>
                <span className="w-1.5 h-1.5 bg-current rounded-full" />
                <span>{selectedNode.status}</span>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <div className="p-3.5 bg-background/50 rounded-xl border border-white/[0.05]">
                  <p className="text-text-muted text-[10px] uppercase font-semibold tracking-wider">CPU Usage</p>
                  <p className="font-bold text-base text-white font-heading mt-0.5">Not available</p>
                </div>
                <div className="p-3.5 bg-background/50 rounded-xl border border-white/[0.05]">
                  <p className="text-text-muted text-[10px] uppercase font-semibold tracking-wider">Memory Allocation</p>
                  <p className="font-bold text-base text-white font-heading mt-0.5">Not available</p>
                </div>
                <div className="p-3.5 bg-background/50 rounded-xl border border-white/[0.05]">
                  <p className="text-text-muted text-[10px] uppercase font-semibold tracking-wider">Network In/Out</p>
                  <p className="font-bold text-base text-white font-heading mt-0.5">Not available</p>
                </div>
              </div>
            </div>

            {/* No tracing API is currently available. */}
            <div className="pt-4 border-t border-white/[0.06]">
              <div className="w-full py-2.5 border border-white/[0.08] text-text-muted text-xs font-semibold rounded-xl flex items-center justify-center space-x-2">
                <Activity className="w-3.5 h-3.5" />
                <span>Trace inspection is not available</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
