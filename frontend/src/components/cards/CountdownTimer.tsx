import React from 'react';
import { motion } from 'framer-motion';
import useCountdown from '../../hooks/useCountdown';

interface CountdownTimerProps {
  initialSeconds: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ initialSeconds, label = 'Time Remaining', size = 'md' }) => {
  const { formatted, percent } = useCountdown(initialSeconds);

  const getColor = () => {
    if (percent > 60) return { stroke: '#22c55e', text: 'text-accent', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.4)]' };
    if (percent > 30) return { stroke: '#eab308', text: 'text-yellow-400', glow: 'shadow-[0_0_15px_rgba(234,179,8,0.4)]' };
    return { stroke: '#ef4444', text: 'text-red-400', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' };
  };

  const colors = getColor();
  const radius = size === 'lg' ? 40 : size === 'md' ? 30 : 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  const svgSize = (radius + 6) * 2;

  return (
    <div className={`flex flex-col items-center gap-1 ${colors.glow} rounded-full p-1`}>
      <div className="relative" style={{ width: svgSize, height: svgSize }}>
        <svg width={svgSize} height={svgSize} className="transform -rotate-90">
          <circle cx={radius + 6} cy={radius + 6} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={4} fill="none" />
          <motion.circle
            cx={radius + 6} cy={radius + 6} r={radius}
            stroke={colors.stroke}
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono font-bold ${colors.text} ${size === 'lg' ? 'text-sm' : size === 'md' ? 'text-[11px]' : 'text-[9px]'}`}>
            {formatted}
          </span>
        </div>
      </div>
      {label && <span className="text-[9px] text-text-muted uppercase tracking-wider font-semibold">{label}</span>}
    </div>
  );
};

export default CountdownTimer;
