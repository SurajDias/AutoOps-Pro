import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, ShieldAlert } from 'lucide-react';

const DEMO_PREDICTIONS = [
  { id: 1, service: 'Payment Gateway API', issue: 'Memory Leak Detected', timeToFailure: '4h 15m', severity: 'Critical', confidence: 94 },
  { id: 2, service: 'User Authentication', issue: 'Connection Pool Exhaustion', timeToFailure: '12h 30m', severity: 'High', confidence: 87 },
  { id: 3, service: 'Elasticsearch Cluster', issue: 'Storage Capacity Limit', timeToFailure: '2d 5h', severity: 'Medium', confidence: 76 }
];

export default function Predictions() {
  const [predictions, setPredictions] = useState(DEMO_PREDICTIONS);
  const [simulating, setSimulating] = useState<number | null>(null);

  useEffect(() => {
    // Preserving original fetch path and logic
    fetch('http://127.0.0.1:8000/system-status')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.predictions) setPredictions(data.predictions); })
      .catch(() => console.warn('Using demo prediction data'));
  }, []);

  const handleSimulate = (id: number) => {
    setSimulating(id);
    setTimeout(() => setSimulating(null), 3000);
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return {
          bar: 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)]',
          text: 'text-white border-white/20 bg-white/5',
          iconColor: 'text-white'
        };
      case 'High':
        return {
          bar: 'bg-accent',
          text: 'text-accent border-accent/20 bg-accent/5',
          iconColor: 'text-accent'
        };
      default:
        return {
          bar: 'bg-primary',
          text: 'text-primary border-primary/20 bg-primary/5',
          iconColor: 'text-primary'
        };
    }
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
    <div className="p-8 bg-background min-h-screen text-text-primary">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-white/[0.06] pb-5">
          <h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">Failure Predictions</h1>
          <p className="text-text-muted text-xs mt-1 leading-relaxed">
            Machine learning models forecasting system limits and degradation indexes
          </p>
        </div>

        {/* Prediction cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {predictions.map((pred, i) => {
            const styles = getSeverityStyle(pred.severity);
            
            return (
              <motion.div 
                key={pred.id} 
                initial={{ opacity: 0, y: 15 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: i * 0.08 }} 
                className="bg-surface/80 border border-white/[0.08] rounded-2xl p-6 relative overflow-hidden shadow-glass"
              >
                {/* Left indicator accent strip */}
                <div className={`absolute top-0 left-0 w-1.5 h-full ${styles.bar}`} />
                
                <div className="flex justify-between items-start mb-4 pl-1.5">
                  <div>
                    <h3 className="text-lg font-bold font-heading text-white tracking-tight leading-tight">{pred.service}</h3>
                    <p className="text-text-muted text-xs mt-1">{pred.issue}</p>
                  </div>
                  
                  {/* SVG Confidence ring */}
                  <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="22" cy="22" r="18" className="stroke-white/[0.04]" strokeWidth="3" fill="none" />
                      <circle 
                        cx="22" 
                        cy="22" 
                        r="18" 
                        className="stroke-primary" 
                        strokeWidth="3" 
                        fill="none" 
                        strokeDasharray="113" 
                        strokeDashoffset={113 - (113 * pred.confidence) / 100} 
                        strokeLinecap="round" 
                      />
                    </svg>
                    <span className="absolute text-[10px] font-bold font-heading text-white">{pred.confidence}%</span>
                  </div>
                </div>

                {/* Details bar */}
                <div className="flex items-center space-x-5 mb-5 pl-1.5 text-xs">
                  <div className="flex items-center space-x-1.5 text-accent font-semibold">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>TTF: {pred.timeToFailure}</span>
                  </div>
                  <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-lg border font-bold uppercase ${styles.text}`}>
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    <span>{pred.severity}</span>
                  </div>
                </div>

                {/* Simulation control button */}
                <button 
                  onClick={() => handleSimulate(pred.id)} 
                  disabled={simulating === pred.id} 
                  className="w-full flex items-center justify-center space-x-2 bg-elevated border border-white/[0.06] text-text-primary py-2.5 rounded-xl text-xs font-semibold hover:bg-elevated/80 hover:border-primary/30 transition-all"
                >
                  {simulating === pred.id ? (
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }} 
                      className="w-4.5 h-4.5 border-2 border-primary border-t-transparent rounded-full" 
                    />
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Simulate Fix</span>
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
