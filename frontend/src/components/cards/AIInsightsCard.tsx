import React from 'react';
import GlassCard from './GlassCard';
import { FiAlertTriangle, FiCpu, FiTrendingUp } from 'react-icons/fi';

const AIInsightsCard: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  const insights = [
    { type: 'alert', title: 'Anomaly Detected', desc: 'DB connections spiked in segment us-east-1.', icon: FiAlertTriangle, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
    { type: 'info', title: 'Optimization suggested', desc: 'Scale down cluster C to save 12% resources.', icon: FiTrendingUp, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    { type: 'insight', title: 'Pattern Recognized', desc: 'Memory usage correlates with high user logins.', icon: FiCpu, color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
  ];

  return (
    <GlassCard delay={delay} className="flex flex-col h-80">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-base font-semibold text-white">AI Assistant Insights</h3>
        <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium border border-accent/20">AutoPilot ON</span>
      </div>
      
      <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {insights.map((item, idx) => (
          <div key={idx} className="flex gap-3 p-3 rounded-xl border border-white/5 bg-background/40 hover:bg-white/5 transition-all cursor-pointer group hover:-translate-y-0.5 shadow-sm hover:shadow-md">
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${item.bg} ${item.color}`}>
              <item.icon size={14} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-white group-hover:text-accent transition-colors">{item.title}</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};

export default AIInsightsCard;
