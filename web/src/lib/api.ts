/**
 * API client for Monix backend services.
 * 
 * This module provides functions to interact with the Monix Flask API server,
 * handling all HTTP requests and type definitions for the web interface.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";

export interface WebSecurityAnalysis {
  status: "success" | "error";
  url?: string;
  domain?: string;
  ip_address?: string;
  threat_score?: number;
  threat_level?: string;
  threat_color?: string;
  threats?: string[];
  ssl_certificate?: {
    valid: boolean;
    subject: Record<string, string> | string;
    issuer: Record<string, string> | string;
    expires?: string | null;
    error?: string;
  };
  dns_records?: {
    a: string[];
    aaaa: string[];
    mx: string[];
    ns: string[];
    txt: string[];
  };
  http_headers?: {
    security_headers?: Record<string, any>;
    all_headers?: Record<string, string>;
  };
  security_headers_analysis?: {
    percentage: number;
    headers: Record<string, { present: boolean; value?: string }>;
  };
  security_txt?: {
    present: boolean;
    content?: string;
  };
  server_location?: {
    org: string;
    city: string;
    region: string;
    country: string;
    timezone: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  port_scan?: {
    open_ports: number[];
    closed_ports: number[];
  };
  technologies?: {
    server?: string;
    cms?: string;
    cdn?: string;
    languages: string[];
  };
  cookies?: {
    cookies: Array<{
      name: string;
      value: string;
      secure: boolean;
      httponly: boolean;
      domain?: string;
      path?: string;
    }>;
  };
  redirects?: {
    chain: Array<{
      url: string;
      status_code: number;
    }>;
  };
  metadata?: Record<string, any>;
  error?: string;
}

export interface Connection {
  local_ip: string;
  local_port: number;
  remote_ip: string;
  remote_port: number;
  state: string;
  pid: string | number;
  pname: string;
  geo?: string;
  domain?: string;
}

export interface SystemStats {
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  network_sent: number;
  network_recv: number;
  uptime: number;
  load_avg: number[];
  process_count: number;
}

export interface DashboardData {
  connections: Connection[];
  alerts: string[];
  system_stats: SystemStats;
  traffic_summary: {
    total_requests: number;
    unique_ips: number;
    total_404s: number;
    high_risk_hits: number;
    suspicious_ips: Array<{
      ip: string;
      threat_score: number;
      total_hits: number;
    }>;
  };
}

/**
 * Analyze a URL for security threats and vulnerabilities.
 * 
 * @param url - URL to analyze
 * @param options - Optional configuration
 * @param options.includePortScan - Enable port scanning (default: true for UI)
 * @param options.includeMetadata - Enable page metadata extraction (default: false)
 */
export async function analyzeUrl(
  url: string,
  options?: {
    includePortScan?: boolean;
    includeMetadata?: boolean;
  }
): Promise<WebSecurityAnalysis> {
  const { includePortScan = true, includeMetadata = false } = options || {};
  
  const response = await fetch(`${API_BASE_URL}/api/analyze-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      include_port_scan: includePortScan,
      include_metadata: includeMetadata,
    }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get current system dashboard data.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get system statistics.
 */
export async function getSystemStats(): Promise<SystemStats> {
  const response = await fetch(`${API_BASE_URL}/api/system-stats`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch system stats: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get current network connections.
 */
export async function getConnections(): Promise<Connection[]> {
  const response = await fetch(`${API_BASE_URL}/api/connections`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch connections: ${response.statusText}`);
  }

  const data = await response.json();
  return data.connections || [];
}

/**
 * Get security alerts.
 */
export async function getAlerts(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/alerts`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch alerts: ${response.statusText}`);
  }

  const data = await response.json();
  return data.alerts || [];
}

/**
 * Check API health status.
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  return response.json();
}
