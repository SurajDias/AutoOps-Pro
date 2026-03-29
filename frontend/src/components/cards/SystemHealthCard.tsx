import React from 'react';
import GlassCard from './GlassCard';
import { motion } from 'framer-motion';

const SystemHealthCard: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <GlassCard delay={delay} className="flex flex-col h-40 relative overflow-hidden group">
      <div className="absolute -right-8 -top-8 w-28 h-28 bg-accent/20 rounded-full blur-[32px] group-hover:bg-accent/30 transition-colors pointer-events-none"></div>
      
      <div className="flex justify-between items-center z-10">
        <h3 className="text-sm font-medium text-text-muted">System Status</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
          <motion.div 
            animate={{ opacity: [1, 0.5, 1] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_#22c55e]"
          />
          <span className="text-xs font-bold text-accent tracking-wide uppercase">Operational</span>
        </div>
      </div>
      
      <div className="mt-auto z-10 flex gap-6">
        <div>
          <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">Uptime</p>
          <p className="text-2xl font-bold text-white tracking-tight">99.99<span className="text-sm text-text-muted ml-0.5">%</span></p>
        </div>
        <div className="pl-6 border-l border-white/10">
          <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wider font-semibold">Active Nodes</p>
          <p className="text-2xl font-bold text-white tracking-tight">1,204</p>
        </div>
      </div>
    </GlassCard>
  );
};

export default SystemHealthCard;
