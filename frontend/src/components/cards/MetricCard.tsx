import React from 'react';
import GlassCard from './GlassCard';
import { ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  delay?: number;
  chartData?: { value: number }[];
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, icon, delay, chartData }) => {
  return (
    <GlassCard delay={delay} className="flex flex-col justify-between h-40 relative overflow-hidden">
      <div className="flex justify-between items-start z-10">
        <div>
          <p className="text-sm font-medium text-text-muted mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
        <div className="p-2 bg-white/5 rounded-lg text-accent">
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between z-10 mt-auto">
        {trend && (
          <div className={`flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-accent' : 'text-red-400'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-text-muted text-xs font-normal ml-1">vs last hr</span>
          </div>
        )}
      </div>

      {chartData && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="value" fill="#22c55e" radius={[2, 2, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.5 + (index / chartData.length) * 0.5} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </GlassCard>
  );
};

export default MetricCard;
