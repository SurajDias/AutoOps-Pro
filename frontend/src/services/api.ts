import type { Metric, Incident, Prediction, ServiceNode } from '../types';

const API_URL = 'http://127.0.0.1:8000';
const USE_MOCK_DATA = false; // Toggle to true to use mock data

export const fetchMetrics = async (): Promise<Metric[]> => {
  if (USE_MOCK_DATA) {
    return [
      { cpu: 65, memory: 75, latency: 120, requests: 2500, timestamp: new Date().toISOString() },
    ];
  }
  const res = await fetch(`${API_URL}/metrics`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
};

export const fetchPredictions = async (): Promise<Prediction[]> => {
  if (USE_MOCK_DATA) {
    return [
      { id: '1', title: 'Disk Space Critical', service: 'db-main', severity: 'high', confidence: 0.9, time_to_failure: '3h' },
    ];
  }
  const res = await fetch(`${API_URL}/predictions`);
  if (!res.ok) throw new Error('Failed to fetch predictions');
  return res.json();
};

export const fetchIncidents = async (): Promise<Incident[]> => {
  if (USE_MOCK_DATA) {
    return [
      {
        id: '1',
        title: 'API Gateway Timeout',
        severity: 'critical',
        status: 'open',
        service: 'api-gateway',
        rca: 'High traffic load',
        created_at: new Date().toISOString()
      },
    ];
  }
  const res = await fetch(`${API_URL}/incidents`);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
};

export const fetchTopology = async (): Promise<ServiceNode[]> => {
  if (USE_MOCK_DATA) {
    return [
      { id: '1', name: 'Frontend', status: 'healthy', type: 'web', connections: ['2'] },
      { id: '2', name: 'API Gateway', status: 'healthy', type: 'gateway', connections: ['3', '4'] },
      { id: '3', name: 'Auth Service', status: 'healthy', type: 'service', connections: ['5'] },
      { id: '4', name: 'Data Service', status: 'degraded', type: 'service', connections: ['6'] },
      { id: '5', name: 'User DB', status: 'healthy', type: 'database', connections: [] },
      { id: '6', name: 'Main DB', status: 'critical', type: 'database', connections: [] },
    ];
  }
  const res = await fetch(`${API_URL}/topology`);
  if (!res.ok) throw new Error('Failed to fetch topology');
  return res.json();
};

export const fetchSystemStatus = async (): Promise<{ status: string }> => {
  if (USE_MOCK_DATA) {
    return { status: 'Degraded' };
  }
  const res = await fetch(`${API_URL}/status`);
  if (!res.ok) throw new Error('Failed to fetch system status');
  return res.json();
};

export const triggerTraining = async (): Promise<{ message: string }> => {
  if (USE_MOCK_DATA) {
    return { message: 'Mock training triggered' };
  }
  const res = await fetch(`${API_URL}/train`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger training');
  return res.json();
};

export const sendSimulatorQuery = async (query: string): Promise<{ response: string }> => {
  if (USE_MOCK_DATA) {
    return { response: `Simulated response for: ${query}` };
  }
  const res = await fetch(`${API_URL}/simulator/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('Failed to send simulator query');
  return res.json();
};
