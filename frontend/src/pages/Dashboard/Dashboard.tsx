import { useEffect, useState } from 'react';
import { AreaChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area } from 'recharts';
import { Server, Activity, AlertTriangle, CheckCircle, Zap, Play, RotateCcw } from 'lucide-react';
import Beams from '../../components/ui/Beams';
import BorderGlow from '../../components/ui/BorderGlow';

const DEMO_METRICS = { uptime: '99.99%', latency: '45ms', incidents: 2, accuracy: '98.2%' };
const DEMO_CHART = Array.from({ length: 24 }).map((_, i) => ({ 
  time: `${i}:00`, 
  cpu: Math.floor(Math.random() * 30 + 15), 
  memory: Math.floor(Math.random() * 20 + 50), 
  reqs: Math.floor(Math.random() * 800 + 400) 
}));
const DEMO_INCIDENTS = [
  { id: 1, title: 'Database connection pool approaching limit', severity: 'High', status: 'Investigating', time: '10m ago' },
  { id: 2, title: 'Elevated error rate in payment gateway API', severity: 'Critical', status: 'Mitigated', time: '25m ago' }
];

export default function Dashboard() {
  const [mode, setMode] = useState<'live' | 'demo' | null>(() => {
    const saved = localStorage.getItem('autoops_live_mode');
    if (saved === 'true') return 'live';
    if (saved === 'false') return 'demo';
    return null; // Force selection on first visit
  });

  const [metrics, setMetrics] = useState(DEMO_METRICS);
  const [chartData, setChartData] = useState(DEMO_CHART);
  const [incidents, setIncidents] = useState(DEMO_INCIDENTS);
  const [systemState, setSystemState] = useState('Healthy');

  // Listen to global Navbar mode changes (preserve original logic)
  useEffect(() => {
    const handleModeChange = (e: any) => {
      setMode(e.detail ? 'live' : 'demo');
    };
    window.addEventListener('autoops-mode-change', handleModeChange);
    return () => window.removeEventListener('autoops-mode-change', handleModeChange);
  }, []);

  useEffect(() => {
    if (!mode) return;
    
    // Sync to localstorage so Navbar switcher can read it
    localStorage.setItem('autoops_live_mode', String(mode === 'live'));

    if (mode === 'demo') {
      setMetrics(DEMO_METRICS);
      setChartData(DEMO_CHART);
      setIncidents(DEMO_INCIDENTS);
      setSystemState('Healthy');
      return;
    }

    // Live mode fetching (preserves original API endpoints)
    const fetchData = async () => {
      try {
        const [mRes, sRes, iRes] = await Promise.all([
          fetch('http://127.0.0.1:8000/metrics').then(r => r.ok ? r.json() : null),
          fetch('http://127.0.0.1:8000/system-status').then(r => r.ok ? r.json() : null),
          fetch('http://127.0.0.1:8000/incidents').then(r => r.ok ? r.json() : null)
        ]);
        if (mRes) setMetrics(mRes);
        if (sRes?.history) setChartData(sRes.history);
        if (iRes?.incidents) setIncidents(iRes.incidents);
        setSystemState(sRes?.status || 'Healthy');
      } catch (e) {
        console.warn("Backend unavailable, using demo fallback data", e);
        setMode('demo');
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  const selectMode = (selected: 'live' | 'demo') => {
    setMode(selected);
  };

  // Configure telemetry mode selection screen
  if (!mode) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-8 bg-[#060E1E] relative overflow-hidden">
        {/* React Bits Beams animation background */}
        <div className="absolute inset-0 z-0 opacity-45 pointer-events-none">
          <Beams
            beamWidth={2.5}
            beamHeight={16}
            beamNumber={12}
            lightColor="#4F8BFF"
            speed={1.5}
            noiseIntensity={1.2}
            scale={0.15}
            rotation={15}
          />
        </div>

        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-primary/[0.05] rounded-full blur-[80px] pointer-events-none z-1" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-accent/[0.04] rounded-full blur-[80px] pointer-events-none z-1" />
        
        <div className="max-w-3xl w-full text-center space-y-10 relative z-10">
          <div>
            <h1 className="text-3xl md:text-4.5xl font-bold font-heading text-white tracking-tight mb-3">
              Configure telemetry mode
            </h1>
            <p className="text-text-muted text-sm md:text-base max-w-xl mx-auto leading-relaxed">
              Select how AutoOps Pro interfaces with your infrastructure metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            
            {/* Live Mode Selection Card */}
            <button 
              onClick={() => selectMode('live')}
              className="p-7 rounded-2xl bg-surface/60 border border-white/[0.08] hover:border-primary/45 hover:bg-surface hover:shadow-neon flex flex-col text-left justify-between h-64 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-3 bg-primary/10 rounded-xl text-primary border border-primary/20">
                  <Server className="h-5 w-5" />
                </div>
                <span className="w-2 h-2 bg-primary rounded-full animate-ping" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-heading font-semibold text-white">Live Production Mode</h2>
                <p className="text-text-muted text-xs leading-relaxed">
                  Stream real-time diagnostics directly from your locally configured host instances and FastAPI backends.
                </p>
              </div>
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-primary group-hover:translate-x-1 transition-transform">
                <span>Connect API</span>
                <Play className="h-2.5 w-2.5 fill-current" />
              </div>
            </button>

            {/* Demo Mode Selection Card */}
            <button 
              onClick={() => selectMode('demo')}
              className="p-7 rounded-2xl bg-surface/60 border border-white/[0.08] hover:border-accent/40 hover:bg-surface hover:shadow-neon-accent flex flex-col text-left justify-between h-64 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="p-3 bg-accent/10 rounded-xl text-accent border border-accent/20">
                  <Activity className="h-5 w-5" />
                </div>
                <span className="w-2 h-2 bg-accent rounded-full opacity-60" />
              </div>
            <div className="space-y-1">
              <h2 className="text-base font-heading font-semibold text-white">Synthetic Demo Mode</h2>
              <p className="text-text-muted text-xs leading-relaxed">
                Explore full platform capabilities pre-loaded with synthetic CSV diagnostic events and incident flows.
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-accent group-hover:translate-x-1 transition-transform">
              <span>Run Simulator</span>
              <Play className="h-2.5 w-2.5 fill-current" />
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}

return (
  <div className="p-8 bg-background/30 min-h-[calc(100vh-4rem)] text-text-primary overflow-y-auto relative">
    {/* React Bits Beams background for main dashboard */}
    <div className="absolute inset-0 z-0 opacity-35 pointer-events-none">
      <Beams
        beamWidth={2}
        beamHeight={18}
        beamNumber={8}
        lightColor="#4F8BFF"
        speed={1.0}
        noiseIntensity={0.8}
        scale={0.12}
        rotation={12}
      />
    </div>

    <div className="max-w-7xl mx-auto space-y-6 relative z-10">
      
      {/* Header Dashboard section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">System overview</h1>
          <div className="flex items-center gap-3 text-[10px] text-text-muted mt-1.5 font-mono">
            <span className="flex items-center gap-1.5 text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span>Monitoring Active</span>
            </span>
            <span className="text-white/10">•</span>
            <span>Last updated: just now</span>
            <span className="text-white/10">•</span>
            <span>Agent v2.1.0</span>
            <span className="text-white/10">•</span>
            <span className="uppercase">{mode === 'live' ? 'LIVE HOST' : 'SIMULATION'}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setMode(null)}
            className="p-2 px-3.5 rounded-xl border border-white/[0.08] bg-surface text-text-muted text-xs font-semibold hover:text-white hover:bg-elevated transition-colors flex items-center space-x-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Change Mode</span>
          </button>

          <div className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border font-semibold text-xs tracking-wider ${
            systemState === 'Healthy' 
              ? 'bg-accent/10 border-accent/20 text-accent' 
              : 'bg-primary/10 border-primary/20 text-primary'
          }`}>
            <CheckCircle className="h-4 w-4" />
            <span>SYSTEM: {systemState.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* KPI Strip Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {[
          { label: 'Cluster Uptime', val: metrics.uptime, icon: Server, color: 'text-primary', bg: 'bg-primary/10', trend: '100% target', trendType: 'stable' },
          { label: 'Avg Latency', val: metrics.latency, icon: Activity, color: 'text-accent', bg: 'bg-accent/10', trend: '-2.4ms vs last hr', trendType: 'good' },
          { label: 'Active Alerts', val: metrics.incidents, icon: AlertTriangle, color: 'text-white', bg: 'bg-white/10', trend: '0 escalations', trendType: 'neutral' },
          { label: 'AI confidence', val: metrics.accuracy, icon: Zap, color: 'text-accent', bg: 'bg-accent/10', trend: '+0.12% vs last run', trendType: 'good' }
        ].map((item, idx) => (
          <BorderGlow
            key={idx}
            glowSize={180}
            glowOpacity={0.5}
            className="shadow-glass"
          >
            <div className="p-5 relative overflow-hidden h-full flex flex-col justify-between min-h-[110px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-text-muted tracking-widest uppercase">{item.label}</span>
                <div className={`p-2 rounded-xl ${item.bg} ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="text-2xl font-heading font-bold text-white tracking-tight leading-none">{item.val}</div>
                <span className={`text-[9px] font-semibold font-mono tracking-tight ${
                  item.trendType === 'good' ? 'text-accent' :
                  item.trendType === 'stable' ? 'text-primary' : 'text-text-muted'
                }`}>
                  {item.trend}
                </span>
              </div>
            </div>
          </BorderGlow>
        ))}

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Resource Utilization */}
        <BorderGlow
          glowSize={340}
          glowOpacity={0.25}
          className="shadow-glass"
        >
          <div className="p-5 h-[380px] flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-heading font-semibold text-white">Resource utilization</h2>
              <p className="text-[10px] text-text-muted mt-0.5">CPU and Memory consumption percentage over time</p>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -25, right: 10, bottom: 0, top: 10 }}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F8BFF" stopOpacity={0.20}/>
                      <stop offset="95%" stopColor="#4F8BFF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#63D6FF" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#63D6FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0D1728', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
                  <Area type="monotone" name="CPU" dataKey="cpu" stroke="#4F8BFF" strokeWidth={1.5} fillOpacity={1} fill="url(#colorCpu)" />
                  <Area type="monotone" name="Memory" dataKey="memory" stroke="#63D6FF" strokeWidth={1.5} fillOpacity={1} fill="url(#colorMem)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </BorderGlow>

        {/* Chart 2: Request Rate */}
        <BorderGlow
          glowSize={340}
          glowOpacity={0.25}
          className="shadow-glass"
        >
          <div className="p-5 h-[380px] flex flex-col justify-between">
            <div className="mb-4">
              <h2 className="text-base font-heading font-semibold text-white">Requests throughput</h2>
              <p className="text-[10px] text-text-muted mt-0.5">Average request-per-second load rates</p>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 10, bottom: 0, top: 10 }}>
                  <defs>
                    <linearGradient id="colorReqs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#63D6FF" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#63D6FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0D1728', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '11px' }} />
                  <Area type="monotone" name="Requests" dataKey="reqs" stroke="#63D6FF" fillOpacity={1} fill="url(#colorReqs)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </BorderGlow>

      </div>

      {/* Incidents Stream */}
      <div className="bg-surface/80 border border-white/[0.08] p-5 rounded-2xl shadow-glass">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-base font-heading font-semibold text-white">Telemetry incident log</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Active infrastructure events analyzed by models</p>
          </div>
        </div>

        <div className="space-y-3">
          {incidents.map((inc: any, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between bg-elevated/40 p-4.5 rounded-xl border border-white/[0.05] hover:border-primary/20 hover:bg-elevated/70 transition-all duration-300 gap-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-white text-sm">{inc.title}</h3>
                <div className="flex items-center space-x-3 text-[11px] text-text-muted">
                  <span>Status: {inc.status}</span>
                  <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                  <span>{inc.time}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Preserved shades of blue/navy/white badges for severity */}
                <span className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold font-heading uppercase border ${
                  inc.severity === 'Critical' 
                    ? 'bg-white/10 border-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                    : 'bg-primary/10 border-primary/20 text-primary'
                }`}>
                  {inc.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  </div>
);
}
