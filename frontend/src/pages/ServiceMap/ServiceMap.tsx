import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FiServer, FiDatabase, FiShield, FiShoppingCart, FiCreditCard, FiGlobe, FiArrowRight } from 'react-icons/fi';
import GlassCard from '../../components/cards/GlassCard';

interface ServiceNode {
  id: string; name: string; icon: React.ElementType;
  status: 'healthy' | 'degraded' | 'down';
  latency: string; uptime: string; requests: string;
  x: number; y: number;
}

interface ServiceEdge { from: string; to: string; status: 'healthy' | 'degraded'; }

const services: ServiceNode[] = [
  { id: 'gateway', name: 'API Gateway', icon: FiGlobe, status: 'healthy', latency: '12ms', uptime: '99.99%', requests: '4.2k/s', x: 50, y: 8 },
  { id: 'auth', name: 'Auth Service', icon: FiShield, status: 'healthy', latency: '8ms', uptime: '99.98%', requests: '1.8k/s', x: 20, y: 35 },
  { id: 'order', name: 'Order Service', icon: FiShoppingCart, status: 'degraded', latency: '145ms', uptime: '99.85%', requests: '920/s', x: 50, y: 35 },
  { id: 'payment', name: 'Payment Service', icon: FiCreditCard, status: 'degraded', latency: '210ms', uptime: '99.72%', requests: '680/s', x: 80, y: 35 },
  { id: 'database', name: 'Database', icon: FiDatabase, status: 'healthy', latency: '3ms', uptime: '99.99%', requests: '8.1k/s', x: 35, y: 65 },
  { id: 'cache', name: 'Cache Layer', icon: FiServer, status: 'healthy', latency: '1ms', uptime: '100%', requests: '12k/s', x: 65, y: 65 },
];

const edges: ServiceEdge[] = [
  { from: 'gateway', to: 'auth', status: 'healthy' },
  { from: 'gateway', to: 'order', status: 'degraded' },
  { from: 'gateway', to: 'payment', status: 'degraded' },
  { from: 'order', to: 'database', status: 'healthy' },
  { from: 'order', to: 'cache', status: 'healthy' },
  { from: 'payment', to: 'database', status: 'healthy' },
  { from: 'auth', to: 'database', status: 'healthy' },
  { from: 'auth', to: 'cache', status: 'healthy' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'healthy': return { ring: 'border-accent', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.3)]', dot: 'bg-accent', text: 'text-accent', pulse: '' };
    case 'degraded': return { ring: 'border-yellow-400', glow: 'shadow-[0_0_25px_rgba(234,179,8,0.35)]', dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-400', pulse: 'animate-pulse' };
    case 'down': return { ring: 'border-red-500', glow: 'shadow-[0_0_30px_rgba(239,68,68,0.4)]', dot: 'bg-red-500 animate-pulse', text: 'text-red-500', pulse: 'animate-pulse' };
    default: return { ring: 'border-white/20', glow: '', dot: 'bg-white/40', text: 'text-text-muted', pulse: '' };
  }
};

const ServiceMap: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceNode | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Service Dependency Map</h1>
          <p className="text-text-muted text-sm">Microservice topology and cascade failure prediction</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> Healthy</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Degraded</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Down</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GlassCard delay={0.1} className="relative h-[520px] overflow-hidden">
            {/* SVG edges with animated flow */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="flowGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(34,197,94,0.1)" />
                  <stop offset="50%" stopColor="rgba(34,197,94,0.6)" />
                  <stop offset="100%" stopColor="rgba(34,197,94,0.1)" />
                </linearGradient>
                <linearGradient id="flowYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(234,179,8,0.1)" />
                  <stop offset="50%" stopColor="rgba(234,179,8,0.6)" />
                  <stop offset="100%" stopColor="rgba(234,179,8,0.1)" />
                </linearGradient>
              </defs>
              {edges.map((edge, idx) => {
                const fromNode = services.find(s => s.id === edge.from)!;
                const toNode = services.find(s => s.id === edge.to)!;
                const color = edge.status === 'healthy' ? 'rgba(34,197,94,0.25)' : 'rgba(234,179,8,0.35)';
                const isHighlighted = hoveredService === edge.from || hoveredService === edge.to;
                return (
                  <g key={idx}>
                    <motion.line
                      x1={`${fromNode.x}%`} y1={`${fromNode.y + 5}%`}
                      x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                      stroke={isHighlighted ? (edge.status === 'healthy' ? 'rgba(34,197,94,0.6)' : 'rgba(234,179,8,0.7)') : color}
                      strokeWidth={isHighlighted ? 3 : 2}
                      strokeDasharray={edge.status === 'degraded' ? '6 4' : '0'}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.3 + idx * 0.08, duration: 0.6 }}
                    />
                    {/* Animated flow particle */}
                    <motion.circle
                      r={isHighlighted ? 4 : 3}
                      fill={edge.status === 'healthy' ? '#22c55e' : '#eab308'}
                      opacity={0.8}
                      initial={{ opacity: 0 }}
                      animate={{
                        cx: [`${fromNode.x}%`, `${toNode.x}%`],
                        cy: [`${fromNode.y + 5}%`, `${toNode.y}%`],
                        opacity: [0, 0.8, 0.8, 0],
                      }}
                      transition={{
                        duration: edge.status === 'degraded' ? 3 : 2,
                        repeat: Infinity,
                        delay: idx * 0.4,
                        ease: 'linear',
                      }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Service nodes with hover tooltips */}
            {services.map((service, idx) => {
              const colors = getStatusColor(service.status);
              const isHovered = hoveredService === service.id;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 * idx, duration: 0.4 }}
                  whileHover={{ scale: 1.15, zIndex: 50 }}
                  onClick={() => setSelectedService(service)}
                  onMouseEnter={() => setHoveredService(service.id)}
                  onMouseLeave={() => setHoveredService(null)}
                  className="absolute cursor-pointer z-10"
                  style={{ left: `${service.x}%`, top: `${service.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-card/90 border-2 ${colors.ring} ${colors.glow} backdrop-blur-sm transition-all hover:bg-card ${colors.pulse}`}>
                    <div className="relative">
                      <service.icon size={24} className={colors.text} />
                      <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    </div>
                    <span className="text-xs font-semibold text-white whitespace-nowrap">{service.name}</span>
                    <span className="text-[10px] text-text-muted">{service.latency}</span>
                  </div>

                  {/* FEATURE 3: Hover Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute left-1/2 -translate-x-1/2 -bottom-[90px] bg-card border border-white/10 rounded-xl p-3 shadow-xl z-50 min-w-[160px]"
                    >
                      <div className="text-[10px] space-y-1.5">
                        <div className="flex justify-between"><span className="text-text-muted">Status</span><span className={`font-bold uppercase ${colors.text}`}>{service.status}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Latency</span><span className="text-white font-medium">{service.latency}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Throughput</span><span className="text-white font-medium">{service.requests}</span></div>
                        <div className="flex justify-between"><span className="text-text-muted">Deps</span><span className="text-white font-medium">{edges.filter(e => e.from === service.id || e.to === service.id).length}</span></div>
                      </div>
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-l border-t border-white/10 rotate-45" />
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </GlassCard>
        </div>

        <div className="lg:col-span-1 space-y-4">
          {selectedService ? (
            <motion.div key={selectedService.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <GlassCard delay={0} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl bg-white/5 ${getStatusColor(selectedService.status).text}`}><selectedService.icon size={24} /></div>
                  <div>
                    <h3 className="text-white font-bold">{selectedService.name}</h3>
                    <span className={`text-xs font-semibold uppercase ${getStatusColor(selectedService.status).text}`}>{selectedService.status}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {[{ label: 'Latency', value: selectedService.latency }, { label: 'Uptime', value: selectedService.uptime }, { label: 'Throughput', value: selectedService.requests }].map((metric) => (
                    <div key={metric.label} className="flex justify-between items-center bg-background/40 rounded-xl p-3">
                      <span className="text-xs text-text-muted">{metric.label}</span>
                      <span className="text-sm font-bold text-white">{metric.value}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-xs text-text-muted font-semibold uppercase mb-2">Dependencies</h4>
                  <div className="space-y-2">
                    {edges.filter(e => e.from === selectedService.id || e.to === selectedService.id).map((edge, i) => {
                      const otherSvc = services.find(s => s.id === (edge.from === selectedService.id ? edge.to : edge.from))!;
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                          <FiArrowRight size={12} className={edge.status === 'healthy' ? 'text-accent' : 'text-yellow-400'} />
                          <span>{otherSvc.name}</span>
                          <span className={`ml-auto ${edge.status === 'healthy' ? 'text-accent' : 'text-yellow-400'}`}>{edge.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ) : (
            <GlassCard delay={0.2} className="flex flex-col items-center justify-center h-64 text-center">
              <FiServer size={32} className="text-text-muted mb-3" />
              <p className="text-sm text-text-muted">Click a service node to view details</p>
            </GlassCard>
          )}

          <GlassCard delay={0.3} className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Cascade Failure Risk</h3>
            {[
              { path: 'Gateway → Order → DB', risk: 72, color: 'bg-yellow-400' },
              { path: 'Gateway → Payment → DB', risk: 45, color: 'bg-blue-400' },
              { path: 'Auth → Cache', risk: 12, color: 'bg-accent' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">{item.path}</span>
                  <span className="text-white font-semibold">{item.risk}%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.risk}%` }} transition={{ delay: 0.5 + idx * 0.15, duration: 0.8 }} className={`h-full rounded-full ${item.color}`} />
                </div>
              </div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ServiceMap;
