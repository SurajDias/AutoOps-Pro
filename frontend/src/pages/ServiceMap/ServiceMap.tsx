import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Activity, Cpu } from 'lucide-react';

const DEMO_NODES = [
  { id: 'web', x: 180, y: 200, label: 'Web Frontend', status: 'healthy', type: 'web' },
  { id: 'api', x: 380, y: 200, label: 'API Gateway', status: 'healthy', type: 'gateway' },
  { id: 'auth', x: 580, y: 120, label: 'Auth Service', status: 'warning', type: 'service' },
  { id: 'db', x: 580, y: 280, label: 'Database', status: 'critical', type: 'database' }
];

const DEMO_EDGES = [
  { source: 'web', target: 'api' },
  { source: 'api', target: 'auth' },
  { source: 'api', target: 'db' }
];

export default function ServiceMap() {
  const [nodes, setNodes] = useState(DEMO_NODES);
  const [edges, setEdges] = useState(DEMO_EDGES);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    // Preserving original fetch path and logic
    fetch('http://127.0.0.1:8000/topology')
      .then(res => res.ok ? res.json() : null)
      .then(data => { 
        if (data?.nodes && data?.edges) { 
          setNodes(data.nodes); 
          setEdges(data.edges); 
        } 
      })
      .catch(() => console.warn('Using demo topology data'));
  }, []);

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
        <p className="text-text-muted text-xs mt-1 leading-relaxed">
          Interactive map of container networking links and microservice dependencies
        </p>
      </div>

      <div className="flex-1 bg-surface/65 border border-white/[0.08] rounded-2xl relative overflow-hidden flex shadow-glass min-h-[500px]">
        {/* SVG Canvas Topology */}
        <div className="flex-grow relative h-full">
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
            {nodes.map((node: any) => {
              const color = getStatusColor(node.status);
              const isSelected = selectedNode?.id === node.id;
              
              return (
                <g 
                  key={node.id} 
                  onClick={() => setSelectedNode(node)} 
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
            className="w-80 shrink-0 border-l border-white/[0.08] bg-elevated/75 p-6 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-bold font-heading text-white tracking-tight leading-tight">
                  {selectedNode.label || selectedNode.name}
                </h2>
                <button 
                  onClick={() => setSelectedNode(null)} 
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
                  <p className="font-bold text-base text-white font-heading mt-0.5">{(Math.random() * 40 + 10).toFixed(1)}%</p>
                </div>
                <div className="p-3.5 bg-background/50 rounded-xl border border-white/[0.05]">
                  <p className="text-text-muted text-[10px] uppercase font-semibold tracking-wider">Memory Allocation</p>
                  <p className="font-bold text-base text-white font-heading mt-0.5">{(Math.random() * 6 + 2).toFixed(1)} GB</p>
                </div>
                <div className="p-3.5 bg-background/50 rounded-xl border border-white/[0.05]">
                  <p className="text-text-muted text-[10px] uppercase font-semibold tracking-wider">Network In/Out</p>
                  <p className="font-bold text-base text-white font-heading mt-0.5">{(Math.random() * 450 + 50).toFixed(0)} MB/s</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-4 border-t border-white/[0.06]">
              <button className="w-full py-2.5 bg-primary hover:bg-primary/95 text-background text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-neon transition-all">
                <Activity className="w-3.5 h-3.5" />
                <span>Inspect Traces</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
