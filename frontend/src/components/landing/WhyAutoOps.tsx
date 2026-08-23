import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Zap } from 'lucide-react';

const rows = [
  { feature: 'Failure prediction before impact', autoops: true,  legacy: false },
  { feature: 'Automated root cause analysis',    autoops: true,  legacy: false },
  { feature: 'Real-time anomaly detection',      autoops: true,  legacy: true  },
  { feature: 'Service dependency mapping',       autoops: true,  legacy: false },
  { feature: 'AI scenario simulation',           autoops: true,  legacy: false },
  { feature: 'Zero-downtime incident handling',  autoops: true,  legacy: false },
  { feature: 'Reactive alerting only',           autoops: false, legacy: true  },
];

export const WhyAutoOps: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-surface/60 backdrop-blur-xl shadow-glass">
        {/* Table header */}
        <div className="grid grid-cols-3 border-b border-white/[0.06] bg-background/40">
          <div className="py-4 px-6 text-xs font-semibold text-text-muted uppercase tracking-wider">Feature</div>
          <div className="py-4 px-4 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/15 border border-primary/25">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">AutoOps Pro</span>
            </div>
          </div>
          <div className="py-4 px-4 text-center">
            <span className="text-xs font-semibold text-text-muted">Legacy Monitoring</span>
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <motion.div
            key={row.feature}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
          >
            <div className="py-3.5 px-6 text-sm text-text-muted flex items-center">{row.feature}</div>
            <div className="py-3.5 px-4 flex items-center justify-center">
              {row.autoops
                ? <div className="w-6 h-6 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-emerald-400" /></div>
                : <div className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center"><X className="w-3.5 h-3.5 text-rose-500/60" /></div>
              }
            </div>
            <div className="py-3.5 px-4 flex items-center justify-center">
              {row.legacy
                ? <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-emerald-500/60" /></div>
                : <div className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center"><X className="w-3.5 h-3.5 text-text-muted/40" /></div>
              }
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
