import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend } from 'react-icons/fi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SimMetadata {
  risk:           string;
  confidence:     string;
  confidence_pct: number;
  cpu_before:     number;
  cpu_after:      number;
  latency_before: number;
  latency_after:  number;
}

interface ChatMessage {
  id:        number;
  role:      'user' | 'ai';
  content:   string;
  timestamp: string;
  metadata?: SimMetadata;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(risk: string): string {
  switch (risk.toLowerCase()) {
    case 'low':      return 'text-green-400';
    case 'medium':   return 'text-yellow-400';
    case 'high':     return 'text-orange-400';
    case 'critical': return 'text-red-500';
    default:         return 'text-gray-400';
  }
}

function riskBg(risk: string): string {
  switch (risk.toLowerCase()) {
    case 'low':      return 'bg-green-500';
    case 'medium':   return 'bg-yellow-500';
    case 'high':     return 'bg-orange-500';
    case 'critical': return 'bg-red-600';
    default:         return 'bg-gray-500';
  }
}

function confidenceBarColor(confidence: string): string {
  switch (confidence.toLowerCase()) {
    case 'high':   return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'low':    return 'bg-red-500';
    default:       return 'bg-gray-500';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const RiskBadge: React.FC<{ risk: string }> = ({ risk }) => (
  <span className={`inline-flex items-center gap-1 font-semibold ${riskColor(risk)}`}>
    <span className={`inline-block w-2 h-2 rounded-full ${riskBg(risk)}`} />
    {risk}
  </span>
);

const ConfidenceBar: React.FC<{ confidence: string; pct: number }> = ({ confidence, pct }) => (
  <div>
    <div className="flex justify-between text-xs text-gray-400 mb-1">
      <span>Confidence</span>
      <span className="font-semibold text-white">{confidence} ({pct}%)</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <motion.div
        className={`h-2 rounded-full ${confidenceBarColor(confidence)}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  </div>
);

const MetricBar: React.FC<{
  label: string; before: number; after: number; unit: string; max: number;
}> = ({ label, before, after, unit, max }) => {
  const beforePct = Math.min((before / max) * 100, 100);
  const afterPct  = Math.min((after  / max) * 100, 100);
  const improved  = after < before;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>{label}</span>
        <span>
          <span className="text-gray-300">{before}{unit}</span>
          <span className="mx-1 text-gray-500">→</span>
          <span className={improved ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
            {after}{unit}
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div className="h-2 rounded-full bg-gray-500"
          initial={{ width: 0 }} animate={{ width: `${beforePct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }} />
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <motion.div className={`h-2 rounded-full ${improved ? 'bg-green-500' : 'bg-red-500'}`}
          initial={{ width: 0 }} animate={{ width: `${afterPct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }} />
      </div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-gray-500" /> Before
        </span>
        <span className="flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${improved ? 'bg-green-500' : 'bg-red-500'}`} /> After
        </span>
      </div>
    </div>
  );
};

const SimCard: React.FC<{ meta: SimMetadata }> = ({ meta }) => (
  <motion.div
    className="mt-2 bg-gray-800 border border-gray-700 rounded-xl p-3 space-y-3 text-sm"
    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: 0.1 }}
  >
    <div className="flex items-center justify-between">
      <span className="text-gray-400 text-xs uppercase tracking-wide">Failure Risk</span>
      <RiskBadge risk={meta.risk} />
    </div>
    <hr className="border-gray-700" />
    <ConfidenceBar confidence={meta.confidence} pct={meta.confidence_pct} />
    <hr className="border-gray-700" />
    <div className="space-y-3">
      <span className="text-gray-400 text-xs uppercase tracking-wide">Before vs After</span>
      <MetricBar label="CPU Usage" before={meta.cpu_before} after={meta.cpu_after}     unit="%" max={100}  />
      <MetricBar label="Latency"   before={meta.latency_before} after={meta.latency_after} unit="ms" max={1000} />
    </div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const AISimulator: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 1, role: 'ai',
    content: 'Ask me a scenario like "scale cpu" or "high load"',
    timestamp: new Date().toLocaleTimeString(),
  }]);
  const [input, setInput] = useState('');
  const chatEndRef         = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now(), role: 'user', content: input,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // ─── Action mapping ───────────────────────────────────────────────────
    let action = 'scale_cpu';
    const text = input.toLowerCase();
    if      (text.includes('cpu') || text.includes('processor') || text.includes('compute'))
      action = 'scale_cpu';
    else if (text.includes('horizontal') || text.includes('instance') || text.includes('replica'))
      action = 'scale_horizontal';
    else if (text.includes('latency') || text.includes('slow') || text.includes('response time'))
      action = 'reduce_latency';
    else if (text.includes('error') || text.includes('crash') || text.includes('restart') || text.includes('fail'))
      action = 'restart_service';
    else if (text.includes('memory') || text.includes('ram') || text.includes('leak'))
      action = 'optimize_memory';
    else if (text.includes('traffic') || text.includes('throttle') || text.includes('requests') || text.includes('load'))
      action = 'throttle_requests';

    try {
      const metricsRes   = await fetch('http://127.0.0.1:8000/metrics');
      const liveMetrics  = await metricsRes.json();

      const statusRes    = await fetch('http://127.0.0.1:8000/system-status');
      const systemStatus = await statusRes.json();

      const res = await fetch('http://127.0.0.1:8000/simulator/simulate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: { cpu_usage: liveMetrics.cpu, latency: liveMetrics.latency },
          action,
          context: {
            severity:      systemStatus.severity      || 'medium',
            primary_issue: systemStatus.primary_issue || 'N/A',
            root_cause:    systemStatus.root_cause    || 'N/A',
            anomaly:       systemStatus.anomaly       || false,
          },
        }),
      });

      const data   = await res.json();
      const result = data.data;

      const aiMsg: ChatMessage = {
        id:        Date.now() + 1,
        role:      'ai',
        timestamp: new Date().toLocaleTimeString(),
        content:
`🧠 Action: ${result.action}

📊 CPU → ${result.updated_metrics.cpu_usage}
⚡ Latency → ${result.updated_metrics.latency}

🚨 Risk: ${result.failure_risk}
🎯 Confidence: ${result.confidence} (${result.confidence_pct}%)

🧩 Root Cause: ${systemStatus.root_cause      || 'N/A'}
🎯 Primary Issue: ${systemStatus.primary_issue  || 'N/A'}
⚠️ Severity: ${systemStatus.severity           || 'N/A'}
📉 Anomaly Score: ${systemStatus.anomaly_score !== undefined ? systemStatus.anomaly_score.toFixed(4) : 'N/A'}

🤖 System Recommendation: ${systemStatus.recommended_action || 'N/A'}
🛡️ Recommendation Risk: ${systemStatus.risk || 'N/A'}
💬 Reasoning: ${systemStatus.reason || 'N/A'}

💡 ${result.explanation}`,

        metadata: {
          risk:           result.failure_risk,
          confidence:     result.confidence     || 'Medium',
          confidence_pct: result.confidence_pct ?? 55,
          cpu_before:     liveMetrics.cpu,
          cpu_after:      result.updated_metrics.cpu_usage,
          latency_before: liveMetrics.latency,
          latency_after:  result.updated_metrics.latency,
        },
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <h1 className="text-xl text-white font-bold">AI Simulator</h1>

      <div className="flex-1 overflow-y-auto space-y-3">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : ''}`}>
              <div className="max-w-[70%]">
                <div className="bg-card p-3 rounded-xl text-white whitespace-pre-line">
                  {msg.content}
                </div>
                {msg.role === 'ai' && msg.metadata && <SimCard meta={msg.metadata} />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type scenario..."
          className="flex-1 p-3 rounded-xl bg-black text-white"
        />
        <button onClick={handleSend} className="bg-green-500 px-4 rounded-xl">
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default AISimulator;