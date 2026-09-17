import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Incidents from './Incidents';
import { api, type InvestigationSummary } from '../../services/api';

const incident = (id: number, service_name = `service-${id}`) => ({
  id,
  service_name,
  severity: 'High',
  anomaly_type: 'cpu',
  root_cause: 'CPU saturation',
  recommendation: 'Scale workers',
  status: 'Open' as const,
  timestamp: '2026-09-17T10:00:00+00:00',
  evidence_snapshot: null,
  telemetry_snapshot: null,
});

const summary = (id: number): InvestigationSummary => ({
  incident: incident(id),
  telemetry_snapshot: null,
  historical_intelligence: null,
  recommendation_explanation: null,
  operator_feedback: null,
  executions: [],
  timeline: [],
  limitations: ['Historical evidence was not captured for this incident.'],
});

const populatedSummary = (): InvestigationSummary => ({
  ...summary(1),
  historical_intelligence: {
    incident_id: 1,
    historical_summary: {
      same_service_count: 2,
      same_root_cause_count: 1,
      same_anomaly_count: 2,
      most_frequently_recorded_recommendation: 'Scale workers',
      most_affected_service: 'service-1',
      root_cause_seen_before: true,
      similar_incidents_available: true,
    },
    similar_incidents: [],
  },
  recommendation_explanation: {
    recommended_action: 'Scale workers',
    reason: 'Recorded decision rationale',
    candidates: [],
    selection_factors: ['CPU saturation'],
  },
  executions: [{
    id: 10,
    incident_id: 1,
    recommendation: 'Scale workers',
    execution_status: 'PLANNED',
    execution_method: 'MANUAL',
    actor: 'Operator',
    attempt_number: 1,
    started_at: null,
    completed_at: null,
    error_code: null,
    error_message: null,
    outcome_status: null,
    outcome_assessed_by: null,
    outcome_assessed_at: null,
  }],
  timeline: [{ timestamp: '2026-09-17T10:00:00+00:00', event_type: 'created', title: 'Incident created', description: 'Incident record was created.' }],
  limitations: [],
});

function renderPage() {
  return render(<MemoryRouter><Incidents /></MemoryRouter>);
}

function mockListRequests(items = [incident(1)]) {
  vi.spyOn(api, 'getIncidents').mockResolvedValue(items);
  vi.spyOn(api, 'getIncidentStatistics').mockResolvedValue({ total_incidents: items.length, open_incidents: items.length, resolved_incidents: 0, high_severity_incidents: items.length });
  vi.spyOn(api, 'getIncidentPatterns').mockResolvedValue({ most_common_root_cause: null, most_affected_service: null, recurring_incidents: 0 });
}

describe('incident investigation summary integration', () => {
  afterEach(() => vi.restoreAllMocks());

  it('renders unified summary sections and limitations without fabricating optional data', async () => {
    mockListRequests();
    vi.spyOn(api, 'getIncidentInvestigationSummary').mockResolvedValue(summary(1));
    vi.spyOn(api, 'getIncident');
    vi.spyOn(api, 'getIncidentIntelligence');
    vi.spyOn(api, 'getExecutions');

    renderPage();

    expect(await screen.findByText('No telemetry snapshot was persisted for this incident.')).toBeInTheDocument();
    expect(screen.getByText('No historical intelligence was recorded for this incident.')).toBeInTheDocument();
    expect(screen.getByText('No execution record exists for this incident yet.')).toBeInTheDocument();
    expect(screen.getByText('No timeline events were recorded for this incident.')).toBeInTheDocument();
    expect(screen.getAllByText('Historical evidence was not captured for this incident.')).toHaveLength(2);
    expect(screen.getByText('Historical recommendation reasoning was not captured for this incident.')).toBeInTheDocument();
    expect(api.getIncidentInvestigationSummary).toHaveBeenCalledWith(1, expect.any(AbortSignal));
    expect(api.getIncident).not.toHaveBeenCalled();
    expect(api.getIncidentIntelligence).not.toHaveBeenCalled();
    expect(api.getExecutions).not.toHaveBeenCalled();
  });

  it('shows a loading state while the selected summary is pending', async () => {
    mockListRequests();
    let resolveSummary!: (value: InvestigationSummary) => void;
    const pending = new Promise<InvestigationSummary>(resolve => { resolveSummary = resolve; });
    vi.spyOn(api, 'getIncidentInvestigationSummary').mockReturnValue(pending);

    renderPage();

    expect(await screen.findByText('Loading incident investigation…')).toBeInTheDocument();
    resolveSummary(summary(1));
  });

  it('renders persisted historical intelligence, explanation, execution, and timeline data', async () => {
    mockListRequests();
    vi.spyOn(api, 'getIncidentInvestigationSummary').mockResolvedValue(populatedSummary());

    renderPage();

    expect(await screen.findByText('Historical incident intelligence')).toBeInTheDocument();
    expect(screen.getByText('Recorded with this incident from the decision engine inputs and result.')).toBeInTheDocument();
    expect(screen.getByText('Attempt 1')).toBeInTheDocument();
    expect(screen.getByText('Incident created')).toBeInTheDocument();
  });

  it('shows a retryable API error when summary loading fails', async () => {
    mockListRequests();
    vi.spyOn(api, 'getIncidentInvestigationSummary').mockRejectedValue(new Error('Summary unavailable'));

    renderPage();

    expect(await screen.findByText('Summary unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('fetches a new summary when the selected incident changes', async () => {
    const items = [incident(1), incident(2)];
    mockListRequests(items);
    const getSummary = vi.spyOn(api, 'getIncidentInvestigationSummary').mockImplementation(async id => summary(id));

    renderPage();
    await screen.findByText('INC-0001 · service-1');
    await screen.findByText('No timeline events were recorded for this incident.');

    fireEvent.click(screen.getByText('INC-0002 · service-2'));

    await waitFor(() => expect(getSummary).toHaveBeenLastCalledWith(2, expect.any(AbortSignal)));
    expect(screen.getByText('INC-0002 · CPU saturation')).toBeInTheDocument();
  });
});
