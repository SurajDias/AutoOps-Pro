import React from 'react';
import GlassCard from './GlassCard';
import { motion } from 'framer-motion';

interface HeatmapCardProps {
  title: string;
  delay?: number;
}

const HeatmapCard: React.FC<HeatmapCardProps> = ({ title, delay = 0 }) => {
  const services = Array.from({ length: 42 }).map((_, i) => ({
    id: i,
    status: Math.random() > 0.85 ? 'warning' : Math.random() > 0.95 ? 'error' : 'ok',
  }));

  const getColor = (status: string) => {
    switch(status) {
      case 'ok': return 'bg-accent/80 hover:bg-accent';
      case 'warning': return 'bg-yellow-500/80 hover:bg-yellow-500';
      case 'error': return 'bg-red-500/80 hover:bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse';
      default: return 'bg-white/10';
    }
  };

  return (
    <GlassCard delay={delay} className="flex flex-col h-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-text-muted">{title}</h3>
        <div className="flex gap-2 text-xs text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent/80"></span> OK</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/80"></span> Err</span>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-1.5 flex-1 place-content-center">
        {services.map((service) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: delay + (service.id * 0.01) }}
            className={`w-full aspect-square rounded-[3px] ${getColor(service.status)} transition-colors cursor-pointer relative group`}
          >
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-card border border-white/10 px-2 py-1 rounded text-[10px] opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity font-medium">
              Service {service.id}
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
};

export default HeatmapCard;
