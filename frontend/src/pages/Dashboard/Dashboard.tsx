import React, { useEffect, useState } from 'react';
import { FiActivity, FiCheckCircle, FiCpu, FiDatabase, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import MetricCard from '../../components/cards/MetricCard';
import GaugeCard from '../../components/cards/GaugeCard';
import SystemHealthCard from '../../components/cards/SystemHealthCard';

const API_URL = 'http://127.0.0.1:8000';

const demoScenarios = [
  { key: 'normal', label: 'Normal', icon: FiCheckCircle },
  { key: 'traffic_spike', label: 'Traffic Spike', icon: FiTrendingUp },
  { key: 'database_stress', label: 'DB Stress', icon: FiDatabase },
  { key: 'memory_leak', label: 'Memory Leak', icon: FiCpu },
  { key: 'fixed', label: 'Apply Fix', icon: FiRefreshCw },
];

const Dashboard: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [metrics, setMetrics]           = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statusRes  = await fetch(`${API_URL}/system-status`);
        const statusData = await statusRes.json();
        setSystemStatus(statusData);

        const metricsRes  = await fetch(`${API_URL}/metrics`);
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      } catch (err) {
        console.error("Error fetching backend data", err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activateScenario = async (name: string) => {
    await fetch(`${API_URL}/demo/scenario/${name}`, { method: 'POST' });
    const statusRes = await fetch(`${API_URL}/system-status`);
    setSystemStatus(await statusRes.json());
    const metricsRes = await fetch(`${API_URL}/metrics`);
    setMetrics(await metricsRes.json());
  };

  return (
    <div className="space-y-6">

      {/* 🚨 ALERT BANNER — unchanged */}
      {systemStatus?.status === "critical" && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl font-semibold">
          ⚠️ SYSTEM CRITICAL — Immediate attention required
        </div>
      )}

      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">System Overview</h1>
          <p className="text-text-muted text-sm">Real-time monitoring and AI infrastructure insights</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-2 bg-accent rounded-lg text-black text-sm font-semibold"
        >
          🔄 Refresh
        </button>
      </header>

      <section className="bg-card p-4 rounded-xl border border-white/10 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Demo Control Plane</h2>
            <p className="text-base font-semibold text-white mt-1">
              {systemStatus?.scenario?.label || 'Loading scenario'}
            </p>
            <p className="text-sm text-text-secondary">
              {systemStatus?.scenario?.description || 'Select a scenario to drive the live metrics.'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {demoScenarios.map((scenario) => (
              <button
                key={scenario.key}
                onClick={() => activateScenario(scenario.key)}
                className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  systemStatus?.scenario?.name === scenario.key
                    ? 'bg-accent text-black border-accent'
                    : 'bg-white/5 text-text-secondary border-white/10 hover:text-white hover:bg-white/10'
                }`}
              >
                <scenario.icon size={14} />
                {scenario.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 🔥 BACKEND DATA DISPLAY */}
      <div className="bg-card p-4 rounded-xl border border-white/10 text-white space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-background/40 rounded-lg p-3">
            <p className="text-xs text-text-muted uppercase font-semibold">Failure Forecast</p>
            <p className="text-sm text-white mt-1">{systemStatus?.prediction || "Analyzing..."}</p>
          </div>
          <div className="bg-background/40 rounded-lg p-3">
            <p className="text-xs text-text-muted uppercase font-semibold">Time To Failure</p>
            <p className="text-sm text-yellow-400 mt-1">{systemStatus?.time_to_failure || "..."}</p>
          </div>
          <div className="bg-background/40 rounded-lg p-3">
            <p className="text-xs text-text-muted uppercase font-semibold">Incident Memory</p>
            <p className="text-sm text-blue-300 mt-1">{systemStatus?.similar_incident || "..."}</p>
          </div>
        </div>

        <p>🔥 Status: <span className={`font-bold ${systemStatus?.status === "critical" ? "text-red-400" : "text-green-400"}`}>
          {systemStatus ? systemStatus.status : "Loading..."}
        </span></p>

        <p>⚙️ Service: {systemStatus?.service || "..."}</p>

        <p>🚨 Anomaly: {systemStatus?.anomaly ? "YES ⚠️" : "NO ✅"}</p>

        <p>📉 Anomaly Score: <span className="text-purple-400 font-semibold">
          {systemStatus?.anomaly_score !== undefined
            ? systemStatus.anomaly_score.toFixed(4)
            : "..."}
        </span></p>

        <p>🧩 Root Cause: <span className="text-yellow-400 font-semibold">
          {systemStatus?.root_cause || "Analyzing..."}
        </span></p>

        <p>🎯 Primary Issue: <span className="text-red-400 font-semibold">
          {systemStatus?.primary_issue || "..."}
        </span></p>

        <p>⚠️ Severity: <span className={`font-bold ${
          systemStatus?.severity === "High"   ? "text-red-500"    :
          systemStatus?.severity === "Medium" ? "text-yellow-400" :
          systemStatus?.severity === "Low"    ? "text-green-400"  :
          "text-gray-400"
        }`}>
          {systemStatus?.severity || "..."}
        </span></p>

        <p>🎯 AI Confidence: <span className="text-blue-400 font-semibold">
          {systemStatus?.confidence !== undefined
            ? `${systemStatus.confidence}%`
            : "..."}
        </span></p>

        {/* ── NEW: Decision Engine output ────────────────────────────────── */}
        <hr className="border-white/10 my-1" />

        <p>🤖 Recommended Action: <span className="text-green-400 font-semibold">
          {systemStatus?.recommended_action || "..."}
        </span></p>

        <p>🛡️ Risk Level: <span className={`font-bold ${
          systemStatus?.risk === "Critical" ? "text-red-500"    :
          systemStatus?.risk === "High"     ? "text-orange-400" :
          systemStatus?.risk === "Medium"   ? "text-yellow-400" :
          "text-green-400"
        }`}>
          {systemStatus?.risk || "..."}
        </span></p>

        <p className="text-xs text-gray-400 italic">
          💬 {systemStatus?.reason || "Analyzing system state..."}
        </p>

        <div className="bg-background/30 border border-white/5 rounded-lg p-3">
          <p className="text-xs text-text-muted uppercase font-semibold mb-2">Explainability</p>
          <ul className="space-y-1.5">
            {(systemStatus?.explainability || []).map((reason: string) => (
              <li key={reason} className="text-xs text-text-secondary flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 🔥 LIVE METRICS — unchanged */}
      <div className="bg-card p-4 rounded-xl border border-white/10 text-white space-y-2">
        <p>🧠 CPU Usage: <span className="text-accent font-bold">{metrics ? `${metrics.cpu}%`       : "Loading..."}</span></p>
        <p>💾 Memory:    <span className="text-accent font-bold">{metrics ? `${metrics.memory}%`    : "Loading..."}</span></p>
        <p>⚡ Latency:   <span className="text-accent font-bold">{metrics ? `${metrics.latency} ms` : "Loading..."}</span></p>
        <p>📡 Requests:  <span className="text-accent font-bold">{metrics ? metrics.requests         : "Loading..."}</span></p>
      </div>

      {/* Top Cards — unchanged */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SystemHealthCard delay={0.1} />

        <MetricCard
          title="System Activity"
          value={metrics ? metrics.requests : "Loading..."}
          trend={{ value: 12.5, isPositive: true }}
          icon={<FiActivity size={20} />}
          chartData={[
            { value: metrics?.cpu     || 20 },
            { value: metrics?.memory  || 40 },
            { value: metrics?.latency || 60 },
          ]}
          delay={0.2}
        />

        <GaugeCard
          title="Resource Usage"
          value={metrics ? metrics.cpu : 0}
          label="CPU Load"
          delay={0.3}
        />

        <GaugeCard
          title="Performance Gauge"
          value={metrics ? Math.max(0, 100 - metrics.latency / 5) : 50}
          label="Score"
          delay={0.4}
        />
      </div>
    </div>
  );
};

export default Dashboard;
