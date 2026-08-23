import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Zap } from 'lucide-react';

export default function AISimulator() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string, confidence?: number }[]>([
    { role: 'ai', text: 'Hello. I am the AutoOps AI assistant. How can I help you simulate a scenario today?', confidence: 99 }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scenarios = ['Database overload', 'Network latency spike', 'Memory leak', 'CPU saturation'];

  const sendQuery = async (query: string) => {
    if (!query.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      // Preserving original fetch path and simulation API call
      const res = await fetch('http://127.0.0.1:8000/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = res.ok ? await res.json() : { response: 'Simulated response: Detected anomaly matching scenario. Initiating auto-scaling procedures.', confidence: 92 };
      setMessages(prev => [...prev, { role: 'ai', text: data.response || data.message, confidence: data.confidence || 85 }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Simulation server offline. Fallback: Simulating auto-remediation for ' + query, confidence: 80 }]);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-background min-h-screen text-text-primary flex flex-col">
      {/* Header */}
      <div className="border-b border-white/[0.06] pb-5 mb-6">
        <h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">AI Ops Simulator</h1>
        <p className="text-text-muted text-xs mt-1 leading-relaxed">
          Test infrastructure response models by simulating failures and traffic patterns
        </p>
      </div>

      {/* Scenario chips suggestion */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {scenarios.map(s => (
          <button 
            key={s} 
            onClick={() => sendQuery(s)} 
            className="px-4 py-2 bg-surface border border-white/[0.08] hover:border-primary/45 hover:bg-elevated/45 rounded-full text-xs font-semibold text-text-muted hover:text-white transition-all shadow-glass-sm"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Terminal Chat Window */}
      <div className="flex-1 bg-surface/60 border border-white/[0.08] rounded-2xl flex flex-col overflow-hidden shadow-glass min-h-[400px]">
        {/* Messages Stream */}
        <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-elevated">
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            
            return (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className={`flex items-start space-x-4 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar Icon */}
                <div className={`p-2.5 rounded-xl shrink-0 border ${
                  isUser 
                    ? 'bg-primary/10 border-primary/20 text-primary' 
                    : 'bg-elevated border-white/[0.05] text-accent'
                }`}>
                  {isUser ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[70%] p-4 rounded-2xl ${
                  isUser 
                    ? 'bg-primary text-background rounded-tr-none font-medium' 
                    : 'bg-elevated/40 border border-white/[0.05] text-text-primary rounded-tl-none font-body'
                }`}>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  
                  {msg.confidence && (
                    <div className={`mt-3 flex items-center space-x-1 text-[10px] font-semibold ${
                      isUser ? 'text-background/80' : 'text-accent'
                    }`}>
                      <Zap className="h-3 w-3 fill-current" />
                      <span>AI Confidence: {msg.confidence}%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          
          {/* Loading Indicator */}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-2 text-primary p-1 pl-14">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]" />
            </motion.div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/[0.08] bg-elevated/30">
          <form 
            onSubmit={e => { e.preventDefault(); sendQuery(input); }} 
            className="relative flex items-center"
          >
            <input 
              type="text" 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Describe a failure scenario to simulate..." 
              className="w-full bg-background border border-white/[0.08] rounded-xl py-3.5 pl-5 pr-14 text-xs text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-primary/45 focus:ring-1 focus:ring-primary/20 transition-all font-body" 
            />
            <button 
              type="submit" 
              disabled={!input.trim() || loading} 
              className="absolute right-3.5 p-2 bg-primary text-background rounded-lg disabled:opacity-30 hover:bg-accent transition-colors"
            >
              <Send className="h-3.5 w-3.5 fill-current" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
