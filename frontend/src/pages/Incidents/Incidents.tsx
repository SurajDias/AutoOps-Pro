import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, ChevronDown, Activity, Clock, FileText, Check } from 'lucide-react';

const DEMO_INCIDENTS = [
  { id: 'INC-1023', title: 'Database connection pool approaching limit', severity: 'High', status: 'Investigating', time: '10 mins ago', rca: 'Surge in user logins caused DB pool exhaustion. Suggested fix: Increase max_connections and add read replicas.' },
  { id: 'INC-1022', title: 'Elevated error rate in payment gateway', severity: 'Critical', status: 'Mitigated', time: '1 hour ago', rca: 'Third-party API timeout. AI automatically routed traffic to fallback gateway.' },
  { id: 'INC-1021', title: 'High memory usage in caching layer', severity: 'Medium', status: 'Resolved', time: '5 hours ago', rca: 'Cache eviction policy failure. Resolved by restarting Redis pods and updating TTL policy.' }
];

export default function Incidents() {
  const [incidents, setIncidents] = useState(DEMO_INCIDENTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Preserving original fetch path and logic
    fetch('http://127.0.0.1:8000/incidents')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.incidents) setIncidents(data.incidents); })
      .catch(() => console.warn('Using demo incident data'));
  }, []);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return {
          iconColor: 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]',
          badge: 'bg-white/10 border-white/20 text-white shadow-[0_0_10px_rgba(255,255,255,0.1)]'
        };
      case 'High':
        return {
          iconColor: 'text-accent',
          badge: 'bg-accent/10 border-accent/20 text-accent'
        };
      default:
        return {
          iconColor: 'text-primary',
          badge: 'bg-primary/10 border-primary/20 text-primary'
        };
    }
  };

  return (
    <div className="p-8 bg-background min-h-screen text-text-primary">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-white/[0.06] pb-5">
          <h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">Incident Management</h1>
          <p className="text-text-muted text-xs mt-1 leading-relaxed">
            Real-time tracking of active outages, anomalies, and auto-generated mitigation flows
          </p>
        </div>

        {/* Incidents stream list */}
        <div className="space-y-4">
          {incidents.map((inc: any, i) => {
            const styles = getSeverityStyle(inc.severity);
            const isExpanded = expandedId === String(inc.id);

            return (
              <motion.div 
                key={inc.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.08 }} 
                className="bg-surface/80 border border-white/[0.08] rounded-2xl overflow-hidden shadow-glass"
              >
                {/* Accordion header click trigger */}
                <div 
                  onClick={() => setExpandedId(isExpanded ? null : String(inc.id))} 
                  className="p-5 cursor-pointer hover:bg-elevated/45 transition-colors flex items-center justify-between gap-4 select-none"
                >
                  <div className="flex items-center space-x-4">
                    <AlertOctagon className={`h-7 w-7 shrink-0 ${styles.iconColor}`} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold font-heading text-white tracking-tight">{inc.id}: {inc.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${styles.badge}`}>
                          {inc.severity}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1.5 text-xs text-text-muted">
                        <span className="flex items-center space-x-1">
                          <Activity className="h-3.5 w-3.5" />
                          <span>Status: {inc.status}</span>
                        </span>
                        <span className="w-1 h-1 bg-white/10 rounded-full" />
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{inc.time}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                </div>

                {/* Expanded details container */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }} 
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="border-t border-white/[0.06] bg-elevated/20"
                    >
                      <div className="p-6 space-y-4">
                        <div>
                          <h4 className="text-primary font-heading font-semibold text-xs uppercase tracking-wider mb-1.5">
                            Automated Root Cause Analysis
                          </h4>
                          <p className="text-text-muted text-xs leading-relaxed font-body">{inc.rca}</p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2.5 pt-2">
                          <button className="px-4 py-2 bg-gradient-to-r from-primary to-accent text-background text-xs font-bold rounded-lg hover:shadow-neon transition-all flex items-center space-x-1.5">
                            <Check className="h-3.5 w-3.5" />
                            <span>Apply Fix</span>
                          </button>
                          <button className="px-4 py-2 border border-white/[0.08] bg-elevated text-text-primary text-xs font-semibold rounded-lg hover:bg-elevated/80 hover:border-primary/20 transition-all flex items-center space-x-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>View Logs</span>
                          </button>
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
    </div>
  );
}
