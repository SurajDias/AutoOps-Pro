import { useCallback, useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { api, type HistoricalIntelligence } from '../../services/api';

export default function HistoricalIncidentIntelligence({
  incidentId,
  onSelectPreviousIncident,
}: {
  incidentId: number;
  onSelectPreviousIncident: (id: number) => void;
}) {
  const [intelligence, setIntelligence] = useState<HistoricalIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getIncidentIntelligence(incidentId);
      setIntelligence(data);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Failed to load historical intelligence.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/[.08] bg-surface/80 p-5">
        <p className="text-[10px] uppercase tracking-[.2em] text-primary">Historical incident intelligence</p>
        <p className="mt-4 text-xs text-text-muted">Loading incident history…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-white/[.08] bg-surface/80 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[.2em] text-primary">Historical incident intelligence</p>
            <p className="mt-2 text-xs text-text-muted">{error}</p>
            <button
              onClick={() => void load()}
              className="mt-3 rounded-lg border border-primary/30 px-3 py-1 text-[10px] font-bold text-primary hover:bg-primary/10 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!intelligence) {
    return null;
  }

  const { historical_summary, similar_incidents } = intelligence;

  return (
    <section className="rounded-2xl border border-white/[.08] bg-surface/80 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.2em] text-primary">Historical incident intelligence</p>
          <p className="mt-1 text-xs text-text-muted">Deterministic patterns from persisted incident records</p>
        </div>
        {similar_incidents.length > 0 && (
          <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-1 text-[10px] font-bold text-accent">
            {similar_incidents.length} similar
          </span>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="mt-5 grid gap-3 border-t border-white/[.06] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Same Service"
          value={historical_summary.same_service_count}
          description="historical incidents"
        />
        <StatCard
          label="Same Root Cause"
          value={historical_summary.same_root_cause_count}
          description="recorded incidents"
        />
        <StatCard
          label="Same Anomaly Type"
          value={historical_summary.same_anomaly_count}
          description="incidents"
        />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Most Frequent Recommendation</p>
          <p className="mt-2 truncate text-xs font-semibold text-white">
            {historical_summary.most_frequently_recorded_recommendation || '—'}
          </p>
          <p className="mt-1 text-[10px] text-text-muted">for this root cause</p>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-5 space-y-2 border-t border-white/[.06] pt-4">
        {historical_summary.root_cause_seen_before && (
          <InsightItem icon="✓" text={`This root cause has appeared in ${historical_summary.same_root_cause_count} recorded incidents`} tone="primary" />
        )}
        {historical_summary.same_service_count > 0 && (
          <InsightItem icon="✓" text={`${historical_summary.same_service_count} previous incidents affected this service`} tone="primary" />
        )}
        {historical_summary.most_affected_service && (
          <InsightItem icon="→" text={`Most frequently affected service: ${historical_summary.most_affected_service}`} tone="muted" />
        )}
        {historical_summary.similar_incidents_available && (
          <InsightItem icon="•" text="Related historical incidents available below" tone="accent" />
        )}
      </div>

      {/* Similar Incidents List */}
      {similar_incidents.length > 0 && (
        <div className="mt-5 space-y-2 border-t border-white/[.06] pt-4">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Most relevant historical incidents</p>
          <div className="mt-3 space-y-2">
            {similar_incidents.map((incident) => (
              <button
                key={incident.id}
                onClick={() => onSelectPreviousIncident(incident.id)}
                className="w-full rounded-lg border border-white/[.08] bg-background/30 p-3 text-left hover:border-primary/50 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-white">INC-{String(incident.id).padStart(4, '0')}</p>
                      <span className="text-[10px] text-text-muted">·</span>
                      <p className="text-xs text-white">{incident.service_name}</p>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-text-muted">{incident.root_cause}</p>
                    {incident.anomaly_type && (
                      <p className="mt-1 text-[11px] text-text-muted">{incident.anomaly_type}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-accent">{incident.severity}</span>
                    {incident.incident_duration && (
                      <p className="mt-1 text-[10px] text-text-muted">{incident.incident_duration}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] text-text-muted">{description}</p>
    </div>
  );
}

function InsightItem({ icon, text, tone }: { icon: string; text: string; tone: 'primary' | 'accent' | 'muted' }) {
  const toneClasses = {
    primary: 'text-primary',
    accent: 'text-accent',
    muted: 'text-text-muted',
  };

  return (
    <p className={`flex items-start gap-2 text-xs ${toneClasses[tone]}`}>
      <span className="mt-0.5 flex-shrink-0">{icon}</span>
      <span>{text}</span>
    </p>
  );
}
