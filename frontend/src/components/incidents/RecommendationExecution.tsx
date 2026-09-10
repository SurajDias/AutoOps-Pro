import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed } from 'lucide-react';
import { api, ApiError, type OutcomeAssessedBy, type OutcomeStatus, type RecommendationExecution, type RecommendationExecutionMethod, type RecommendationExecutionStatus } from '../../services/api';

const describeApiError = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    if (error.status === 409) return `Lifecycle conflict: ${error.message}`;
    if (error.status === 404) return `Execution record not found: ${error.message}`;
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

const statusMeta: Record<RecommendationExecutionStatus, { label: string; className: string }> = {
  PLANNED: { label: 'Planned', className: 'border-white/[.14] bg-white/[.04] text-white' },
  ACCEPTED: { label: 'Accepted', className: 'border-accent/30 bg-accent/10 text-accent' },
  EXECUTING: { label: 'Executing', className: 'border-primary/40 bg-primary/10 text-primary' },
  EXECUTED: { label: 'Executed', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
  FAILED: { label: 'Failed', className: 'border-red-500/30 bg-red-500/10 text-red-300' },
  CANCELLED: { label: 'Cancelled', className: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
};

const outcomeMeta: Record<OutcomeStatus, string> = {
  IMPROVED: 'Improved',
  NO_CHANGE: 'No change',
  DEGRADED: 'Degraded',
  INCONCLUSIVE: 'Inconclusive',
  UNKNOWN: 'Unknown',
};

const defaultOutcome: Record<string, { outcome_status: OutcomeStatus; outcome_assessed_by: OutcomeAssessedBy }> = {};

export default function RecommendationExecutionPanel({ incidentId, recommendation }: { incidentId: number; recommendation: string }) {
  const [executions, setExecutions] = useState<RecommendationExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyExecutionId, setBusyExecutionId] = useState<number | null>(null);
  const [method, setMethod] = useState<RecommendationExecutionMethod>('MANUAL');
  const [actor, setActor] = useState('Operator');
  const [failureMessage, setFailureMessage] = useState<Record<number, string>>({});
  const [outcomes, setOutcomes] = useState<Record<string, { outcome_status: OutcomeStatus; outcome_assessed_by: OutcomeAssessedBy }>>(defaultOutcome);

  const refreshExecutions = useCallback(async () => {
    try {
      const response = await api.getExecutions(incidentId);
      setExecutions(response.executions);
      setError(null);
    } catch (requestError) {
      setError(describeApiError(requestError, 'Recommendation execution record is unavailable.'));
    }
  }, [incidentId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.getExecutions(incidentId);
        if (!active) return;
        setExecutions(response.executions);
        setError(null);
      } catch (requestError) {
        if (!active) return;
        setError(describeApiError(requestError, 'Recommendation execution record is unavailable.'));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [incidentId]);

  const latestExecution = useMemo(() => executions[0] ?? null, [executions]);

  const handleCreateExecution = async () => {
    if (!recommendation.trim()) return;
    setCreating(true);
    try {
      await api.createRecommendationExecution(incidentId, {
        recommendation,
        execution_method: method,
        actor: actor.trim() || 'Operator',
      });
      await refreshExecutions();
    } catch (requestError) {
      setError(describeApiError(requestError, 'Could not plan the recommendation execution.'));
    } finally {
      setCreating(false);
    }
  };

  const handleTransition = async (execution: RecommendationExecution, action: 'accept' | 'start' | 'complete' | 'cancel' | 'fail') => {
    setBusyExecutionId(execution.id);
    try {
      if (action === 'accept') {
        await api.acceptRecommendationExecution(incidentId, execution.id);
      } else if (action === 'start') {
        await api.startRecommendationExecution(incidentId, execution.id);
      } else if (action === 'complete') {
        await api.completeRecommendationExecution(incidentId, execution.id);
      } else if (action === 'cancel') {
        await api.cancelRecommendationExecution(incidentId, execution.id);
      } else {
        await api.failRecommendationExecution(incidentId, execution.id, {
          error_message: failureMessage[execution.id]?.trim() || 'Recommendation execution failed during operator review.',
        });
      }
      await refreshExecutions();
    } catch (requestError) {
      setError(describeApiError(requestError, 'The lifecycle update could not be recorded.'));
    } finally {
      setBusyExecutionId(null);
    }
  };

  const handleRecordOutcome = async (execution: RecommendationExecution) => {
    if (execution.execution_status !== 'EXECUTED') return;
    const selection = outcomes[String(execution.id)] ?? { outcome_status: 'UNKNOWN', outcome_assessed_by: 'OPERATOR' };
    setBusyExecutionId(execution.id);
    try {
      await api.recordRecommendationOutcome(incidentId, execution.id, {
        outcome_status: selection.outcome_status,
        outcome_assessed_by: selection.outcome_assessed_by,
      });
      await refreshExecutions();
    } catch (requestError) {
      setError(describeApiError(requestError, 'The outcome could not be recorded.'));
    } finally {
      setBusyExecutionId(null);
    }
  };

  const renderActionButtons = (execution: RecommendationExecution) => {
    const status = execution.execution_status;
    const isBusy = busyExecutionId === execution.id;

    if (status === 'PLANNED') {
      return <div className="flex flex-wrap gap-2"><button disabled={isBusy} onClick={() => void handleTransition(execution, 'accept')} className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[11px] font-bold text-accent disabled:opacity-40">Accept</button><button disabled={isBusy} onClick={() => void handleTransition(execution, 'cancel')} className="rounded-lg border border-white/[.12] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Cancel</button></div>;
    }

    if (status === 'ACCEPTED') {
      return <div className="flex flex-wrap gap-2"><button disabled={isBusy} onClick={() => void handleTransition(execution, 'start')} className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-[11px] font-bold text-primary disabled:opacity-40">Start</button><button disabled={isBusy} onClick={() => void handleTransition(execution, 'cancel')} className="rounded-lg border border-white/[.12] px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Cancel</button></div>;
    }

    if (status === 'EXECUTING') {
      return <div className="flex flex-wrap gap-2"><button disabled={isBusy} onClick={() => void handleTransition(execution, 'complete')} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-300 disabled:opacity-40">Mark executed</button><button disabled={isBusy} onClick={() => void handleTransition(execution, 'fail')} className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-red-300 disabled:opacity-40">Mark failed</button></div>;
    }

    if (status === 'FAILED' || status === 'CANCELLED') {
      return <p className="text-[10px] uppercase tracking-wider text-text-muted">Terminal execution state — create a new execution record to retry.</p>;
    }

    return null;
  };

  return <section className="rounded-2xl border border-white/[.08] bg-surface/80 p-5"><div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-[10px] uppercase tracking-[.2em] text-primary">Recommendation execution</p>
      <p className="mt-2 text-sm font-semibold text-white">Lifecycle and outcome tracking</p>
    </div>
    <div className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-wider text-primary">Fact-based record</div>
  </div>
    <p className="mt-3 text-xs text-text-muted">This records the execution lifecycle and observed outcome without resolving the incident or implying causation.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_10rem]">
      <div className="rounded-xl border border-white/[.08] bg-background/40 p-3">
        <p className="text-[10px] uppercase tracking-wider text-text-muted">Recommendation</p>
        <p className="mt-2 text-xs text-white">{recommendation || 'No recommendation recorded.'}</p>
      </div>
      <label className="space-y-2 rounded-xl border border-white/[.08] bg-background/40 p-3 text-[10px] uppercase tracking-wider text-text-muted">
        Method
        <select value={method} onChange={event => setMethod(event.target.value as RecommendationExecutionMethod)} className="mt-1 w-full rounded-lg border border-white/[.08] bg-surface px-2 py-2 text-xs font-medium uppercase tracking-wider text-white">
          <option value="MANUAL">MANUAL</option>
          <option value="AUTOMATED">AUTOMATED</option>
          <option value="API">API</option>
        </select>
      </label>
      <label className="space-y-2 rounded-xl border border-white/[.08] bg-background/40 p-3 text-[10px] uppercase tracking-wider text-text-muted">
        Actor
        <input value={actor} onChange={event => setActor(event.target.value)} placeholder="Operator" className="mt-1 w-full rounded-lg border border-white/[.08] bg-surface px-2 py-2 text-xs text-white placeholder:text-text-muted" />
      </label>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">Next action: {latestExecution ? statusMeta[latestExecution.execution_status].label : 'Plan execution'}</p>
      <button disabled={creating || !recommendation.trim()} onClick={() => void handleCreateExecution()} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-background disabled:opacity-40">{creating ? 'Planning…' : 'Plan execution'}</button>
    </div>

    {error && <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>}

    <div className="mt-5 space-y-3">
      {loading ? <p className="text-xs text-text-muted">Loading execution records…</p> : executions.length === 0 ? <p className="text-xs text-text-muted">No execution record exists for this incident yet.</p> : executions.map(execution => (
        <div key={execution.id} className="rounded-xl border border-white/[.08] bg-background/35 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-text-muted">Attempt {execution.attempt_number}</p>
              <p className="mt-1 text-xs text-white">{execution.recommendation}</p>
            </div>
            <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusMeta[execution.execution_status].className}`}>
              {statusMeta[execution.execution_status].label}
            </span>
          </div>

          <div className="mt-3 grid gap-2 text-[10px] text-text-muted sm:grid-cols-3">
            {execution.execution_method && <div><p className="uppercase tracking-wider text-text-muted">Method</p><p className="mt-1 text-xs text-white">{execution.execution_method}</p></div>}
            {execution.actor && <div><p className="uppercase tracking-wider text-text-muted">Actor</p><p className="mt-1 text-xs text-white">{execution.actor}</p></div>}
            {execution.started_at && <div><p className="uppercase tracking-wider text-text-muted">Started</p><p className="mt-1 text-xs text-white">{new Date(execution.started_at).toLocaleString()}</p></div>}
          </div>

          {execution.error_message && <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /><span>{execution.error_message}</span></div>{execution.error_code && <p className="mt-1 text-[10px] uppercase tracking-wider text-red-200">Code: {execution.error_code}</p>}</div>}

          {execution.outcome_status ? <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /><span>Outcome recorded: {outcomeMeta[execution.outcome_status]}</span></div>{execution.outcome_assessed_by && <p className="mt-1 text-[10px] uppercase tracking-wider text-primary">Assessed by {execution.outcome_assessed_by}</p>}</div> : execution.execution_status === 'EXECUTED' ? <div className="mt-3 rounded-lg border border-white/[.08] bg-background/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Record outcome</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-[10px] uppercase tracking-wider text-text-muted">
                Outcome
                <select value={outcomes[String(execution.id)]?.outcome_status ?? 'UNKNOWN'} onChange={event => setOutcomes(current => ({ ...current, [String(execution.id)]: { outcome_status: event.target.value as OutcomeStatus, outcome_assessed_by: current[String(execution.id)]?.outcome_assessed_by ?? 'OPERATOR' } }))} className="mt-1 w-full rounded-lg border border-white/[.08] bg-surface px-2 py-2 text-xs font-medium text-white">
                  {Object.entries(outcomeMeta).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-[10px] uppercase tracking-wider text-text-muted">
                Assessed by
                <select value={outcomes[String(execution.id)]?.outcome_assessed_by ?? 'OPERATOR'} onChange={event => setOutcomes(current => ({ ...current, [String(execution.id)]: { outcome_status: current[String(execution.id)]?.outcome_status ?? 'UNKNOWN', outcome_assessed_by: event.target.value as OutcomeAssessedBy } }))} className="mt-1 w-full rounded-lg border border-white/[.08] bg-surface px-2 py-2 text-xs font-medium text-white">
                  <option value="AUTOMATED">AUTOMATED</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="EXTERNAL">EXTERNAL</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={busyExecutionId === execution.id} onClick={() => void handleRecordOutcome(execution)} className="rounded-lg bg-primary px-3 py-2 text-[11px] font-bold text-background disabled:opacity-40">{busyExecutionId === execution.id ? 'Saving…' : 'Save outcome'}</button>
            </div>
          </div> : null}

          {execution.execution_status === 'EXECUTING' && <div className="mt-3 rounded-lg border border-white/[.08] bg-background/25 p-3">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Fail this execution</p>
            <textarea value={failureMessage[execution.id] ?? ''} onChange={event => setFailureMessage(current => ({ ...current, [execution.id]: event.target.value }))} placeholder="Optional failure reason" className="mt-2 min-h-[72px] w-full rounded-lg border border-white/[.08] bg-surface px-3 py-2 text-xs text-white placeholder:text-text-muted" />
          </div>}

          <div className="mt-4">{renderActionButtons(execution)}</div>
        </div>
      ))}
    </div>

    <div className="mt-5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-muted"><CircleDashed className="h-3.5 w-3.5 text-primary" /> <span>Operator workflow only</span><span className="text-white">·</span><span>Execution state is recorded as a fact</span></div>
  </section>;
}
