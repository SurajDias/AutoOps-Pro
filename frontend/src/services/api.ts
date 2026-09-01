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
}
export interface Incident { id: number; service_name: string; severity: string; anomaly_type: string; root_cause: string; recommendation: string; status: IncidentStatus; timestamp: string; }
export interface IncidentStatistics { total_incidents: number; open_incidents: number; resolved_incidents: number; high_severity_incidents: number; }
export interface IncidentPatterns { most_common_root_cause: string | null; most_affected_service: string | null; recurring_incidents: number; }
export interface Topology { nodes: Array<{ id: string; label: string }>; edges: Array<{ source: string; target: string }>; }
export type ServiceHealth = Record<string, 'healthy' | 'degraded' | 'failed'>;
export interface SimulationResult { action: string; updated_metrics: { cpu_usage: number; latency: number }; failure_risk: string; confidence: string; confidence_pct: number; severity: string; root_cause: string; explanation: string; }
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

export const api = {
  getMetrics: (signal?: AbortSignal) => request<Metrics>('/metrics', {}, signal),
  getSystemStatus: (signal?: AbortSignal) => request<SystemStatus>('/system-status', {}, signal),
  getMetricsMode: (signal?: AbortSignal) => request<{ mode: MetricsMode }>('/metrics/mode', {}, signal),
  setMetricsMode: (mode: MetricsMode, signal?: AbortSignal) => request<{ success: boolean; mode?: MetricsMode; message?: string }>(`/metrics/mode/${mode}`, { method: 'POST' }, signal),
  getDemoScenarios: (signal?: AbortSignal) => request<Record<string, DemoScenario>>('/demo/scenarios', {}, signal),
  activateDemoScenario: (name: string, signal?: AbortSignal) => request<{ success: boolean; scenario?: Record<string, unknown>; message?: string }>(`/demo/scenario/${encodeURIComponent(name)}`, { method: 'POST' }, signal),
  getMetricsHistory: (limit = 50, service?: string, signal?: AbortSignal) => request<MetricHistoryRow[]>(`/metrics/history?limit=${limit}${service ? `&service=${encodeURIComponent(service)}` : ''}`, {}, signal),
  getIncidents: (signal?: AbortSignal) => request<Incident[]>('/incidents/all', {}, signal), getIncidentHistory: (signal?: AbortSignal) => request<Incident[]>('/incidents/history', {}, signal),
  getIncidentStatistics: (signal?: AbortSignal) => request<IncidentStatistics>('/incidents/statistics', {}, signal), getIncidentPatterns: (signal?: AbortSignal) => request<IncidentPatterns>('/incidents/patterns', {}, signal),
  searchIncidents: (filters: { service_name?: string; root_cause?: string; severity?: string }, signal?: AbortSignal) => { const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value) as [string, string][]); return request<{ total_matches: number; incidents: Incident[] }>(`/incidents/search${params.size ? `?${params}` : ''}`, {}, signal); },
  getIncident: (id: number, signal?: AbortSignal) => request<Incident>(`/incidents/${id}`, {}, signal), updateIncident: (id: number, status: IncidentStatus, signal?: AbortSignal) => request<{ message: string; incident: Incident }>(`/incidents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }, signal),
  createIncident: (incident: Omit<Incident, 'id' | 'timestamp'>, signal?: AbortSignal) => request<{ message: string; incident_id: number }>('/incidents/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(incident) }, signal),
  getTopology: (signal?: AbortSignal) => request<Topology>('/topology', {}, signal), getServiceHealth: (signal?: AbortSignal) => request<ServiceHealth>('/service-health', {}, signal), simulateCascade: (signal?: AbortSignal) => request<{ failed_service: string; cascade_services: string[]; status: Record<string, string> }>('/simulate-cascade', {}, signal),
  simulateAction: (payload: { metrics: { cpu_usage: number; latency: number }; action: string; context?: Record<string, string> }, signal?: AbortSignal) => request<{ success: boolean; data: SimulationResult }>('/simulator/simulate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, signal),
  trainModel: (body: { data_path: string; contamination: number }, signal?: AbortSignal) => request<TrainingResponse>('/ml/train', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, signal), getModelStatus: (signal?: AbortSignal) => request<ModelStatus>('/ml/model-status', {}, signal),
};

export const formatConfidence = (value: number) => `${Math.round(value <= 1 ? value * 100 : value)}%`;
