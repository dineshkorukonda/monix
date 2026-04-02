/**
 * API client for Monix backend services.
 *
 * This module provides functions to interact with the Monix Flask API server,
 * handling all HTTP requests and type definitions for the web interface.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3030";
// Django exposes CORS headers (django-cors-headers) allowing direct browser calls.
// Do NOT proxy through Next.js /api/* — that creates a redirect loop with Django's APPEND_SLASH.
const DJANGO_BASE =
  process.env.NEXT_PUBLIC_DJANGO_URL || "http://localhost:8000";
const REPORTS_API_BASE_URL = DJANGO_BASE;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

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
    headers?: Record<string, string>;
    security_headers?: Record<string, string | null>;
    status_code?: number | null;
    final_url?: string;
    content_type?: string;
    content_length?: number | null;
    response_time_ms?: number | null;
  };
  security_headers_analysis?: {
    percentage: number;
    score?: number;
    max_score?: number;
    headers: Record<string, { present: boolean; value?: string | null }>;
  };
  security_txt?: {
    present: boolean;
    content?: string;
    url?: string;
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
    framework?: string;
    cdn?: string;
    languages: string[];
  };
  cookies?: {
    cookies: Array<{
      name: string;
      value: string;
      secure: boolean;
      httponly: boolean;
      samesite?: string;
      domain?: string;
      path?: string;
    }>;
  };
  redirects?: {
    chain: Array<{
      url: string;
      status_code: number;
    }>;
    final_url?: string;
  };
  metadata?: {
    title?: string;
    description?: string;
    [key: string]: unknown;
  };
  findings?: Array<{
    severity: "info" | "low" | "medium" | "high";
    title: string;
    detail: string;
  }>;
  recommendations?: string[];
  scan_profile?: string;
  summary?: {
    https: boolean;
    redirect_hops: number;
    cookie_count: number;
    open_port_count: number;
    missing_header_count: number;
    security_txt_present: boolean;
  };
  scores?: ScoreBreakdown;
  seo?: SeoResults;
  performance?: PerformanceResults;
  /** Present when the scan was persisted (Flask `save_scan`). */
  report_id?: string;
  report_url?: string;
  /** False when PageSpeed was skipped for a fast scan. */
  lighthouse_ran?: boolean;
  error?: string;
}

export interface SeoCheckResult {
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface SeoResults {
  checks: Record<string, SeoCheckResult>;
  seo_score: number;
  error?: string;
}

export interface PerformanceStrategyResult {
  performance_score: number | null;
  accessibility_score: number | null;
  best_practices_score: number | null;
  lcp: string | null;
  fid: string | null;
  cls: string | null;
  error: string | null;
}

export interface PerformanceResults {
  mobile?: PerformanceStrategyResult;
  desktop?: PerformanceStrategyResult;
}

export interface ScoreBreakdown {
  overall: number;
  security: number;
  seo: number;
  performance: number;
}

export interface StoredReportResults extends WebSecurityAnalysis {}

export interface ScanReport {
  report_id: string;
  url: string;
  score: number;
  created_at: string;
  expires_at: string;
  results: StoredReportResults;
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
 * @param options.includePortScan - Enable port scanning (default: false; slow)
 * @param options.includeMetadata - Enable page metadata extraction (default: false)
 * @param options.includePerformance - PageSpeed/Lighthouse mobile+desktop (default: false; often +30–60s)
 */
export async function analyzeUrl(
  url: string,
  options?: {
    includePortScan?: boolean;
    includeMetadata?: boolean;
    /** Google PageSpeed Insights; expensive — default off for faster scans. */
    includePerformance?: boolean;
    targetId?: string;
  },
): Promise<WebSecurityAnalysis> {
  const {
    includePortScan = false,
    includeMetadata = false,
    includePerformance = false,
    targetId,
  } = options || {};

  const body = {
    url,
    include_port_scan: includePortScan,
    include_metadata: includeMetadata,
    include_performance: includePerformance,
    ...(targetId ? { target_id: targetId } : {}),
  };

  const timeoutMs = 120000;
  const parseJson = async (res: Response) => res.json().catch(() => ({}));

  try {
    // Prefer Django proxy (session cookie) so Flask can persist with the internal
    // secret and scans show up in your account. Falls back to direct Flask when
    // not logged in (e.g. public /web scanner).
    const proxied = await fetch(`${DJANGO_BASE}/api/scans/run/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (proxied.ok) {
      return proxied.json() as Promise<WebSecurityAnalysis>;
    }

    if (proxied.status === 401 || proxied.status === 403) {
      const direct = await fetch(`${API_BASE_URL}/api/analyze-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!direct.ok) {
        const errorData = await parseJson(direct);
        throw new Error(
          (errorData as { error?: string }).error ||
            `Analysis failed: ${direct.statusText}`,
        );
      }
      return direct.json() as Promise<WebSecurityAnalysis>;
    }

    const errBody = await parseJson(proxied);
    throw new Error(
      (errBody as { error?: string; detail?: string }).error ||
        (errBody as { detail?: string }).detail ||
        `Analysis failed (${proxied.status})`,
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        throw new Error(
          "Analysis timeout - the target may be unreachable or taking too long to respond",
        );
      }
      if (
        error.message.includes("fetch") ||
        error.message.includes("Failed to fetch")
      ) {
        throw new Error(
          "Cannot connect to API server - ensure the backend is running on " +
            API_BASE_URL +
            " (run: python api/server.py)",
        );
      }
    }
    throw error;
  }
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
 * Get a persisted shareable report by UUID.
 */
export async function getReport(reportId: string): Promise<ScanReport> {
  const response = await fetch(
    `${REPORTS_API_BASE_URL}/api/reports/${reportId}/`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error || `Failed to fetch report: ${response.statusText}`,
      response.status,
    );
  }

  return response.json();
}

/**
 * Check API health status.
 */
export async function checkHealth(): Promise<{
  status: string;
  service: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "TimeoutError") {
        throw new Error(
          "API server timeout - ensure the backend is running on " +
            API_BASE_URL,
        );
      }
      if (error.message.includes("fetch")) {
        throw new Error(
          "Cannot connect to API server - ensure the backend is running on " +
            API_BASE_URL,
        );
      }
    }
    throw error;
  }
}

/**
 * Get the current API base URL.
 */
export function getApiUrl(): string {
  return API_BASE_URL;
}

// ---------------------------------------------------------------------------
// Django typed helpers — use relative paths so Next.js rewrites route to :8000
// ---------------------------------------------------------------------------

/** Cached Google Search Console metrics for a target (from Django). */
export interface GscAnalyticsSummary {
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
}

export interface GscTopQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscAnalyticsPayload {
  summary: GscAnalyticsSummary;
  top_queries: GscTopQueryRow[];
  start_date: string;
  end_date: string;
}

export interface Target {
  id: string;
  name: string;
  url: string;
  environment?: string;
  ip?: string;
  location?: string;
  activity?: string;
  status?: string;
  lastScan?: string;
  score?: number;
  created_at?: string;
  scan_count?: number;
  gsc_property_url?: string | null;
  gsc_analytics?: GscAnalyticsPayload | null;
  gsc_synced_at?: string | null;
  gsc_sync_error?: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  initials: string;
}

export interface AuthUser {
  email: string;
}

export interface ScanSummary {
  id: string;
  report_id: string;
  url: string;
  score: number;
  created_at: string;
  target_id: string | null;
  target_name: string;
}

/** Fetch whether the user has connected Google Search Console (server-side tokens). */
export async function getGscStatus(): Promise<{ connected: boolean }> {
  const res = await fetch(`${DJANGO_BASE}/api/gsc/status/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error || "Failed to load Search Console status",
      res.status,
    );
  }
  return res.json();
}

/**
 * Start OAuth: returns Google authorization URL. Browser should navigate there
 * (same tab) so the session cookie is sent back on callback.
 */
export async function getGscConnectAuthorizationUrl(): Promise<{
  authorization_url: string;
}> {
  const res = await fetch(`${DJANGO_BASE}/api/gsc/connect/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error || "Could not start Google Search Console connection",
      res.status,
    );
  }
  return res.json();
}

/** Refresh Search Console metrics for all of the user's projects (server-side). */
export async function syncGscTargets(): Promise<{
  ok: boolean;
  targets: number;
  errors: number;
}> {
  const res = await fetch(`${DJANGO_BASE}/api/gsc/sync-targets/`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error || "Could not sync Search Console data for projects",
      res.status,
    );
  }
  return res.json();
}

/** Fetch all targets for the current user. */
export async function getTargets(): Promise<Target[]> {
  const res = await fetch(`${DJANGO_BASE}/api/targets/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || "Failed to fetch targets", res.status);
  }
  return res.json();
}

/** Create a new monitored target (URL only). */
export async function createTarget(url: string): Promise<Target> {
  const res = await fetch(`${DJANGO_BASE}/api/targets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create target");
  }
  return res.json();
}

/** Fetch a single target by UUID. */
export async function getTarget(id: string): Promise<Target> {
  const res = await fetch(`${DJANGO_BASE}/api/targets/${id}/`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Target not found");
  return res.json();
}

/** Delete a monitored target. */
export async function deleteTarget(id: string): Promise<void> {
  const res = await fetch(`${DJANGO_BASE}/api/targets/${id}/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete target");
}

export interface ScanLocation {
  url: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  org: string;
  score: number;
}

/** Fetch unique server coordinates for all scans belonging to the current user. */
export async function getScanLocations(): Promise<ScanLocation[]> {
  const res = await fetch(`${DJANGO_BASE}/api/scans/locations/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error || "Failed to fetch scan locations",
      res.status,
    );
  }
  return res.json();
}

/** Fetch all scans belonging to the current user's targets. */
export async function getScans(): Promise<ScanSummary[]> {
  const res = await fetch(`${DJANGO_BASE}/api/scans/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || "Failed to fetch scans", res.status);
  }
  return res.json();
}

/** Get the current user's profile. */
export async function getMe(): Promise<UserProfile> {
  const res = await fetch(`${DJANGO_BASE}/api/auth/me/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || "Not authenticated", res.status);
  }
  return res.json();
}

/** Authenticate and create a Django session (email + password; server uses session cookies, not JWT). */
export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch(`${DJANGO_BASE}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || "Login failed", res.status);
  }

  return res.json();
}

/** Register with full name, email, and password (Django session cookie, not JWT). */
export async function signup(data: {
  full_name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await fetch(`${DJANGO_BASE}/api/auth/signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(err.error || "Sign up failed", res.status);
  }

  return res.json();
}

/** Update first and/or last name. */
export async function updateProfile(data: {
  first_name?: string;
  last_name?: string;
}): Promise<{ ok: boolean; name: string; initials: string }> {
  const res = await fetch(`${DJANGO_BASE}/api/auth/profile/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to update profile");
  }
  return res.json();
}

/** Change the authenticated user's password. */
export async function changePassword(
  old_password: string,
  new_password: string,
): Promise<void> {
  const res = await fetch(`${DJANGO_BASE}/api/auth/password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ old_password, new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to change password");
  }
}

/** End the current session. */
export async function logout(): Promise<void> {
  await fetch(`${DJANGO_BASE}/api/auth/logout/`, {
    method: "POST",
    credentials: "include",
  });
}

/** Permanently delete the user account and all data. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${DJANGO_BASE}/api/auth/account/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete account");
}

// ── Cloudflare Integration ───────────────────────────────────────────────────

export interface CloudflareStatus {
  connected: boolean;
  account_name?: string;
  account_id?: string;
  zones_count?: number;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
  plan_name: string;
}

export interface CloudflareTimeSeries {
  date: string;
  requests: number;
  cached_requests: number;
  threats: number;
  bandwidth: number;
  pageviews: number;
  uniques: number;
}

export interface CloudflareAnalytics {
  zone_id: string;
  zone_name: string;
  period_days: number;
  totals: {
    requests: number;
    cached_requests: number;
    bandwidth_bytes: number;
    threats: number;
    pageviews: number;
    uniques: number;
  };
  series: CloudflareTimeSeries[];
  top_countries: { country: string; requests: number }[];
  status_codes: { status: string; requests: number }[];
}

/** Check whether a Cloudflare API token has been saved for the current user. */
export async function getCloudflareStatus(): Promise<CloudflareStatus> {
  const res = await fetch(`${DJANGO_BASE}/api/cloudflare/status/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { error?: string }).error || "Failed to fetch Cloudflare status",
      res.status,
    );
  }
  return res.json();
}

/** Save a Cloudflare API token and verify it by fetching the account. */
export async function connectCloudflare(
  apiToken: string,
): Promise<{ success: boolean; account_name: string; zones_count: number }> {
  const res = await fetch(`${DJANGO_BASE}/api/cloudflare/connect/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ api_token: apiToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || "Failed to connect Cloudflare",
    );
  }
  return res.json();
}

/** Remove the stored Cloudflare API token. */
export async function disconnectCloudflare(): Promise<void> {
  const res = await fetch(`${DJANGO_BASE}/api/cloudflare/disconnect/`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to disconnect Cloudflare");
}

/** List all zones accessible via the stored Cloudflare token. */
export async function getCloudflareZones(): Promise<CloudflareZone[]> {
  const res = await fetch(`${DJANGO_BASE}/api/cloudflare/zones/`, {
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { error?: string }).error || "Failed to fetch zones",
      res.status,
    );
  }
  return res.json();
}

/** Fetch traffic/threat analytics for a zone over the given number of days. */
export async function getCloudflareAnalytics(
  zoneId: string,
  days = 7,
): Promise<CloudflareAnalytics> {
  const params = new URLSearchParams({ zone_id: zoneId, days: String(days) });
  const res = await fetch(
    `${DJANGO_BASE}/api/cloudflare/analytics/?${params}`,
    { credentials: "include" },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      (err as { error?: string }).error || "Failed to fetch analytics",
      res.status,
    );
  }
  return res.json();
}
