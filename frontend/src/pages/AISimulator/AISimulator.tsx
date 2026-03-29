import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSend, FiCpu, FiUser, FiZap, FiAlertTriangle, FiCheckCircle, FiTrendingUp, FiActivity, FiDatabase } from 'react-icons/fi';
import GlassCard from '../../components/cards/GlassCard';

interface ChatMessage {
  id: number; role: 'user' | 'ai'; content: string;
  predictions?: { label: string; value: string; type: 'danger' | 'warning' | 'success' }[];
  timestamp: string;
}

const quickScenarios = [
  { text: 'Traffic x2', icon: FiTrendingUp, query: 'What happens if traffic doubles?' },
  { text: 'Kill Database', icon: FiDatabase, query: 'What if the database fails?' },
  { text: 'Scale API', icon: FiZap, query: 'What if we scale API servers to 8?' },
  { text: 'Spike CPU', icon: FiActivity, query: 'Simulate auth service outage' },
];

const examplePrompts = [
  { text: 'What happens if traffic doubles?', icon: FiTrendingUp },
  { text: 'What if the database fails?', icon: FiAlertTriangle },
  { text: 'What if we scale API servers to 8?', icon: FiZap },
  { text: 'Simulate auth service outage', icon: FiCpu },
];

const simulatedResponses: Record<string, { content: string; predictions: { label: string; value: string; type: 'danger' | 'warning' | 'success' }[] }> = {
  'What happens if traffic doubles?': {
    content: 'Simulating 2x traffic load across all services:',
    predictions: [
      { label: 'API Gateway', value: 'CPU → 82%. Horizontal scaling needed in 15 min.', type: 'warning' },
      { label: 'Database', value: 'Connection pool exhaustion in 22 min. Scale read replicas.', type: 'danger' },
      { label: 'Cache Layer', value: 'Hit ratio stable at 94%. No action needed.', type: 'success' },
      { label: 'Order Service', value: 'Memory pressure increases to 78%. Monitor OOM risk.', type: 'warning' },
    ],
  },
  'What if the database fails?': {
    content: 'Simulating complete database failure. Cascade impact:',
    predictions: [
      { label: 'Order Service', value: 'All writes fail within 2 seconds.', type: 'danger' },
      { label: 'Payment Service', value: 'Queue overflow in 45s. Circuit breaker activates.', type: 'danger' },
      { label: 'Auth Service', value: 'Cached tokens valid 15 min. New logins blocked.', type: 'warning' },
      { label: 'Recovery', value: 'Failover to standby replica. Est. recovery: 8 seconds.', type: 'success' },
    ],
  },
  'What if we scale API servers to 8?': {
    content: 'Simulating scale-out to 8 API instances:',
    predictions: [
      { label: 'Throughput', value: '4.2k/s → ~11.5k/s. 174% improvement.', type: 'success' },
      { label: 'Latency', value: 'P99 drops from 210ms to ~45ms.', type: 'success' },
      { label: 'Cost', value: '+$340/day. Consider auto-scaling instead.', type: 'warning' },
      { label: 'Database', value: 'Connections rise to 640. Pool limit is 500.', type: 'danger' },
    ],
  },
  'Simulate auth service outage': {
    content: 'Simulating Auth Service outage. Propagation analysis:',
    predictions: [
      { label: 'API Gateway', value: '401 error rate spikes to 100%.', type: 'danger' },
      { label: 'Order Service', value: 'Falls back to cached auth for 5 min.', type: 'warning' },
      { label: 'User Impact', value: '~3,200 users affected. Login blocked.', type: 'danger' },
      { label: 'Recovery', value: 'Auto-restart → recovery in 12 seconds.', type: 'success' },
    ],
  },
};

const thinkingSteps = [
  'Analyzing system topology...',
  'Simulating failure scenarios...',
  'Checking historical incidents...',
  'Generating recommendations...',
];

const getTypeStyle = (type: string) => {
  switch (type) {
    case 'danger': return 'border-red-400/30 bg-red-400/5 text-red-400';
    case 'warning': return 'border-yellow-400/30 bg-yellow-400/5 text-yellow-400';
    case 'success': return 'border-accent/30 bg-accent/5 text-accent';
    default: return 'border-white/10 bg-white/5 text-text-secondary';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'danger': return <FiAlertTriangle size={14} />;
    case 'warning': return <FiZap size={14} />;
    case 'success': return <FiCheckCircle size={14} />;
    default: return null;
  }
};

const AISimulator: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'ai', content: 'Welcome to AutoOps AI Simulator. Ask "what-if" questions to explore failure scenarios. Try an example prompt or use the quick action buttons below.', timestamp: new Date().toLocaleTimeString() },
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [typingText, setTypingText] = useState('');
  const [isTypingResponse, setIsTypingResponse] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typingText, thinkingStep]);

  const handleSend = (text?: string) => {
    const query = text || input.trim();
    if (!query || isThinking || isTypingResponse) return;
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: query, timestamp: new Date().toLocaleTimeString() }]);
    setInput('');
    setIsThinking(true);
    setThinkingStep(0);

    // Animate through thinking steps
    let step = 0;
    const stepInterval = setInterval(() => {
      step++;
      if (step >= thinkingSteps.length) {
        clearInterval(stepInterval);
        setIsThinking(false);
        // Start typing animation
        const resp = simulatedResponses[query];
        const content = resp?.content || `Analyzing: "${query}". Moderate impact predicted across 2-3 services.`;
        const predictions = resp?.predictions || [
          { label: 'Risk', value: 'Medium — monitor closely.', type: 'warning' as const },
          { label: 'Action', value: 'Enable auto-scaling and increase monitoring.', type: 'success' as const },
        ];

        setIsTypingResponse(true);
        setTypingText('');
        let charIdx = 0;
        const typeInterval = setInterval(() => {
          charIdx++;
          setTypingText(content.slice(0, charIdx));
          if (charIdx >= content.length) {
            clearInterval(typeInterval);
            setIsTypingResponse(false);
            setTypingText('');
            setMessages(prev => [...prev, {
              id: Date.now() + 1, role: 'ai', content, predictions, timestamp: new Date().toLocaleTimeString(),
            }]);
          }
        }, 25);
      } else {
        setThinkingStep(step);
      }
    }, 600);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">AI Scenario Simulator</h1>
          <p className="text-text-muted text-sm">Test "what-if" scenarios and explore failure predictions</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20">
          <FiCpu size={14} className="text-accent" />
          <span className="text-xs text-accent font-medium">AI Engine Online</span>
        </div>
      </header>

      {/* FEATURE 6: Quick Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {quickScenarios.map((scenario, idx) => (
          <motion.button
            key={idx}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSend(scenario.query)}
            disabled={isThinking || isTypingResponse}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-white/10 text-sm font-medium text-text-secondary hover:text-white hover:border-accent/30 hover:bg-accent/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <scenario.icon size={14} className="text-accent" />
            {scenario.text}
          </motion.button>
        ))}
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        <div className="flex-1 flex flex-col glass-card overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-accent/20 text-accent' : 'bg-blue-500/20 text-blue-400'}`}>
                    {msg.role === 'ai' ? <FiCpu size={16} /> : <FiUser size={16} />}
                  </div>
                  <div className={`max-w-[80%] space-y-3 ${msg.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'ai' ? 'bg-background/60 text-text-primary border border-white/5' : 'bg-accent/20 text-white border border-accent/20'}`}>{msg.content}</div>
                    {msg.predictions && (
                      <div className="space-y-2">
                        {msg.predictions.map((pred, idx) => (
                          <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * idx }} className={`flex items-start gap-2 rounded-xl px-4 py-3 border text-left ${getTypeStyle(pred.type)}`}>
                            <span className="mt-0.5 shrink-0">{getTypeIcon(pred.type)}</span>
                            <div><span className="text-xs font-bold block text-white">{pred.label}</span><span className="text-xs opacity-80">{pred.value}</span></div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-text-muted">{msg.timestamp}</span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* FEATURE 2: Thinking Animation */}
            {isThinking && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}><FiCpu size={16} /></motion.div>
                </div>
                <div className="bg-background/60 border border-white/5 rounded-2xl px-4 py-3 space-y-1.5">
                  {thinkingSteps.map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: idx <= thinkingStep ? 1 : 0.3, x: 0 }}
                      transition={{ delay: 0.05 }}
                      className="flex items-center gap-2 text-xs"
                    >
                      {idx < thinkingStep ? (
                        <FiCheckCircle size={12} className="text-accent" />
                      ) : idx === thinkingStep ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="w-3 h-3 border-2 border-accent/30 border-t-accent rounded-full" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-white/20" />
                      )}
                      <span className={idx <= thinkingStep ? 'text-text-primary' : 'text-text-muted'}>{step}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Typing animation */}
            {isTypingResponse && typingText && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent"><FiCpu size={16} /></div>
                <div className="bg-background/60 border border-white/5 rounded-2xl px-4 py-3 text-sm text-text-primary">
                  {typingText}<motion.span animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.5 }} className="inline-block w-0.5 h-4 bg-accent ml-0.5 align-middle" />
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-white/5 p-4 flex gap-3">
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Describe a scenario to simulate..." disabled={isThinking || isTypingResponse} className="flex-1 bg-background/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-colors disabled:opacity-50" />
            <button onClick={() => handleSend()} disabled={isThinking || isTypingResponse} className="px-5 py-3 bg-accent text-background rounded-xl font-semibold text-sm hover:bg-accent-hover transition-colors shadow-neon flex items-center gap-2 disabled:opacity-50"><FiSend size={16} /> Send</button>
          </div>
        </div>

        <div className="w-72 shrink-0 space-y-4 hidden xl:block">
          <GlassCard delay={0.1} className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Example Scenarios</h3>
            <p className="text-xs text-text-muted">Click to simulate</p>
            <div className="space-y-2">
              {examplePrompts.map((prompt, idx) => (
                <motion.button key={idx} whileHover={{ x: 4 }} onClick={() => handleSend(prompt.text)} disabled={isThinking || isTypingResponse} className="w-full flex items-center gap-3 p-3 rounded-xl bg-background/40 border border-white/5 text-left hover:border-accent/30 hover:bg-accent/5 transition-all text-sm text-text-secondary hover:text-white group disabled:opacity-50">
                  <prompt.icon size={16} className="text-text-muted group-hover:text-accent transition-colors shrink-0" />
                  <span>{prompt.text}</span>
                </motion.button>
              ))}
            </div>
          </GlassCard>
          <GlassCard delay={0.2} className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Engine Info</h3>
            {[{ l: 'Model', v: 'AutoOps-v2.1' }, { l: 'Data', v: '180 days' }, { l: 'Accuracy', v: '94.2%' }].map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs"><span className="text-text-muted">{item.l}</span><span className="text-white font-medium">{item.v}</span></div>
            ))}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default AISimulator;
