import React, { useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Activity, Zap, AlertTriangle, Network, Cpu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Module {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  path: string;
  accentColor: string;
  widget: React.ReactNode;
}

// ─── Mini widget components ───────────────────────────────────
const DashboardWidget = () => (
  <div className="h-full flex flex-col gap-3 p-1">
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'CPU', val: '42%', color: 'text-primary' },
        { label: 'Memory', val: '16 GB', color: 'text-accent' },
        { label: 'Latency', val: '12ms', color: 'text-emerald-400' },
        { label: 'Uptime', val: '99.9%', color: 'text-emerald-400' },
      ].map(stat => (
        <div key={stat.label} className="bg-background/60 rounded-lg p-2.5 border border-white/[0.05]">
          <p className="text-[10px] text-text-muted mb-0.5">{stat.label}</p>
          <p className={`text-sm font-bold font-heading ${stat.color}`}>{stat.val}</p>
        </div>
      ))}
    </div>
    <div className="flex-1 flex items-end">
      <svg viewBox="0 0 200 60" className="w-full h-14 overflow-visible">
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F8BFF" stopOpacity={0.3}/>
            <stop offset="100%" stopColor="#4F8BFF" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <path d="M0,55 C20,45 40,30 60,35 S100,20 130,25 S170,15 200,20 L200,60 L0,60Z" fill="url(#wg)"/>
        <path d="M0,55 C20,45 40,30 60,35 S100,20 130,25 S170,15 200,20" fill="none" stroke="#4F8BFF" strokeWidth="1.5"/>
      </svg>
    </div>
  </div>
);

const PredictionsWidget = () => (
  <div className="h-full flex flex-col gap-2.5 p-1">
    {[
      { service: 'Payment Gateway', issue: 'Memory Leak', ttf: '4h 15m', conf: 94, color: 'text-rose-400', bar: 'bg-rose-500' },
      { service: 'Auth Service', issue: 'Pool Exhaustion', ttf: '12h', conf: 87, color: 'text-amber-400', bar: 'bg-amber-500' },
      { service: 'Elasticsearch', issue: 'Storage Limit', ttf: '2d', conf: 76, color: 'text-yellow-400', bar: 'bg-yellow-500' },
    ].map((p, i) => (
      <div key={i} className="bg-background/60 rounded-lg p-2.5 border border-white/[0.05]">
        <div className="flex justify-between items-start mb-1.5">
          <div>
            <p className="text-[10px] font-semibold text-text-primary">{p.service}</p>
            <p className="text-[9px] text-text-muted">{p.issue}</p>
          </div>
          <span className={`text-[10px] font-bold font-mono ${p.color}`}>{p.ttf}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
            <div className={`h-full ${p.bar} rounded-full`} style={{ width: `${p.conf}%` }} />
          </div>
          <span className="text-[9px] text-text-muted font-mono">{p.conf}%</span>
        </div>
      </div>
    ))}
  </div>
);

const IncidentsWidget = () => (
  <div className="h-full flex flex-col gap-2.5 p-1">
    <div className="flex items-center gap-2 mb-1">
      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase">2 Active Incidents</span>
    </div>
    {[
      { id: 'INC-1023', title: 'DB pool exhaustion', sev: 'High', status: 'Investigating' },
      { id: 'INC-1022', title: 'Payment gateway timeout', sev: 'Critical', status: 'Mitigated' },
    ].map(inc => (
      <div key={inc.id} className="bg-rose-950/20 rounded-lg p-2.5 border border-rose-500/20">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] font-mono text-text-muted">{inc.id}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${inc.sev === 'Critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
            {inc.sev}
          </span>
        </div>
        <p className="text-[10px] text-text-primary font-medium">{inc.title}</p>
        <p className="text-[9px] text-text-muted mt-0.5">{inc.status}</p>
      </div>
    ))}
  </div>
);

const ServiceMapWidget = () => (
  <div className="h-full flex items-center justify-center p-2">
    <svg viewBox="0 0 220 130" className="w-full h-full">
      {/* Edges */}
      {[
        [50,65, 110,40], [50,65, 110,90],
        [110,40, 170,30], [110,40, 170,65],
        [110,90, 170,90],
      ].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4F8BFF" strokeWidth="1" strokeDasharray="4,4" opacity="0.4"/>
      ))}
      {/* Nodes */}
      {[
        { x:50,  y:65,  label:'Frontend',   color:'#10B981' },
        { x:110, y:40,  label:'API GW',     color:'#4F8BFF' },
        { x:110, y:90,  label:'Auth Svc',   color:'#F59E0B' },
        { x:170, y:30,  label:'User DB',    color:'#10B981' },
        { x:170, y:65,  label:'Cache',      color:'#4F8BFF' },
        { x:170, y:90,  label:'Main DB',    color:'#EF4444' },
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r="12" fill="#0D1728" stroke={n.color} strokeWidth="1.5"/>
          <text x={n.x} y={n.y+22} fill="#9FB0C7" fontSize="7" textAnchor="middle">{n.label}</text>
        </g>
      ))}
    </svg>
  </div>
);

const AIWidget = () => (
  <div className="h-full flex flex-col gap-2.5 p-1 font-mono">
    <div className="flex items-center gap-2 mb-0.5">
      <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center">
        <Cpu className="w-3 h-3 text-primary" />
      </div>
      <span className="text-[10px] font-semibold text-text-primary font-body">AI Ops Engine</span>
    </div>
    <div className="flex flex-col gap-2 flex-1">
      {[
        { role: 'user', msg: 'Simulate database overload scenario' },
        { role: 'ai',   msg: 'Detected: Node-3 OOM. Auto-scaling to 4 replicas. ETA: 45s. Confidence: 94%' },
      ].map((m, i) => (
        <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
          <div className={`px-2.5 py-1.5 rounded-xl text-[9px] leading-relaxed max-w-[80%] ${
            m.role === 'user'
              ? 'bg-primary/15 text-primary border border-primary/20 rounded-tr-sm'
              : 'bg-elevated text-text-primary border border-white/[0.05] rounded-tl-sm'
          }`}>
            {m.msg}
          </div>
        </div>
      ))}
      <div className="flex gap-1 items-center text-primary">
        {[0,1,2].map(i => (
          <motion.span key={i} className="w-1 h-1 rounded-full bg-current"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
        <span className="text-[9px] text-text-muted ml-1">Analyzing…</span>
      </div>
    </div>
  </div>
);

const modules: Module[] = [
  { id:'dashboard',   title:'Live Telemetry',    subtitle:'Real-time infrastructure metrics',       icon:Activity,      path:'/dashboard',    accentColor:'#4F8BFF', widget:<DashboardWidget/> },
  { id:'predictions', title:'Failure Predictions',subtitle:'AI-powered failure forecasting',         icon:Zap,           path:'/predictions',  accentColor:'#F59E0B', widget:<PredictionsWidget/> },
  { id:'incidents',   title:'Incident Center',    subtitle:'Active incidents & root cause analysis', icon:AlertTriangle,  path:'/incidents',    accentColor:'#EF4444', widget:<IncidentsWidget/> },
  { id:'service-map', title:'Service Map',         subtitle:'Interactive service topology graph',     icon:Network,       path:'/service-map',  accentColor:'#63D6FF', widget:<ServiceMapWidget/> },
  { id:'ai-simulator',title:'AI Simulator',        subtitle:'Autonomous scenario simulation engine',  icon:Cpu,           path:'/ai-simulator', accentColor:'#A78BFA', widget:<AIWidget/> },
];

export const ImmersiveWorkspace: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragX = useMotionValue(0);
  const navigate = useNavigate();
  const CARD_WIDTH = 520;
  const CARD_GAP = 28;
  const STEP = CARD_WIDTH + CARD_GAP;

  const handleDragEnd = (_e: any, info: any) => {
    const threshold = 60;
    if (info.offset.x < -threshold && activeIndex < modules.length - 1) {
      setActiveIndex(i => i + 1);
    } else if (info.offset.x > threshold && activeIndex > 0) {
      setActiveIndex(i => i - 1);
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Draggable track */}
      <div className="relative h-[400px] flex items-center">
        <motion.div
          className="flex items-center gap-7 absolute"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.12}
          onDragEnd={handleDragEnd}
          animate={{ x: `calc(50vw - ${activeIndex * STEP + CARD_WIDTH / 2 + 48}px)` }}
          transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          style={{ x: dragX, cursor: 'grab' }}
          whileDrag={{ cursor: 'grabbing' }}
        >
          {modules.map((mod, index) => {
            const isActive = index === activeIndex;
            const dist = Math.abs(index - activeIndex);
            const scale = isActive ? 1 : dist === 1 ? 0.87 : 0.75;
            const opacity = isActive ? 1 : dist === 1 ? 0.6 : 0.35;
            const Icon = mod.icon as any;

            return (
              <motion.div
                key={mod.id}
                animate={{ scale, opacity }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={() => { if (isActive) navigate(mod.path); else setActiveIndex(index); }}
                whileHover={isActive ? { y: -4 } : {}}
                className={`flex-shrink-0 w-[520px] h-[340px] rounded-[24px] bg-surface/80 backdrop-blur-xl border overflow-hidden shadow-[0_16px_50px_rgba(0,0,0,0.5)] select-none ${
                  isActive
                    ? 'border-white/[0.10] cursor-pointer'
                    : 'border-white/[0.05] pointer-events-none'
                }`}
              >
                {/* Window chrome */}
                <div className="h-11 bg-background/50 border-b border-white/[0.05] flex items-center px-4 gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="flex items-center gap-2 flex-1 justify-center -ml-10">
                    <Icon className="w-3.5 h-3.5" style={{ color: mod.accentColor }} />
                    <span className="text-xs font-medium text-text-muted">{mod.title}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 h-[calc(100%-2.75rem)] relative group">
                  <div className="w-full h-full">
                    {mod.widget}
                  </div>

                  {/* Open module overlay */}
                  {isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="absolute inset-0 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-b-[24px]"
                    >
                      <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-background text-xs font-bold shadow-neon">
                        Open Module 
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-2 mt-6">
        {modules.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={`rounded-full transition-all duration-300 ${
              i === activeIndex
                ? 'w-6 h-1.5 bg-primary'
                : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
