import React from 'react';
import GlassCard from './GlassCard';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, BarChart, Bar } from 'recharts';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  data: any[];
  dataKey: string;
  color?: string;
  delay?: number;
  className?: string;
  type?: 'line' | 'area' | 'bar';
}

const ChartCard: React.FC<ChartCardProps> = ({ title, subtitle, data, dataKey, color = '#22c55e', delay = 0, className = '', type = 'area' }) => {
  return (
    <GlassCard delay={delay} className={`flex flex-col h-80 ${className}`}>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>
      
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121821', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : type === 'area' ? (
            <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121821', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey})`} />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121821', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 0 }} activeDot={{ r: 6, fill: color, stroke: '#121821', strokeWidth: 2 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
};

export default ChartCard;
