import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FiAlertTriangle, FiClock, FiTrendingUp, FiCheckCircle, FiDatabase, FiServer, FiCpu, FiWifi, FiZap, FiInfo } from 'react-icons/fi';
import GlassCard from '../../components/cards/GlassCard';
import ChartCard from '../../components/cards/ChartCard';
import CountdownTimer from '../../components/cards/CountdownTimer';

const API_URL = 'http://127.0.0.1:8000';

const predictions = [
  {
    id: 1, title: 'Database Overload Predicted', service: 'PostgreSQL Primary',
    initialSeconds: 1112, confidence: 89, severity: 'critical',
    recommendation: 'Scale read replicas from 2 → 4 and enable connection pooling.',
    icon: FiDatabase,
    reasons: ['Traffic spike detected (+230%)', 'DB connections at 92% capacity', 'Pattern matches INC-2801 from last week'],
  },
  {
    id: 2, title: 'API Gateway Latency Spike', service: 'Kong Gateway',
    initialSeconds: 2520, confidence: 76, severity: 'warning',
    recommendation: 'Pre-warm cache layer and increase rate limiting threshold.',
    icon: FiWifi,
    reasons: ['Partner API integration volume 3x baseline', 'Cache miss rate rising to 18%', 'P99 latency trending above 400ms'],
  },
  {
    id: 3, title: 'Memory Exhaustion Risk', service: 'Order Service',
    initialSeconds: 4500, confidence: 68, severity: 'warning',
    recommendation: 'Trigger garbage collection cycle and restart stale workers.',
    icon: FiCpu,
    reasons: ['Memory grows linearly over 6h', 'GC cycle delayed by 2 intervals', 'Heap fragmentation at 34%'],
  },
  {
    id: 4, title: 'Disk I/O Saturation', service: 'Logging Pipeline',
    initialSeconds: 9000, confidence: 54, severity: 'low',
    recommendation: 'Rotate logs and archive cold data to object storage.',
    icon: FiServer,
    reasons: ['Log volume increased 40% this week', 'Disk utilization at 71%', 'No rotation in 48 hours'],
  },
];

const overallTrend = Array.from({ length: 24 }).map((_, i) => ({
  name: `${i}h`, Anomalies: Math.floor(Math.random() * 8) + (i > 16 ? 5 : 1),
}));

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', bar: '#ef4444', glow: 'shadow-[0_0_25px_rgba(239,68,68,0.15)]' };
    case 'warning': return { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', bar: '#eab308', glow: 'shadow-[0_0_25px_rgba(234,179,8,0.1)]' };
    default: return { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', bar: '#3b82f6', glow: '' };
  }
};

const Predictions: React.FC = () => {
  const [simulatingId, setSimulatingId] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<any>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/system-status`);
        setLiveStatus(await res.json());
      } catch (err) {
        console.error('Failed to load live prediction state', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateFix = (id: number) => {
    setSimulatingId(id);
    setTimeout(() => setSimulatingId(null), 2500);
  };

  const secondsFromForecast = (forecast?: string) => {
    if (!forecast || forecast.includes('No failure')) return 7200;
    const match = forecast.match(/(\d+)/);
    return match ? Number(match[1]) * 60 : 900;
  };

  const livePrediction = liveStatus ? {
    id: 0,
    title: liveStatus.prediction || 'Live Failure Forecast',
    service: liveStatus.service || 'payment',
    initialSeconds: secondsFromForecast(liveStatus.time_to_failure),
    confidence: liveStatus.confidence || 60,
    severity: liveStatus.risk === 'Critical' || liveStatus.severity === 'High' ? 'critical' : liveStatus.severity === 'Medium' ? 'warning' : 'low',
    recommendation: `${liveStatus.recommended_action || 'continue_monitoring'} - ${liveStatus.reason || 'AI is evaluating live metrics.'}`,
    icon: liveStatus.primary_issue?.includes('Memory') ? FiCpu : liveStatus.primary_issue?.includes('Response') ? FiDatabase : FiServer,
    reasons: liveStatus.explainability || ['Live metrics are being evaluated by the anomaly and root-cause engines.'],
  } : null;

  const displayedPredictions = livePrediction ? [livePrediction, ...predictions.slice(1)] : predictions;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">AI Failure Predictions</h1>
          <p className="text-text-muted text-sm">Proactive anomaly detection and predictive failure analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
          </span>
          <span className="text-sm text-accent font-medium">Live Scanning</span>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Predictions', value: '4', icon: FiTrendingUp, color: 'text-accent' },
          { label: 'Critical Alerts', value: '1', icon: FiAlertTriangle, color: 'text-red-400' },
          { label: 'Avg Confidence', value: '71.8%', icon: FiCheckCircle, color: 'text-blue-400' },
          { label: 'Prevented Today', value: '7', icon: FiCheckCircle, color: 'text-accent' },
        ].map((stat, idx) => (
          <GlassCard key={idx} delay={0.1 * idx} className="flex items-center gap-4 h-20">
            <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}><stat.icon size={20} /></div>
            <div>
              <p className="text-xs text-text-muted">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Prediction Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayedPredictions.map((pred, idx) => {
          const colors = getSeverityColor(pred.severity);
          const isSimulating = simulatingId === pred.id;
          return (
            <motion.div
              key={pred.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * idx, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className={`glass-card p-5 border ${colors.border} ${colors.glow} relative overflow-hidden`}
            >
              {pred.severity === 'critical' && (
                <motion.div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-[50px] pointer-events-none" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} />
              )}

              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.text}`}><pred.icon size={20} /></div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{pred.title}</h3>
                    <p className="text-text-muted text-xs">{pred.service}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                  {pred.severity}
                </span>
              </div>

              {/* Countdown + Confidence */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-background/40 rounded-xl p-3 flex items-center gap-3">
                  <CountdownTimer initialSeconds={pred.initialSeconds} label="" size="sm" />
                  <div>
                    <div className="flex items-center gap-1 text-text-muted text-[10px] mb-0.5"><FiClock size={10} /> TIME LEFT</div>
                    <p className="text-white font-bold text-base">Live</p>
                  </div>
                </div>
                <div className="bg-background/40 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-text-muted text-xs mb-1"><FiTrendingUp size={12} /> Confidence</div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-lg">{pred.confidence}%</p>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pred.confidence}%` }} transition={{ delay: 0.3 + idx * 0.15, duration: 0.8 }} className="h-full rounded-full" style={{ backgroundColor: colors.bar }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              <div className="bg-background/40 rounded-xl p-3 mb-3">
                <p className="text-xs text-text-muted mb-1 font-medium">Recommended Action</p>
                <p className="text-sm text-text-primary leading-relaxed">{pred.recommendation}</p>
              </div>

              {/* FEATURE 5: Explainability Panel */}
              <div className="bg-background/30 border border-white/5 rounded-xl p-3 mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <FiInfo size={12} className="text-text-muted" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Why This Is Predicted</span>
                </div>
                <ul className="space-y-1.5">
                  {pred.reasons.map((reason: string, i: number) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-start gap-2 text-xs text-text-secondary">
                      <span className="w-1 h-1 rounded-full bg-text-muted mt-1.5 shrink-0" />
                      {reason}
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* FEATURE 4: Simulate Fix Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSimulateFix(pred.id)}
                disabled={isSimulating}
                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
                  ${isSimulating ? 'bg-accent/20 text-accent border border-accent/30 cursor-wait' : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-accent/10 hover:text-accent hover:border-accent/30'}`}
              >
                {isSimulating ? (
                  <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-3.5 h-3.5 border-2 border-accent/30 border-t-accent rounded-full" /> Simulating Fix...</>
                ) : (
                  <><FiZap size={14} /> Simulate Fix</>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      <ChartCard title="Anomaly Forecast Timeline" subtitle="Predicted anomalies over the next 24 hours" data={overallTrend} dataKey="Anomalies" color="#ef4444" delay={0.6} type="area" />
    </div>
  );
};

export default Predictions;
