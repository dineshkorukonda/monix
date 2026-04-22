/**
 * API client for Monix backend services.
 *
 * Auth:
 * - Monix stores a custom JWT in browser local storage.
 * - Next.js route handlers accept `Authorization: Bearer <token>` for authenticated routes.
 */
import {
  clearStoredAuthSession,
  getStoredAccessToken,
  setStoredAuthSession,
} from "@/lib/local-auth";

/**
 * Base URL for Monix API (Next.js Route Handlers under `/api/*`).
 *
 * In the browser, requests use same-origin relative URLs (`""`).
 * During SSR, use `NEXT_PUBLIC_SITE_URL` or infer from `VERCEL_URL`, else localhost.
 */
export function monixApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (site) return site.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`.replace(/\/$/, "");
  return "http://127.0.0.1:3000";
}

/** @deprecated Use `monixApiBase`. */
export function djangoApiBase(): string {
  return monixApiBase();
}

/** Shown in error messages when the API cannot be reached. */
function monixApiDisplayUrl(): string {
  return monixApiBase() || "this app origin";
}

async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const token = getStoredAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type CachedRequestOptions = {
  force?: boolean;
  ttlMs?: number;
};

type CacheEntry<T> = {
  value?: T;
  expiresAt?: number;
  inFlight?: Promise<T>;
};

const DEFAULT_CACHE_TTL_MS = 15_000;
const responseCache = new Map<string, CacheEntry<unknown>>();

function getCachedValue<T>(key: string): T | undefined {
  const entry = responseCache.get(key) as CacheEntry<T> | undefined;
  if (!entry || entry.value === undefined || entry.expiresAt === undefined) {
    return undefined;
  }
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(key);
    return undefined;
  }
  return entry.value;
}

async function cachedRequest<T>(
  key: string,
  loader: () => Promise<T>,
  options?: CachedRequestOptions,
): Promise<T> {
  const force = options?.force ?? false;
  const ttlMs = options?.ttlMs ?? DEFAULT_CACHE_TTL_MS;

  const existing = responseCache.get(key) as CacheEntry<T> | undefined;
  if (!force) {
    const cached = getCachedValue<T>(key);
    if (cached !== undefined) {
      return cached;
    }
    if (existing?.inFlight) {
      return existing.inFlight;
    }
  }

  const inFlight = loader()
    .then((value) => {
      responseCache.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((error) => {
      const current = responseCache.get(key) as CacheEntry<T> | undefined;
      if (current?.inFlight) {
        responseCache.delete(key);
      }
      throw error;
    });

  responseCache.set(key, { ...existing, inFlight });
  return inFlight;
}

export function invalidateApiCache(prefix?: string): void {
  if (!prefix) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
    }
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
    renewed?: string | null;
    serial_number?: string;
    error?: string;
  };
  dns_records?: {
    a: string[];
    aaaa: string[];
    mx: string[];
    ns: string[];
    txt: string[];
    error?: string | null;
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
    filtered_ports?: number[];
    error?: string;
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
    // Prefer authenticated scan so results link to your targets; fall back to public
    // analyze-url when not logged in.
    const proxied = await fetch(`${monixApiBase()}/api/scans/run/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (proxied.ok) {
      const result = (await proxied.json()) as WebSecurityAnalysis;
      invalidateApiCache("scans");
      invalidateApiCache("targets");
      if (targetId) {
        invalidateApiCache(`target:${targetId}`);
      }
      return result;
    }

    if (proxied.status === 401 || proxied.status === 403) {
      const direct = await fetch(`${monixApiBase()}/api/analyze-url`, {
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
      const result = (await direct.json()) as WebSecurityAnalysis;
      invalidateApiCache("scans");
      invalidateApiCache("targets");
      if (targetId) {
        invalidateApiCache(`target:${targetId}`);
      }
      return result;
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
          "Cannot connect to API server — ensure the Next.js app is reachable at " +
            monixApiDisplayUrl(),
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
  const response = await fetch(`${monixApiBase()}/api/overview-data`, {
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
  const response = await fetch(`${monixApiBase()}/api/system-stats`, {
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
  const response = await fetch(`${monixApiBase()}/api/connections`, {
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
  const response = await fetch(`${monixApiBase()}/api/alerts`, {
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
export async function getReport(
  reportId: string,
  options?: CachedRequestOptions,
): Promise<ScanReport> {
  return cachedRequest(
    `report:${reportId}`,
    async () => {
      const response = await fetch(
        `${monixApiBase()}/api/me/reports/${reportId}/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(await authHeaders()),
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
    },
    { ttlMs: 30_000, ...options },
  );
}

/**
 * Check API health status.
 */
export async function checkHealth(): Promise<{
  status: string;
  service: string;
}> {
  try {
    const response = await fetch(`${monixApiBase()}/api/health`, {
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
            monixApiDisplayUrl(),
        );
      }
      if (error.message.includes("fetch")) {
        throw new Error(
          "Cannot connect to API server - ensure the backend is running on " +
            monixApiDisplayUrl(),
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
  return monixApiDisplayUrl();
}

// ---------------------------------------------------------------------------
// Typed helpers for targets, scans, and integrations
// ---------------------------------------------------------------------------

/** Cached Google Search Console metrics for a target. */
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
  /** Latest persisted scan for this target (load full results via getReport). */
  latest_report_id?: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  initials: string;
  avatar_url?: string | null;
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
export async function getGscStatus(
  options?: CachedRequestOptions,
): Promise<{ connected: boolean }> {
  return cachedRequest(
    "gsc:status",
    async () => {
      const headers = await authHeaders();
      const res = await fetch(`${monixApiBase()}/api/gsc/status/`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(
          err.error || "Failed to load Search Console status",
          res.status,
        );
      }
      return (await res.json()) as { connected: boolean };
    },
    { ttlMs: 30_000, ...options },
  );
}

/**
 * Start OAuth: returns Google authorization URL. Browser should navigate there
 * (same tab) so the session cookie is sent back on callback.
 */
export async function getGscConnectAuthorizationUrl(): Promise<{
  authorization_url: string;
}> {
  const res = await fetch(`${monixApiBase()}/api/gsc/connect/`, {
    headers: await authHeaders(),
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
  const res = await fetch(`${monixApiBase()}/api/gsc/sync-targets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: "{}",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(
      err.error || "Could not sync Search Console data for projects",
      res.status,
    );
  }
  const payload = await res.json();
  invalidateApiCache("gsc:");
  invalidateApiCache("targets");
  return payload;
}

/** Fetch all targets for the current user. */
export async function getTargets(
  options?: CachedRequestOptions,
): Promise<Target[]> {
  return cachedRequest(
    "targets",
    async () => {
      const res = await fetch(`${monixApiBase()}/api/targets/`, {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(err.error || "Failed to fetch targets", res.status);
      }
      return res.json();
    },
    { ttlMs: 20_000, ...options },
  );
}

/** Create a new monitored target (URL only). */
export async function createTarget(url: string): Promise<Target> {
  const res = await fetch(`${monixApiBase()}/api/targets/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to create target");
  }
  const created = await res.json();
  invalidateApiCache("targets");
  invalidateApiCache("scans");
  return created;
}

/** Fetch a single target by UUID. */
export async function getTarget(
  id: string,
  options?: CachedRequestOptions,
): Promise<Target> {
  return cachedRequest(
    `target:${id}`,
    async () => {
      const res = await fetch(`${monixApiBase()}/api/targets/${id}/`, {
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error("Target not found");
      return res.json();
    },
    { ttlMs: 20_000, ...options },
  );
}

/** Delete a monitored target. */
export async function deleteTarget(id: string): Promise<void> {
  const res = await fetch(`${monixApiBase()}/api/targets/${id}/`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete target");
  invalidateApiCache("targets");
  invalidateApiCache("scans");
  invalidateApiCache(`target:${id}`);
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
  const res = await fetch(`${monixApiBase()}/api/scans/locations/`, {
    headers: await authHeaders(),
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
export async function getScans(
  options?: CachedRequestOptions,
): Promise<ScanSummary[]> {
  return cachedRequest(
    "scans",
    async () => {
      const res = await fetch(`${monixApiBase()}/api/scan-history/`, {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(err.error || "Failed to fetch scans", res.status);
      }
      return res.json();
    },
    { ttlMs: 10_000, ...options },
  );
}

/** Get the current user's profile. */
export async function getMe(
  options?: CachedRequestOptions,
): Promise<UserProfile> {
  return cachedRequest(
    "me",
    async () => {
      const res = await fetch(`${monixApiBase()}/api/auth/me/`, {
        headers: await authHeaders(),
      });
      if (res.ok) {
        return (await res.json()) as UserProfile;
      }
      if (res.status === 401) {
        clearStoredAuthSession();
      }
      throw new ApiError("Not authenticated", res.status);
    },
    { ttlMs: 60_000, ...options },
  );
}

/** Email + password sign-in; JWT is sent to `/api/*` on subsequent calls. */
export async function login(
  email: string,
  password: string,
): Promise<AuthUser> {
  const res = await fetch(`${monixApiBase()}/api/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    token?: string;
    user?: { email?: string };
  };
  if (!res.ok || !payload.token) {
    throw new ApiError(payload.error || "Login failed", res.status);
  }
  setStoredAuthSession({
    token: payload.token,
    email: payload.user?.email || email.trim().toLowerCase(),
  });
  invalidateApiCache();
  return { email: payload.user?.email || email };
}

/** Register and create a local Monix account. */
export async function signup(data: {
  full_name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const res = await fetch(`${monixApiBase()}/api/auth/signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: data.full_name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    token?: string;
    user?: { email?: string };
  };
  if (!res.ok || !payload.token) {
    throw new ApiError(payload.error || "Signup failed", res.status);
  }
  setStoredAuthSession({
    token: payload.token,
    email: payload.user?.email || data.email.trim().toLowerCase(),
  });
  invalidateApiCache();
  return { email: payload.user?.email || data.email };
}

/** Update first and/or last name. */
export async function updateProfile(data: {
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}): Promise<{
  ok: boolean;
  name: string;
  initials: string;
  avatar_url?: string | null;
}> {
  const res = await fetch(`${monixApiBase()}/api/auth/me/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({
      ...(data.first_name != null ? { first_name: data.first_name } : {}),
      ...(data.last_name != null ? { last_name: data.last_name } : {}),
      ...(data.avatar_url !== undefined ? { avatar_url: data.avatar_url } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to save.");
  }
  invalidateApiCache("me");
  return (await res.json()) as {
    ok: boolean;
    name: string;
    initials: string;
    avatar_url?: string | null;
  };
}

/** Change the authenticated user's password. */
export async function changePassword(
  old_password: string,
  new_password: string,
): Promise<void> {
  const res = await fetch(`${monixApiBase()}/api/auth/password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ old_password, new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || "Failed to update password.",
    );
  }
}

/** End the current session. */
export async function logout(): Promise<void> {
  clearStoredAuthSession();
  invalidateApiCache();
}

/** Permanently delete the user account and all data. */
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${monixApiBase()}/api/auth/account/`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete account");
  clearStoredAuthSession();
  invalidateApiCache();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const res = await fetch(`${monixApiBase()}/api/auth/password/reset/request/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || "Failed to request password reset.",
    );
  }
}

export async function confirmPasswordReset(
  token: string,
  password: string,
): Promise<void> {
  const res = await fetch(`${monixApiBase()}/api/auth/password/reset/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || "Failed to reset password.",
    );
  }
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
export async function getCloudflareStatus(
  options?: CachedRequestOptions,
): Promise<CloudflareStatus> {
  return cachedRequest(
    "cloudflare:status",
    async () => {
      const headers = await authHeaders();
      const res = await fetch(`${monixApiBase()}/api/cloudflare/status/`, {
        headers,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(
          (err as { error?: string }).error ||
            "Failed to fetch Cloudflare status",
          res.status,
        );
      }
      return (await res.json()) as CloudflareStatus;
    },
    { ttlMs: 30_000, ...options },
  );
}

/** Save a Cloudflare API token and verify it by fetching the account. */
export async function connectCloudflare(
  apiToken: string,
): Promise<{ success: boolean; account_name: string; zones_count: number }> {
  const res = await fetch(`${monixApiBase()}/api/cloudflare/connect/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ api_token: apiToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error || "Failed to connect Cloudflare",
    );
  }
  const payload = await res.json();
  invalidateApiCache("cloudflare:");
  return payload;
}

/** Remove the stored Cloudflare API token. */
export async function disconnectCloudflare(): Promise<void> {
  const res = await fetch(`${monixApiBase()}/api/cloudflare/disconnect/`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to disconnect Cloudflare");
  invalidateApiCache("cloudflare:");
}

/** List all zones accessible via the stored Cloudflare token. */
export async function getCloudflareZones(
  options?: CachedRequestOptions,
): Promise<CloudflareZone[]> {
  return cachedRequest(
    "cloudflare:zones",
    async () => {
      const res = await fetch(`${monixApiBase()}/api/cloudflare/zones/`, {
        headers: await authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(
          (err as { error?: string }).error || "Failed to fetch zones",
          res.status,
        );
      }
      return res.json();
    },
    { ttlMs: 60_000, ...options },
  );
}

/** Fetch traffic/threat analytics for a zone over the given number of days. */
export async function getCloudflareAnalytics(
  zoneId: string,
  days = 7,
  options?: CachedRequestOptions,
): Promise<CloudflareAnalytics> {
  return cachedRequest(
    `cloudflare:analytics:${zoneId}:${days}`,
    async () => {
      const params = new URLSearchParams({
        zone_id: zoneId,
        days: String(days),
      });
      const res = await fetch(
        `${monixApiBase()}/api/cloudflare/analytics/?${params}`,
        { headers: await authHeaders() },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new ApiError(
          (err as { error?: string }).error || "Failed to fetch analytics",
          res.status,
        );
      }
      return res.json();
    },
    { ttlMs: 60_000, ...options },
  );
}
