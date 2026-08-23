import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Bell, Sliders } from 'lucide-react';

export default function Settings() {
  const [anomalyThreshold, setAnomalyThreshold] = useState(85);
  const [sensitivity, setSensitivity] = useState(7);
  const [retrainWindow, setRetrainWindow] = useState(24);
  const [loading, setLoading] = useState(false);
  const [slackChecked, setSlackChecked] = useState(true);
  const [emailChecked, setEmailChecked] = useState(true);
  const [pagerChecked, setPagerChecked] = useState(false);

  const handleRetrain = async () => {
    setLoading(true);
    try {
      // Preserving original fetch path and logic
      await fetch('http://127.0.0.1:8000/train', { method: 'POST' });
    } catch (e) {
      console.warn('Retrain failed', e);
    }
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="p-8 bg-background min-h-screen text-text-primary">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-white/[0.06] pb-5">
          <h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">Platform Settings</h1>
          <p className="text-text-muted text-xs mt-1 leading-relaxed">
            Configure machine learning model thresholds, alerting channels, and automation actions
          </p>
        </div>

        {/* Configuration sections */}
        <div className="grid gap-6">
          
          {/* Section 1: ML Config */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="bg-surface/85 border border-white/[0.08] rounded-2xl p-6 shadow-glass"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Sliders className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold font-heading text-white">ML Model Configuration</h2>
            </div>
            
            <div className="space-y-6">
              {/* Slider 1 */}
              <div>
                <div className="flex justify-between mb-2 text-xs">
                  <label className="text-text-muted">Anomaly Detection Threshold</label>
                  <span className="font-bold text-primary font-mono">{anomalyThreshold}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={anomalyThreshold} 
                  onChange={e => setAnomalyThreshold(Number(e.target.value))} 
                  className="w-full accent-primary bg-background/50 h-1.5 rounded-lg cursor-pointer appearance-none" 
                />
              </div>

              {/* Slider 2 */}
              <div>
                <div className="flex justify-between mb-2 text-xs">
                  <label className="text-text-muted">Prediction Sensitivity</label>
                  <span className="font-bold text-primary font-mono">{sensitivity}/10</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={sensitivity} 
                  onChange={e => setSensitivity(Number(e.target.value))} 
                  className="w-full accent-primary bg-background/50 h-1.5 rounded-lg cursor-pointer appearance-none" 
                />
              </div>

              {/* Slider 3 */}
              <div>
                <div className="flex justify-between mb-2 text-xs">
                  <label className="text-text-muted">Retraining Window</label>
                  <span className="font-bold text-primary font-mono">{retrainWindow}h</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="72" 
                  value={retrainWindow} 
                  onChange={e => setRetrainWindow(Number(e.target.value))} 
                  className="w-full accent-primary bg-background/50 h-1.5 rounded-lg cursor-pointer appearance-none" 
                />
              </div>

              {/* Force retrain button */}
              <div className="pt-4 border-t border-white/[0.06] flex">
                <button 
                  onClick={handleRetrain} 
                  disabled={loading} 
                  className="flex items-center space-x-2 bg-elevated/75 border border-white/[0.08] hover:border-primary/30 text-primary px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-elevated transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Retraining Models...' : 'Force Retrain Models'}</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Section 2: Alert Channels */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.08 }} 
            className="bg-surface/85 border border-white/[0.08] rounded-2xl p-6 shadow-glass"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Bell className="h-5 w-5 text-accent" />
              <h2 className="text-base font-bold font-heading text-white">Alert Channels</h2>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'slack', label: 'Slack Notifications', checked: slackChecked, setChecked: setSlackChecked },
                { id: 'email', label: 'Email Alerts', checked: emailChecked, setChecked: setEmailChecked },
                { id: 'pager', label: 'PagerDuty Integration', checked: pagerChecked, setChecked: setPagerChecked }
              ].map(ch => (
                <label key={ch.id} className="flex items-center space-x-3 text-xs text-text-muted hover:text-white cursor-pointer select-none group w-fit">
                  <div
                    onClick={() => ch.setChecked(!ch.checked)}
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      ch.checked ? 'bg-primary border-primary' : 'border-white/20 bg-elevated/50 group-hover:border-white/40'
                    }`}
                  >
                    {ch.checked && (
                      <svg className="w-2.5 h-2.5 text-background" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span>{ch.label}</span>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button className="flex items-center space-x-2 bg-gradient-to-r from-primary to-accent text-background font-bold px-7 py-3 rounded-xl hover:shadow-neon transition-all text-xs">
              <Save className="h-4 w-4" />
              <span>Save Configurations</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
