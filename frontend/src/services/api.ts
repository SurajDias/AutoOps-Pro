export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  public readonly status?: number;
  public readonly kind: 'network' | 'timeout' | 'http' | 'response';
  constructor(message: string, kind: ApiError['kind'], status?: number) { super(message); this.name = 'ApiError'; this.kind = kind; this.status = status; }
}

export type MetricsMode = 'live' | 'demo';
export type IncidentStatus = 'Open' | 'Resolved';
export interface Metrics { cpu: number; memory: number; response_time: number; requests: number; error_rate: number; latency: number; }
export interface MetricHistoryRow { timestamp: string; service: string; scenario: string; cpu: number; memory: number; response_time: number; requests: number; error_rate: number; latency: number; }
export interface DemoScenario { label: string; description: string; service: string; }
export interface SystemStatus {
  service: string; scenario: { name: string; label: string; description: string; service: string }; status: 'normal' | 'warning' | 'critical'; anomaly: boolean; anomaly_score: number; anomaly_reason: string;
  root_cause: string; primary_issue: string; severity: 'Normal' | 'Warning' | 'Critical'; confidence: number; recommended_action: string; risk: string; reason: string;
  trends: { sample_size: number; risk_direction: 'Worsening' | 'Improving' | 'Stable'; metrics: Record<string, { trend: 'Increasing' | 'Decreasing' | 'Stable'; change: number; current: number }> };
  prediction: string; time_to_failure: string; explainability: string[]; similar_incident: string; demo_step: string;
  detection_evidence?: { rule_evidence: boolean; isolation_forest_anomaly: boolean; thresholds: Partial<Record<'cpu' | 'memory' | 'response_time' | 'error_rate' | 'latency', number>>; persistence: string; };
  root_cause_details?: string[]; recommendation_explanation?: RecommendationExplanation;
}
export interface RecommendationCandidate { action: string; label: string; score: number; rank: number; evidence: string[]; }
export interface RecommendationExplanation { recommended_action: string; reason: string; action_score?: number; candidates: RecommendationCandidate[]; selection_factors: string[]; }
export interface IncidentEvidenceSnapshot { captured_at?: string; metrics?: Partial<Metrics>; anomaly_score?: number; anomaly_reason?: string; rule_evidence?: boolean; isolation_forest_anomaly?: boolean; detection_thresholds?: Partial<Metrics>; root_cause?: string; primary_issue?: string; root_cause_confidence?: number; root_cause_details?: string[]; severity?: string; risk?: string; recommended_action?: string; recommendation_explanation?: RecommendationExplanation; trend?: string; estimated_failure_window?: string; dependency_service_id?: string | null; }
export interface TelemetrySystemSummary {
  os_name?: string | null;
  os_release?: string | null;
  architecture?: string | null;
  cpu_logical_cores?: number | null;
  cpu_physical_cores?: number | null;
  total_memory_bytes?: number | null;
  memory_usage_percent?: number | null;
  uptime_seconds?: number | null;
}
export interface TelemetryNetworkInterface {
  name?: string | null;
  is_up?: boolean | null;
  speed_mbps?: number | null;
  mtu?: number | null;
  address_count?: number | null;
}
export interface TelemetryListeningPorts {
  count?: number | null;
  tcp_count?: number | null;
  udp_count?: number | null;
  non_loopback_count?: number | null;
}
export interface TelemetryProcessSummary {
  count?: number | null;
  status_counts?: Record<string, number>;
  cpu_percent_available?: boolean | null;
  max_cpu_percent?: number | null;
  max_memory_percent?: number | null;
  total_memory_rss_bytes?: number | null;
  at_collector_limit?: boolean | null;
}
export interface TelemetryRiskSignal {
  signal_id?: string;
  severity?: string;
  title?: string;
  description?: string;
  evidence?: string;
  recommendation?: string;
}
export interface IncidentTelemetrySnapshot {
  captured_at?: string | null;
  system?: TelemetrySystemSummary | null;
  network_interfaces?: TelemetryNetworkInterface[] | null;
  listening_ports?: TelemetryListeningPorts | null;
  processes?: TelemetryProcessSummary | null;
  risk_signals?: TelemetryRiskSignal[] | null;
  limitations?: string[] | null;
}
export interface OperatorFeedback { status: 'accepted' | 'rejected'; reason: string | null; created_at: string; action: string; }
export interface IncidentTimelineEvent { timestamp: string; event_type: 'created' | 'evidence_captured' | 'evidence_unavailable' | 'diagnosed' | 'recommended' | 'recommendation_accepted' | 'recommendation_rejected' | 'resolved'; title: string; description: string; }
export interface Incident { id: number; service_name: string; severity: string; anomaly_type: string; root_cause: string; recommendation: string; status: IncidentStatus; timestamp: string; resolved_at?: string | null; evidence_snapshot?: IncidentEvidenceSnapshot | null; telemetry_snapshot?: IncidentTelemetrySnapshot | null; }
export interface IncidentDetail extends Incident { timeline: IncidentTimelineEvent[]; recommendation_explanation?: RecommendationExplanation | null; operator_feedback?: OperatorFeedback | null; telemetry_snapshot?: IncidentTelemetrySnapshot | null; }
export interface IncidentStatistics { total_incidents: number; open_incidents: number; resolved_incidents: number; high_severity_incidents: number; }
export interface IncidentPatterns { most_common_root_cause: string | null; most_affected_service: string | null; recurring_incidents: number; }
export interface HistoricalIncidentData { id: number; service_name: string; severity: string; anomaly_type: string; root_cause: string; recommendation: string; status: IncidentStatus; timestamp: string | null; resolved_at: string | null; incident_duration: string | null; }
export interface HistoricalSummary { same_service_count: number; same_root_cause_count: number; same_anomaly_count: number; most_frequently_recorded_recommendation: string | null; most_affected_service: string | null; root_cause_seen_before: boolean; similar_incidents_available: boolean; }
export interface HistoricalIntelligence { incident_id: number; historical_summary: HistoricalSummary; similar_incidents: HistoricalIncidentData[]; }
export interface InvestigationIncident extends Omit<Incident, 'timestamp'> { timestamp: string | null; resolved_at?: string | null; evidence_snapshot?: IncidentEvidenceSnapshot | null; }
export interface InvestigationSummary {
  incident: InvestigationIncident;
  telemetry_snapshot: IncidentTelemetrySnapshot | null;
  historical_intelligence: HistoricalIntelligence | null;
  recommendation_explanation: RecommendationExplanation | null;
  operator_feedback: OperatorFeedback | null;
  executions: RecommendationExecution[];
  timeline: IncidentTimelineEvent[];
  limitations: string[];
}
export interface Topology { nodes: Array<{ id: string; label: string }>; edges: Array<{ source: string; target: string }>; }
export type ServiceHealth = Record<string, 'healthy' | 'degraded' | 'failed'>;
export interface DependencyImpactService { service_id: string; label: string; depth: number; dependency_path: string[]; }
export interface DependencyImpact { failed_service: string; failed_service_label: string; directly_affected_services: DependencyImpactService[]; transitively_affected_services: DependencyImpactService[]; affected_services: DependencyImpactService[]; impact_count: number; cascade_depth: number; severity: string; blast_radius: string; }
export interface SimulationResult { action: string; updated_metrics: { cpu_usage: number; latency: number }; failure_risk: string; confidence: string; confidence_pct: number; severity: string; root_cause: string; explanation: string; }
export interface IncidentReportSections {
  executive_summary: { recorded_facts: Record<string, unknown>; ai_assessment: string };
  overview: Record<string, unknown>;
  historical_evidence: Record<string, unknown>;
  root_cause: { recorded_facts: Record<string, unknown>; ai_assessment: string };
  impact: Record<string, unknown>;
  recommendation: Record<string, unknown>;
  simulation: Record<string, unknown>;
  operator_feedback: Record<string, unknown>;
  historical_intelligence: Record<string, unknown>;
  timeline: IncidentTimelineEvent[];
  resolution: Record<string, unknown>;
  ai_observations: string[];
}
export interface IncidentReport {
  incident_id: number;
  generated_at: string;
  generation: { provider: string; fact_boundary: string };
  sections: IncidentReportSections;
}
type IncidentReportResponse = Omit<IncidentReport, 'sections'> & Partial<IncidentReportSections> & { sections?: Partial<IncidentReportSections> | unknown };
export interface ModelStatus { model_loaded: boolean; model_path: string | null; features: string[]; status: string; }
export interface TrainingResponse { success: boolean; message: string; total_samples?: number; n_anomalies_detected?: number; anomaly_rate?: number; }

async function request<T>(path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const timeout = new AbortController();
  const timer = window.setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;
  let response: Response;
  try { response = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: combinedSignal, headers: { Accept: 'application/json', ...init.headers } }); }
  catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.signal.aborted) throw new ApiError('The AutoOps API did not respond within 10 seconds.', 'timeout');
    throw new ApiError('Unable to reach the AutoOps API. Check that the backend is running and reachable.', 'network');
  } finally { window.clearTimeout(timer); }
  if (!response.ok) {
    let message = `AutoOps API request failed (${response.status}).`;
    try { const body = await response.json() as { detail?: string }; if (body.detail) message = body.detail; } catch { /* use status message */ }
    throw new ApiError(message, 'http', response.status);
  }
  try { return await response.json() as T; } catch { throw new ApiError('AutoOps API returned an invalid response.', 'response'); }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function normalizeIncidentReport(response: IncidentReportResponse): IncidentReport {
  // Deployments have returned both nested, top-level, and hybrid section
  // layouts. Merge them so a metadata `sections` property cannot hide valid
  // top-level report sections; nested values remain authoritative.
  const sections = { ...response, ...(isRecord(response.sections) ? response.sections : {}) };
  if (!response.incident_id || !response.generated_at || !response.generation
    || !sections.executive_summary || !sections.overview || !sections.historical_evidence
    || !sections.root_cause || !sections.impact || !sections.recommendation
    || !sections.simulation || !sections.operator_feedback || !sections.resolution
    || !sections.historical_intelligence
    || !Array.isArray(sections.timeline) || !Array.isArray(sections.ai_observations)) {
    throw new ApiError('AutoOps API returned an incomplete incident report.', 'response');
  }
  return {
    incident_id: response.incident_id,
    generated_at: response.generated_at,
    generation: response.generation,
    sections: sections as IncidentReportSections,
  };
}

export const api = {
  getMetrics: (signal?: AbortSignal) => request<Metrics>('/metrics', {}, signal),
  getSystemStatus: (signal?: AbortSignal) => request<SystemStatus>('/system-status', {}, signal),
  getSystemTelemetry: (signal?: AbortSignal) => request<SystemTelemetry>('/telemetry/system', {}, signal),
  getNetworkInterfaces: (signal?: AbortSignal) => request<NetworkInterface[]>('/telemetry/network-interfaces', {}, signal),
  getListeningPorts: (signal?: AbortSignal) => request<ListeningPort[]>('/telemetry/listening-ports', {}, signal),
  getProcesses: (signal?: AbortSignal) => request<ProcessTelemetry[]>('/telemetry/processes', {}, signal),
  getRiskSignals: (signal?: AbortSignal) => request<RiskSignal[]>('/telemetry/risk-signals', {}, signal),
  getMetricsMode: (signal?: AbortSignal) => request<{ mode: MetricsMode }>('/metrics/mode', {}, signal),
  setMetricsMode: (mode: MetricsMode, signal?: AbortSignal) => request<{ success: boolean; mode?: MetricsMode; message?: string }>(`/metrics/mode/${mode}`, { method: 'POST' }, signal),
  getDemoScenarios: (signal?: AbortSignal) => request<Record<string, DemoScenario>>('/demo/scenarios', {}, signal),
  activateDemoScenario: (name: string, signal?: AbortSignal) => request<{ success: boolean; scenario?: Record<string, unknown>; message?: string }>(`/demo/scenario/${encodeURIComponent(name)}`, { method: 'POST' }, signal),
  getMetricsHistory: (limit = 50, service?: string, signal?: AbortSignal) => request<MetricHistoryRow[]>(`/metrics/history?limit=${limit}${service ? `&service=${encodeURIComponent(service)}` : ''}`, {}, signal),
  getIncidents: (signal?: AbortSignal) => request<Incident[]>('/incidents/all', {}, signal), getIncidentHistory: (signal?: AbortSignal) => request<Incident[]>('/incidents/history', {}, signal),
  getIncidentStatistics: (signal?: AbortSignal) => request<IncidentStatistics>('/incidents/statistics', {}, signal), getIncidentPatterns: (signal?: AbortSignal) => request<IncidentPatterns>('/incidents/patterns', {}, signal),
  searchIncidents: (filters: { service_name?: string; root_cause?: string; severity?: string }, signal?: AbortSignal) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value) as [string, string][]); return request<{ total_matches: number; incidents: Incident[] }>(`/incidents/search${params.size ? `?${params}` : ''}`, {}, signal); },
  getIncident: (id: number, signal?: AbortSignal) => request<IncidentDetail>(`/incidents/${id}`, {}, signal), updateIncident: (id: number, status: IncidentStatus, signal?: AbortSignal) => request<{ message: string; incident: Incident }>(`/incidents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }, signal),
  getIncidentInvestigationSummary: (id: number, signal?: AbortSignal) => request<InvestigationSummary>(`/incidents/${id}/investigation-summary`, {}, signal),
  getIncidentReport: async (id: number, signal?: AbortSignal) => normalizeIncidentReport(await request<IncidentReportResponse>(`/incidents/${id}/report`, {}, signal)),
  getIncidentIntelligence: (id: number, signal?: AbortSignal) => request<HistoricalIntelligence>(`/incidents/${id}/intelligence`, {}, signal),
  submitIncidentFeedback: (id: number, feedback: { status: OperatorFeedback['status']; reason?: string }, signal?: AbortSignal) => request<{ message: string; operator_feedback: OperatorFeedback }>(`/incidents/${id}/feedback`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(feedback) }, signal),
  createIncident: (incident: Omit<Incident, 'id' | 'timestamp'>, signal?: AbortSignal) => request<{ message: string; incident_id: number }>('/incidents/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(incident) }, signal),
  createRecommendationExecution: (incidentId: number, payload: RecommendationExecutionCreateRequest, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal),
  acceptRecommendationExecution: (incidentId: number, executionId: number, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions/${executionId}/accept`, { method: 'POST' }, signal),
  startRecommendationExecution: (incidentId: number, executionId: number, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions/${executionId}/start`, { method: 'POST' }, signal),
  completeRecommendationExecution: (incidentId: number, executionId: number, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions/${executionId}/complete`, { method: 'POST' }, signal),
  failRecommendationExecution: (incidentId: number, executionId: number, payload: RecommendationExecutionFailureRequest, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions/${executionId}/fail`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal),
  cancelRecommendationExecution: (incidentId: number, executionId: number, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions/${executionId}/cancel`, { method: 'POST' }, signal),
  recordRecommendationOutcome: (incidentId: number, executionId: number, payload: RecommendationOutcomeRequest, signal?: AbortSignal) => request<{ message: string; execution: RecommendationExecution }>(`/incidents/${incidentId}/executions/${executionId}/outcome`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal),
  getRecommendationExecution: (incidentId: number, executionId: number, signal?: AbortSignal) => request<RecommendationExecution>(`/incidents/${incidentId}/executions/${executionId}`, {}, signal),
  getExecutions: (incidentId: number, signal?: AbortSignal) => request<RecommendationExecutionListResponse>(`/incidents/${incidentId}/executions`, {}, signal),
  getTopology: (signal?: AbortSignal) => request<Topology>('/topology', {}, signal), getServiceHealth: (signal?: AbortSignal) => request<ServiceHealth>('/service-health', {}, signal), getServiceDependencyImpact: (serviceId: string, signal?: AbortSignal) => request<DependencyImpact>(`/service-dependencies/${encodeURIComponent(serviceId)}/impact`, {}, signal), simulateCascade: (signal?: AbortSignal) => request<{ failed_service: string; cascade_services: string[]; status: Record<string, string> }>('/simulate-cascade', {}, signal),
  simulateAction: (payload: { metrics: { cpu_usage: number; latency: number }; action: string; context?: Record<string, string> }, signal?: AbortSignal) => request<{ success: boolean; data: SimulationResult }>('/simulator/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal),
  trainModel: (body: { data_path: string; contamination: number }, signal?: AbortSignal) => request<TrainingResponse>('/ml/train', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, signal), getModelStatus: (signal?: AbortSignal) => request<ModelStatus>('/ml/model-status', {}, signal),
};

export const formatConfidence = (value: number) => `${Math.round(value <= 1 ? value * 100 : value)}%`;

export type RecommendationExecutionStatus = 'PLANNED' | 'ACCEPTED' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'CANCELLED';
export type RecommendationExecutionMethod = 'MANUAL' | 'AUTOMATED' | 'API';
export type OutcomeStatus = 'IMPROVED' | 'NO_CHANGE' | 'DEGRADED' | 'INCONCLUSIVE' | 'UNKNOWN';
export type OutcomeAssessedBy = 'AUTOMATED' | 'OPERATOR' | 'EXTERNAL';

export interface RecommendationExecution {
  id: number;
  incident_id: number;
  recommendation: string;
  execution_status: RecommendationExecutionStatus;
  execution_method: RecommendationExecutionMethod | null;
  actor: string | null;
  attempt_number: number;
  started_at: string | null;
  completed_at: string | null;
  error_code: string | null;
  error_message: string | null;
  outcome_status: OutcomeStatus | null;
  outcome_assessed_by: OutcomeAssessedBy | null;
  outcome_assessed_at: string | null;
}

export interface RecommendationExecutionCreateRequest {
  recommendation: string;
  execution_method?: RecommendationExecutionMethod;
  actor?: string;
}

export interface RecommendationExecutionFailureRequest {
  error_code?: string;
  error_message?: string;
}

export interface RecommendationOutcomeRequest {
  outcome_status: OutcomeStatus;
  outcome_assessed_by: OutcomeAssessedBy;
}

export interface RecommendationExecutionListResponse {
  incident_id: number;
  executions: RecommendationExecution[];
}

export interface SystemTelemetry {
  os_name: string | null;
  os_release: string | null;
  os_version: string | null;
  kernel_version: string | null;
  architecture: string | null;
  hostname: string | null;
  cpu_logical_cores: number | null;
  cpu_physical_cores: number | null;
  total_memory_bytes: number | null;
  available_memory_bytes: number | null;
  used_memory_bytes: number | null;
  memory_usage_percent: number | null;
  uptime_seconds: number | null;
  boot_time: string | null;
  collected_at: string | null;
}

export interface NetworkInterfaceAddress {
  family: string | null;
  address: string | null;
  netmask: string | null;
  broadcast: string | null;
  ptp: string | null;
}

export interface NetworkInterface {
  name: string;
  is_up: boolean | null;
  speed_mbps: number | null;
  mtu: number | null;
  addresses: NetworkInterfaceAddress[];
  mac_address: string | null;
  bytes_sent: number | null;
  bytes_received: number | null;
  packets_sent: number | null;
  packets_received: number | null;
  errors_sent: number | null;
  errors_received: number | null;
  drops_sent: number | null;
  drops_received: number | null;
}

export interface ListeningPort {
  protocol: 'TCP' | 'UDP';
  address_family: string | null;
  local_address: string | null;
  local_port: number | null;
  status: string | null;
}

export interface ProcessTelemetry {
  pid: number;
  name: string | null;
  status: string | null;
  username: string | null;
  cpu_percent: number | null;
  memory_percent: number | null;
  memory_rss_bytes: number | null;
  thread_count: number | null;
  creation_time: string | null;
}

export type RiskSignalSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskSignal {
  signal_id: string;
  severity: RiskSignalSeverity;
  title: string;
  description: string;
  evidence: string;
  recommendation: string | null;
}
