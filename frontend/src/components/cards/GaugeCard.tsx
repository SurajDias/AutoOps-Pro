import React from 'react';
import GlassCard from './GlassCard';
import { ResponsiveContainer, RadialBarChart, RadialBar } from 'recharts';

interface GaugeCardProps {
  title: string;
  value: number;
  label: string;
  delay?: number;
  color?: string;
}

const GaugeCard: React.FC<GaugeCardProps> = ({ title, value, label, delay = 0, color = '#22c55e' }) => {
  const data = [
    { name: 'background', value: 100, fill: 'rgba(255,255,255,0.05)' },
    { name: 'progress', value: value, fill: color },
  ];

  return (
    <GlassCard delay={delay} className="flex flex-col h-64 relative items-center justify-center">
      <div className="absolute top-5 left-5 right-5 text-left">
        <h3 className="text-sm font-medium text-text-muted">{title}</h3>
      </div>
      
      <div className="w-full h-full relative flex items-center justify-center mt-6">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="65%" 
            outerRadius="80%" 
            barSize={12} 
            data={data} 
            startAngle={225} 
            endAngle={-45}
          >
            <RadialBar background={false} dataKey="value" cornerRadius={10} />
          </RadialBarChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
          <span className="text-3xl font-bold text-white tracking-tight">{value}%</span>
          <span className="text-xs text-text-muted mt-1 uppercase tracking-wider">{label}</span>
        </div>
      </div>
    </GlassCard>
  );
};

export default GaugeCard;
