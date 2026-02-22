/**
 * Monitoring Service
 * 
 * Provides methods to fetch server health, container, and website
 * monitoring data from the admin-only /api/monitoring/* endpoints.
 */

import { apiService } from './api.service';
import { API_ENDPOINTS } from '@/config/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SystemMetrics {
  cpu: {
    usagePercent: number;
    cores: number;
    model: string;
    status: 'normal' | 'warning' | 'critical';
  };
  memory: {
    totalGB: number;
    usedGB: number;
    availableGB: number;
    usagePercent: number;
    status: 'normal' | 'warning' | 'critical';
  };
  disk: {
    totalGB: number;
    usedGB: number;
    availableGB: number;
    usagePercent: number;
    status: 'normal' | 'warning' | 'critical';
  };
  network: {
    receiveMBps: number;
    transmitMBps: number;
  };
  load: {
    load1m: number;
    load5m: number;
    load15m: number;
    cpuCount: number;
    status: 'normal' | 'warning' | 'critical';
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
}

export interface ContainerMetrics {
  name: string;
  cpuPercent: number;
  memoryUsageMB: number;
  memoryLimitMB: number;
  memoryPercent: number;
  restarts: number;
  status: 'running' | 'stopped' | 'restarting';
}

export interface WebsiteMetrics {
  uptime: {
    isUp: boolean;
    uptimePercent: number;
    lastDowntime: string | null;
  };
  responseTime: {
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    status: 'good' | 'slow' | 'critical';
  };
  errorRate: {
    percent: number;
    total5xx: number;
    total4xx: number;
    totalRequests: number;
    status: 'normal' | 'warning' | 'critical';
  };
  statusCodes: {
    code: string;
    count: number;
  }[];
  requestRate: {
    perSecond: number;
    perMinute: number;
  };
}

export interface MonitoringOverview {
  system: SystemMetrics;
  containers: ContainerMetrics[];
  website: WebsiteMetrics;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Service Methods
// ---------------------------------------------------------------------------

/**
 * Fetch system health metrics (CPU, RAM, disk, network, load)
 */
async function getSystemMetrics(): Promise<SystemMetrics | null> {
  try {
    const response = await apiService.get<{ metrics: SystemMetrics }>(
      API_ENDPOINTS.MONITORING.SYSTEM
    );
    if (response.success && response.data) {
      return response.data.metrics;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch system metrics:', error);
    return null;
  }
}

/**
 * Fetch container metrics
 */
async function getContainerMetrics(): Promise<ContainerMetrics[]> {
  try {
    const response = await apiService.get<{ containers: ContainerMetrics[] }>(
      API_ENDPOINTS.MONITORING.CONTAINERS
    );
    if (response.success && response.data) {
      return response.data.containers;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch container metrics:', error);
    return [];
  }
}

/**
 * Fetch website health metrics
 */
async function getWebsiteMetrics(): Promise<WebsiteMetrics | null> {
  try {
    const response = await apiService.get<{ metrics: WebsiteMetrics }>(
      API_ENDPOINTS.MONITORING.WEBSITE
    );
    if (response.success && response.data) {
      return response.data.metrics;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch website metrics:', error);
    return null;
  }
}

/**
 * Fetch all monitoring data in parallel
 */
async function getMonitoringOverview(): Promise<MonitoringOverview | null> {
  try {
    const [system, containers, website] = await Promise.all([
      getSystemMetrics(),
      getContainerMetrics(),
      getWebsiteMetrics(),
    ]);

    if (!system && !website) return null;

    return {
      system: system!,
      containers,
      website: website!,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to fetch monitoring overview:', error);
    return null;
  }
}

export const monitoringService = {
  getSystemMetrics,
  getContainerMetrics,
  getWebsiteMetrics,
  getMonitoringOverview,
};

export default monitoringService;
