import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiChevronDown, FiChevronUp, FiZap, FiDatabase, FiServer, FiWifi, FiInfo } from 'react-icons/fi';
import GlassCard from '../../components/cards/GlassCard';

interface Incident {
  id: number; title: string; status: 'resolved' | 'active' | 'investigating'; severity: 'critical' | 'warning' | 'info';
  timestamp: string; duration: string; rootCause: string; impact: string; resolution: string;
  affectedServices: string[]; icon: React.ElementType;
  whyReasons: string[];
}

const incidents: Incident[] = [
  {
    id: 1, title: 'Database Connection Pool Exhaustion', status: 'resolved', severity: 'critical',
    timestamp: '2026-03-29 14:23 UTC', duration: '12 min',
    rootCause: 'Connection leak in order-service v3.2.1 caused pool saturation. Unclosed connections accumulated during peak traffic window.',
    impact: 'Payment processing latency increased 340%. 1,240 transactions affected. Cascade delay to notification service.',
    resolution: 'AI agent auto-scaled read replicas and killed stale connections. Hotfix deployed to order-service v3.2.2.',
    affectedServices: ['PostgreSQL Primary', 'Order Service', 'Payment Service'], icon: FiDatabase,
    whyReasons: ['Connection leak detected in order-service v3.2.1', 'Peak traffic window exceeded 2x capacity', 'Similar to pattern from INC-2755 (2 weeks ago)'],
  },
  {
    id: 2, title: 'API Gateway Rate Limit Breach', status: 'active', severity: 'warning',
    timestamp: '2026-03-29 16:05 UTC', duration: 'Ongoing',
    rootCause: 'Sudden traffic spike from partner integration (3x normal volume). Rate limiter configured for old traffic baseline.',
    impact: '15% of API requests returning 429 errors. Partner webhook deliveries delayed.',
    resolution: 'AI agent recommends dynamic rate limit adjustment. Awaiting operator confirmation.',
    affectedServices: ['API Gateway', 'Auth Service'], icon: FiWifi,
    whyReasons: ['Partner API traffic 3x above baseline', 'Rate limiter config not updated since v2.8', 'No auto-scaling policy for gateway tier'],
  },
  {
    id: 3, title: 'Memory Leak in Auth Service', status: 'resolved', severity: 'critical',
    timestamp: '2026-03-28 09:12 UTC', duration: '28 min',
    rootCause: 'JWT token cache not evicting expired entries. Memory usage grew linearly over 6 hours until OOM kill triggered.',
    impact: 'Auth service restarted 3 times. 890 users experienced login failures during restart windows.',
    resolution: 'AI predicted failure 45 min before OOM. Graceful restart executed with zero-downtime rolling deployment.',
    affectedServices: ['Auth Service', 'API Gateway'], icon: FiServer,
    whyReasons: ['JWT cache eviction policy misconfigured', 'Memory growth rate matched OOM pattern', 'AI predicted OOM 45 min in advance'],
  },
  {
    id: 4, title: 'Cascade Failure in Payment Pipeline', status: 'investigating', severity: 'warning',
    timestamp: '2026-03-29 15:45 UTC', duration: 'Ongoing',
    rootCause: 'Under investigation. Correlates with upstream database incident. Circuit breaker tripped on payment-processor.',
    impact: 'Payment retries increasing. Queue depth growing at 120 msgs/min.',
    resolution: 'AI agent monitoring queue depth. Auto-remediation will trigger if queue exceeds 5,000 threshold.',
    affectedServices: ['Payment Service', 'Order Service', 'Notification Service'], icon: FiZap,
    whyReasons: ['Correlates with INC-1 database exhaustion', 'Circuit breaker tripped 3 times in 10 min', 'Message queue backlog growing exponentially'],
  },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'resolved': return { text: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30', dot: 'bg-accent' };
    case 'active': return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30', dot: 'bg-red-400 animate-pulse' };
    case 'investigating': return { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', dot: 'bg-yellow-400 animate-pulse' };
    default: return { text: 'text-text-muted', bg: 'bg-white/5', border: 'border-white/10', dot: 'bg-white/50' };
  }
};

const getSeverityStyle = (severity: string) => {
  switch (severity) {
    case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/30';
    case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    default: return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
  }
};

const Incidents: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(1);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Incident Reports</h1>
          <p className="text-text-muted text-sm">AI-generated root cause analysis and resolution tracking</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-card border border-white/5 text-sm font-medium hover:bg-white/5 transition-colors flex items-center gap-2">
            <FiClock size={14} /> Last 48 Hours
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Incidents', value: '4', icon: FiAlertTriangle, color: 'text-yellow-400' },
          { label: 'Active Now', value: '2', icon: FiZap, color: 'text-red-400' },
          { label: 'Resolved (AI)', value: '2', icon: FiCheckCircle, color: 'text-accent' },
          { label: 'Avg Resolution', value: '20 min', icon: FiClock, color: 'text-blue-400' },
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

      <div className="space-y-4">
        {incidents.map((incident, idx) => {
          const statusStyle = getStatusStyle(incident.status);
          const isExpanded = expandedId === incident.id;
          return (
            <motion.div key={incident.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * idx, duration: 0.4 }} className="glass-card overflow-hidden">
              <button onClick={() => setExpandedId(isExpanded ? null : incident.id)} className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 rounded-xl ${statusStyle.bg} ${statusStyle.text}`}><incident.icon size={20} /></div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{incident.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-text-muted text-xs flex items-center gap-1"><FiClock size={10} /> {incident.timestamp}</span>
                      <span className="text-text-muted text-xs">Duration: {incident.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusStyle.dot}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${statusStyle.text}`}>{incident.status}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${getSeverityStyle(incident.severity)}`}>{incident.severity}</span>
                  {isExpanded ? <FiChevronUp className="text-text-muted" /> : <FiChevronDown className="text-text-muted" />}
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                    <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-background/40 rounded-xl p-4">
                          <h4 className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">Root Cause</h4>
                          <p className="text-sm text-text-primary leading-relaxed">{incident.rootCause}</p>
                        </div>
                        <div className="bg-background/40 rounded-xl p-4">
                          <h4 className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">System Impact</h4>
                          <p className="text-sm text-text-primary leading-relaxed">{incident.impact}</p>
                        </div>
                        <div className="bg-background/40 rounded-xl p-4">
                          <h4 className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">Resolution</h4>
                          <p className="text-sm text-text-primary leading-relaxed">{incident.resolution}</p>
                        </div>
                      </div>

                      {/* FEATURE 5: Explainability Panel */}
                      <div className="bg-background/30 border border-white/5 rounded-xl p-4">
                        <div className="flex items-center gap-1.5 mb-2">
                          <FiInfo size={12} className="text-text-muted" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Why This Happened</span>
                        </div>
                        <ul className="space-y-1.5">
                          {incident.whyReasons.map((reason, i) => (
                            <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }} className="flex items-start gap-2 text-xs text-text-secondary">
                              <span className="w-1 h-1 rounded-full bg-text-muted mt-1.5 shrink-0" />
                              {reason}
                            </motion.li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {incident.affectedServices.map((svc) => (
                          <span key={svc} className="px-3 py-1 rounded-full text-xs bg-white/5 text-text-secondary border border-white/10">{svc}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Incidents;
