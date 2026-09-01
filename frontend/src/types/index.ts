export interface Metric {
  cpu: number;
  memory: number;
  latency: number;
  requests: number;
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  service: string;
  rca: string;
  created_at: string;
  resolved_at?: string;
}

export interface Prediction {
  id: string;
  title: string;
  service: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  time_to_failure: string;
}

export interface ServiceNode {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'critical';
  type: string;
  connections: string[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  service: string;
  message: string;
}
