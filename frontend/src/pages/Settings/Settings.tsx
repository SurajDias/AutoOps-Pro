import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Database, RefreshCw, XCircle } from 'lucide-react';
import { api, type ModelStatus, type TrainingResponse } from '../../services/api';

export default function Settings() {
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [training, setTraining] = useState(false);
  const [result, setResult] = useState<TrainingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    try { setModel(await api.getModelStatus(signal)); setError(null); }
    catch (requestError) { if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) setError(requestError instanceof Error ? requestError.message : 'Unable to load model status.'); }
  }, []);

  useEffect(() => { const controller = new AbortController(); void loadStatus(controller.signal); return () => controller.abort(); }, [loadStatus]);

  const handleRetrain = async () => {
    setTraining(true); setResult(null); setError(null);
    try { const response = await api.trainModel({ data_path: 'system_metrics.csv', contamination: 0.1 }); setResult(response); await loadStatus(); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Training request failed.'); }
    finally { setTraining(false); }
  };

  return <div className="p-8 bg-background min-h-screen text-text-primary"><div className="max-w-3xl mx-auto space-y-6">
    <div className="border-b border-white/[0.06] pb-5"><h1 className="text-2.5xl font-bold font-heading text-white tracking-tight">Model & system configuration</h1><p className="text-text-muted text-xs mt-1 leading-relaxed">Backend-supported model readiness and training controls. Alert routing and threshold persistence are not configured by this application.</p></div>
    {error && <div className="rounded-xl border border-white/15 bg-surface px-4 py-3 text-xs text-text-muted flex justify-between gap-3"><span>{error}</span><button onClick={() => void loadStatus()} className="text-primary font-semibold">Retry</button></div>}
    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-surface/85 border border-white/[0.08] rounded-2xl p-6 shadow-glass">
      <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><Database className="h-5 w-5 text-primary" /><div><h2 className="text-base font-bold font-heading text-white">Anomaly model status</h2><p className="text-xs text-text-muted mt-1">Isolation Forest model used alongside weighted detection rules.</p></div></div>{model ? <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${model.model_loaded ? 'text-primary border-primary/25 bg-primary/10' : 'text-accent border-accent/25 bg-accent/10'}`}>{model.model_loaded ? 'Ready' : 'Not trained'}</span> : <span className="text-xs text-text-muted">Loading…</span>}</div>
      {model && <div className="grid sm:grid-cols-2 gap-4 mt-6 text-xs"><div className="rounded-xl bg-elevated/50 border border-white/[.05] p-4"><p className="text-text-muted uppercase tracking-wider text-[10px]">Backend state</p><p className="text-white font-semibold mt-2">{model.status}</p></div><div className="rounded-xl bg-elevated/50 border border-white/[.05] p-4"><p className="text-text-muted uppercase tracking-wider text-[10px]">Model features</p><p className="text-white mt-2 leading-relaxed">{model.features.join(', ')}</p></div></div>}
    </motion.section>
    <motion.section initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }} className="bg-surface/85 border border-white/[0.08] rounded-2xl p-6 shadow-glass"><h2 className="text-base font-bold font-heading text-white">Train anomaly model</h2><p className="text-xs text-text-muted mt-1 leading-relaxed">Uses the backend’s configured <code>system_metrics.csv</code> training dataset and contamination value of 0.1.</p><button onClick={() => void handleRetrain()} disabled={training} className="mt-5 flex items-center gap-2 bg-elevated/75 border border-white/[0.08] hover:border-primary/30 text-primary px-5 py-2.5 rounded-xl text-xs font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${training ? 'animate-spin' : ''}`} /><span>{training ? 'Training model…' : 'Train model'}</span></button>{result && <div className="mt-4 flex items-start gap-2 text-xs text-text-muted"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" /><span>{result.message}{result.total_samples !== undefined ? ` · ${result.total_samples} samples processed` : ''}</span></div>}</motion.section>
    <section className="rounded-2xl border border-white/[0.08] bg-elevated/30 p-5 flex gap-3"><XCircle className="h-4 w-4 text-text-muted shrink-0" /><p className="text-xs text-text-muted leading-relaxed">Notification channels, model-threshold sliders, and configuration saving are intentionally unavailable because the backend does not expose persistent APIs for them.</p></section>
  </div></div>;
}
