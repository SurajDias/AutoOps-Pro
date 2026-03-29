import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiTrendingUp, FiAlertTriangle, FiMap, FiMessageSquare, FiFileText, FiArrowRight } from 'react-icons/fi';
import { motion } from 'framer-motion';
import MetricCard from '../../components/cards/MetricCard';
import ChartCard from '../../components/cards/ChartCard';
import GaugeCard from '../../components/cards/GaugeCard';
import HeatmapCard from '../../components/cards/HeatmapCard';
import AIInsightsCard from '../../components/cards/AIInsightsCard';
import SystemHealthCard from '../../components/cards/SystemHealthCard';
import CountdownTimer from '../../components/cards/CountdownTimer';

const activityData = [
  { name: '1', value: 40 }, { name: '2', value: 70 }, { name: '3', value: 45 },
  { name: '4', value: 90 }, { name: '5', value: 65 }, { name: '6', value: 85 },
  { name: '7', value: 100 },
];

const trafficData = Array.from({ length: 12 }).map((_, i) => ({
  name: `${i * 2}h`,
  Requests: Math.floor(Math.random() * 5000) + 1000,
}));

const metricsData = Array.from({ length: 20 }).map((_, i) => ({
  name: `T-${20 - i}`,
  CPU: Math.floor(Math.random() * 40) + 20,
  Memory: Math.floor(Math.random() * 30) + 40,
}));

const quickActions = [
  { label: 'Predictions', path: '/predictions', icon: FiTrendingUp, desc: 'AI failure forecasts', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  { label: 'Incidents', path: '/incidents', icon: FiAlertTriangle, desc: 'Root cause reports', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  { label: 'Service Map', path: '/service-map', icon: FiMap, desc: 'Topology & dependencies', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
  { label: 'AI Simulator', path: '/ai-simulator', icon: FiMessageSquare, desc: 'What-if scenarios', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
  { label: 'Logs', path: '/logs', icon: FiFileText, desc: 'Activity timeline', color: 'text-accent', bg: 'bg-accent/10 border-accent/20' },
];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">System Overview</h1>
          <p className="text-text-muted text-sm">Real-time monitoring and AI infrastructure insights</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg bg-card border border-white/5 text-sm font-medium hover:bg-white/5 transition-colors">
            Last 24 Hours
          </button>
          <button className="px-4 py-2 rounded-lg bg-accent text-background font-semibold text-sm hover:bg-accent-hover transition-colors shadow-neon">
            Generate Report
          </button>
        </div>
      </header>

      {/* FEATURE 7: AI Insight Highlight Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        onClick={() => navigate('/predictions')}
        className="relative overflow-hidden rounded-2xl border border-red-400/30 bg-gradient-to-r from-card via-card to-red-950/20 p-6 cursor-pointer group hover:border-red-400/50 transition-all"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-red-500/15 transition-colors" />
        <motion.div className="absolute -top-1 -left-1 -right-1 -bottom-1 rounded-2xl border border-red-400/20 pointer-events-none" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <CountdownTimer initialSeconds={1112} label="" size="lg" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FiAlertTriangle className="text-red-400" size={16} />
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">⚠️ Failure Predicted</span>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Database overload predicted in 18 minutes</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-text-muted">Service: <span className="text-white font-medium">PostgreSQL Primary</span></span>
                <span className="text-text-muted">Confidence: <span className="text-red-400 font-bold">89%</span></span>
                <span className="text-text-muted">Recommended: <span className="text-accent font-medium">Scale read replicas</span></span>
              </div>
            </div>
          </div>
          <motion.div whileHover={{ x: 5 }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-sm font-semibold">
            View Details <FiArrowRight size={14} />
          </motion.div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickActions.map((action, idx) => (
          <motion.button
            key={action.path}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx, duration: 0.4 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => navigate(action.path)}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border bg-card/50 hover:shadow-lg transition-all cursor-pointer group ${action.bg}`}
          >
            <action.icon size={22} className={`${action.color} group-hover:scale-110 transition-transform`} />
            <span className="text-sm font-semibold text-white">{action.label}</span>
            <span className="text-[10px] text-text-muted">{action.desc}</span>
          </motion.button>
        ))}
      </div>

      {/* Top 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SystemHealthCard delay={0.1} />
        <MetricCard title="System Activity" value="14,230" trend={{ value: 12.5, isPositive: true }} icon={<FiActivity size={20} />} chartData={activityData} delay={0.2} />
        <GaugeCard title="Resource Usage" value={78} label="Avg Load" delay={0.3} color="#3b82f6" />
        <GaugeCard title="Performance Gauge" value={94} label="Score" delay={0.4} />
      </div>

      {/* Middle Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ChartCard title="System Metrics" subtitle="CPU and Memory utilization over time" data={metricsData} dataKey="CPU" delay={0.5} type="area" />
        </div>
        <div className="lg:col-span-1">
          <HeatmapCard title="Service Heatmap" delay={0.6} />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <ChartCard title="Traffic Intensity" subtitle="Requests processed per minute" data={trafficData} dataKey="Requests" color="#ec4899" delay={0.7} type="bar" />
        </div>
        <div className="lg:col-span-2">
          <AIInsightsCard delay={0.8} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
