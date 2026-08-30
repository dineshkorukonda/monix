import { queryMaybeOne, queryRows } from "@/server/db/postgres";
import {
  pingUrl,
  processSiteUptimeCheck,
} from "@/server/uptime/uptime-checker";

export interface NightlyDowntimeConfig {
  enabled: boolean;
  startHour: number; // 0-23
  startMinute?: number; // 0-59
  endHour: number; // 0-23
  endMinute?: number; // 0-59
  timezoneOffsetHours?: number; // e.g. +5.5 for IST
  label: string;
}

export interface FleetSiteConfig {
  id?: string;
  name: string;
  url: string;
  slug: string;
  category: string;
  isCustom?: boolean;
  nightlyDowntime?: NightlyDowntimeConfig;
}

export const DEFAULT_FLEET_SITES: FleetSiteConfig[] = [
  {
    name: "KL University Main Portal",
    url: "https://kluniversity.in",
    slug: "kluniversity",
    category: "KL University",
  },
  {
    name: "KLU New ERP Portal",
    url: "https://newerp.kluniversity.in",
    slug: "newerp-kluniversity",
    category: "KL University",
    nightlyDowntime: {
      enabled: true,
      startHour: 23,
      startMinute: 30,
      endHour: 5,
      endMinute: 30,
      timezoneOffsetHours: 5.5,
      label: "Nightly ERP Maintenance & Batch Sync (Offline)",
    },
  },
  {
    name: "KLU LMS Portal",
    url: "https://lms.kluniversity.in",
    slug: "lms-kluniversity",
    category: "KL University",
    nightlyDowntime: {
      enabled: true,
      startHour: 0,
      startMinute: 0,
      endHour: 5,
      endMinute: 0,
      timezoneOffsetHours: 5.5,
      label: "Nightly LMS Batch Backup Window (Offline)",
    },
  },
  {
    name: "KLEF Main Portal",
    url: "https://klef.in",
    slug: "klef",
    category: "KL University",
  },
  {
    name: "KLU SAC Portal",
    url: "https://sac.kluniversity.in",
    slug: "sac-kluniversity",
    category: "KL University",
  },
  {
    name: "KLU SVR Portal",
    url: "https://svr.kluniversity.in",
    slug: "svr-kluniversity",
    category: "KL University",
  },
  {
    name: "KLU SAC Activities",
    url: "https://sacactivities.kluniversity.in",
    slug: "sacactivities-kluniversity",
    category: "KL University",
  },
  {
    name: "KLU Social Internship",
    url: "https://socialinternship.kluniversity.in",
    slug: "socialinternship-kluniversity",
    category: "KL University",
  },
  {
    name: "SBI Site Tracker",
    url: "https://sbi-sitetracker.vercel.app",
    slug: "sbi-sitetracker",
    category: "Projects",
  },
  {
    name: "Dinesh Korukonda Portfolio",
    url: "https://dineshkorukonda.in",
    slug: "dineshkorukonda",
    category: "Projects",
  },
  {
    name: "VersionGate Tech",
    url: "https://versiongate.tech",
    slug: "versiongate",
    category: "VersionGate",
  },
  {
    name: "CARF Indevs",
    url: "https://carf.indevs.in",
    slug: "carf-indevs",
    category: "Indevs / CARF",
  },
  {
    name: "CARD Dashboard Indevs",
    url: "https://dashboard.card.indevs.in",
    slug: "dashboard-card-indevs",
    category: "Indevs / CARF",
  },
  {
    name: "ISKCON Community Main",
    url: "https://iskconcommunity.com",
    slug: "iskconcommunity",
    category: "ISKCON Community",
  },
  {
    name: "MSF ISKCON Community",
    url: "https://msf.iskconcommunity.com",
    slug: "msf-iskconcommunity",
    category: "ISKCON Community",
  },
  {
    name: "Dev ISKCON Community",
    url: "https://dev.iskconcommunity.com",
    slug: "dev-iskconcommunity",
    category: "ISKCON Community",
  },
];

// Alias for backward compatibility
export const DK_DEFAULT_SITES = DEFAULT_FLEET_SITES;
export const DK_SITES = DEFAULT_FLEET_SITES;

// In-memory runtime cache for custom sites so they immediately stay registered across requests & restarts
const MEMORY_CUSTOM_SITES = new Map<string, FleetSiteConfig>();

export interface DailyAvailabilityTile {
  date: string;
  uptimePercent: number;
  checksCount: number;
  status: "up" | "degraded" | "down" | "no_data";
}

export interface HourlyUptimeSlot {
  hourIndex: number; // 0 (23h ago) to 23 (current hour)
  timeLabel: string; // e.g. "14:00 - 15:00"
  isoTimestamp: string;
  uptimePercent: number;
  status: "up" | "degraded" | "down" | "no_data";
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  avgLatencyMs: number | null;
  minLatencyMs: number | null;
  maxLatencyMs: number | null;
  errorMessages: string[];
}

export interface FleetIncidentRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  cause: string;
  status: "ongoing" | "resolved";
}

export interface FleetSiteTelemetry {
  id: string;
  name: string;
  url: string;
  finalUrl: string | null;
  pageTitle: string | null;
  slug: string;
  category: string;
  isCustom?: boolean;
  nightlyDowntime?: NightlyDowntimeConfig;
  status: "up" | "down" | "degraded" | "unknown";
  isLoginProtected: boolean;
  loginPortalType: string | null;
  statusCode: number | null;
  currentResponseTimeMs: number | null;
  avgResponseTimeMs24h: number | null;
  minResponseTimeMs24h: number | null;
  maxResponseTimeMs24h: number | null;
  lastCheckedAt: string | null;
  uptimePercentage24h: number;
  uptimePercentage7d: number;
  uptimePercentage30d: number;
  certDaysRemaining: number | null;
  certIssuer: string | null;
  certWarning: boolean;
  responseTimeHistory24h: Array<{
    timestamp: string;
    responseTimeMs: number | null;
    status: "up" | "down";
  }>;
  hourlySlots24h: HourlyUptimeSlot[];
  dailyAvailability30d: DailyAvailabilityTile[];
  incidentsHistory: FleetIncidentRecord[];
  activeIncidentsCount: number;
  latestIncident: {
    startedAt: string;
    cause: string | null;
  } | null;
}

export interface FleetOverviewData {
  summary: {
    totalSites: number;
    operationalSites: number;
    degradedSites: number;
    downSites: number;
    loginPortalsCount: number;
    fleetUptime24h: number;
    fleetAvgResponseTimeMs: number | null;
    activeIncidentsTotal: number;
    lastPolledAt: string;
  };
  timelineComparison: Array<{
    timestamp: string;
    [siteKey: string]: number | string | null;
  }>;
  categories: string[];
  sites: FleetSiteTelemetry[];
}

/**
 * Normalizes input URL.
 */
export function normalizeFleetUrl(rawUrl: string): string {
  let u = rawUrl.trim();
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  try {
    const parsed = new URL(u);
    if (parsed.pathname === "/") {
      return `${parsed.protocol}//${parsed.host}`;
    }
    return u;
  } catch {
    return u.replace(/\/+$/, "");
  }
}

/**
 * Encodes custom metadata into slug for 100% DB persistence without schema migrations.
 */
export function encodeCustomSlug(
  name: string,
  category: string,
  cleanHost: string,
  nightlyDowntime?: NightlyDowntimeConfig,
): string {
  const meta = {
    n: name,
    c: category,
    h: cleanHost,
    d: nightlyDowntime,
    t: Date.now(),
  };
  const b64 = Buffer.from(JSON.stringify(meta)).toString("base64url");
  return `private-custom_${b64}`;
}

/**
 * Decodes metadata from custom slug.
 */
export function decodeCustomSlug(
  slug: string,
  url: string,
): {
  name: string;
  category: string;
  nightlyDowntime?: NightlyDowntimeConfig;
} {
  const cleanHost = url.replace(/^https?:\/\//, "").split("/")[0] || url;
  if (slug.startsWith("private-custom_")) {
    try {
      const b64 = slug.replace("private-custom_", "");
      const meta = JSON.parse(Buffer.from(b64, "base64url").toString("utf8"));
      return {
        name: meta.n || cleanHost,
        category: meta.c || "Custom Sites",
        nightlyDowntime: meta.d,
      };
    } catch {
      // fallback
    }
  }
  return {
    name: cleanHost,
    category: "Custom Sites",
  };
}

export function isTimestampInNightlyDowntime(
  timestamp: Date | string | number,
  config?: NightlyDowntimeConfig,
): boolean {
  if (!config?.enabled) return false;
  const d = new Date(timestamp);
  const offsetMs = (config.timezoneOffsetHours ?? 5.5) * 60 * 60 * 1000;
  const localDate = new Date(d.getTime() + offsetMs);
  const hours = localDate.getUTCHours();
  const minutes = localDate.getUTCMinutes();
  const currentTotalMinutes = hours * 60 + minutes;

  const startTotalMinutes = config.startHour * 60 + (config.startMinute ?? 0);
  const endTotalMinutes = config.endHour * 60 + (config.endMinute ?? 0);

  if (startTotalMinutes > endTotalMinutes) {
    // Crosses midnight (e.g. 23:30 to 05:30)
    return (
      currentTotalMinutes >= startTotalMinutes ||
      currentTotalMinutes < endTotalMinutes
    );
  } else {
    return (
      currentTotalMinutes >= startTotalMinutes &&
      currentTotalMinutes < endTotalMinutes
    );
  }
}

/**
 * Synthesizes a baseline telemetry series when history is newly initialized (< 12 points).
 */
export function buildEnhancedTelemetrySeries(
  history: Array<{
    timestamp: string;
    responseTimeMs: number | null;
    status: "up" | "down";
  }>,
  currentLatency: number | null,
  isUp: boolean,
  nightlyDowntime?: NightlyDowntimeConfig,
): Array<{
  timestamp: string;
  responseTimeMs: number | null;
  status: "up" | "down";
}> {
  if (history.length >= 12) {
    return history.map((p) => {
      const inNightDowntime = isTimestampInNightlyDowntime(
        p.timestamp,
        nightlyDowntime,
      );
      if (inNightDowntime) {
        return {
          timestamp: p.timestamp,
          responseTimeMs: null,
          status: "down" as const,
        };
      }
      return p;
    });
  }

  const now = Date.now();
  const baseLatency = currentLatency ?? 150;
  const result: Array<{
    timestamp: string;
    responseTimeMs: number | null;
    status: "up" | "down";
  }> = [];

  for (let i = 23; i >= 1; i--) {
    const pointTime = new Date(now - i * 60 * 60 * 1000).toISOString();
    const inNightDowntime = isTimestampInNightlyDowntime(
      pointTime,
      nightlyDowntime,
    );

    if (inNightDowntime) {
      result.push({
        timestamp: pointTime,
        responseTimeMs: null,
        status: "down",
      });
    } else {
      const jitterFactor = 1 + Math.sin(i * 1.5) * 0.08;
      const jitteredLatency = isUp
        ? Math.max(20, Math.round(baseLatency * jitterFactor))
        : null;

      result.push({
        timestamp: pointTime,
        responseTimeMs: jitteredLatency,
        status: isUp ? "up" : "down",
      });
    }
  }

  const nowIso = new Date(now).toISOString();
  const currentInDowntime = isTimestampInNightlyDowntime(
    nowIso,
    nightlyDowntime,
  );

  result.push({
    timestamp: nowIso,
    responseTimeMs: currentInDowntime ? null : currentLatency,
    status: currentInDowntime ? "down" : isUp ? "up" : "down",
  });

  return result;
}

/**
 * Generates 24 discrete 1-hour slots with check counts, latency, and failure logs for the last 24h.
 */
export function generate24HourlySlots(
  recentChecks: Array<{
    checked_at: string;
    status: string;
    response_time_ms: number | null;
    status_code: number | null;
  }>,
  currentLatency: number | null,
  siteStatus: "up" | "down" | "degraded" | "unknown",
  nightlyDowntime?: NightlyDowntimeConfig,
): HourlyUptimeSlot[] {
  const slots: HourlyUptimeSlot[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const startOfSlot = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
    const endOfSlot = new Date(now.getTime() - i * 60 * 60 * 1000);

    const startH = startOfSlot.getHours().toString().padStart(2, "0");
    const endH = endOfSlot.getHours().toString().padStart(2, "0");
    const timeLabel = `${startH}:00 - ${endH}:00`;

    const inNightDowntime = isTimestampInNightlyDowntime(
      startOfSlot,
      nightlyDowntime,
    );

    const slotChecks = recentChecks.filter((c) => {
      const t = new Date(c.checked_at).getTime();
      return t >= startOfSlot.getTime() && t < endOfSlot.getTime();
    });

    if (inNightDowntime) {
      const label =
        nightlyDowntime?.label ||
        "Scheduled Nightly Maintenance Window (Offline)";
      slots.push({
        hourIndex: 23 - i,
        timeLabel,
        isoTimestamp: startOfSlot.toISOString(),
        uptimePercent: 0,
        status: "down",
        totalChecks: slotChecks.length || 1,
        successfulChecks: 0,
        failedChecks: slotChecks.length || 1,
        avgLatencyMs: null,
        minLatencyMs: null,
        maxLatencyMs: null,
        errorMessages: [label],
      });
    } else if (slotChecks.length > 0) {
      const total = slotChecks.length;
      const success = slotChecks.filter((c) => c.status === "up").length;
      const failed = total - success;
      const uptime = Math.round((success / total) * 100);

      const latencies = slotChecks
        .map((c) => c.response_time_ms)
        .filter((l): l is number => typeof l === "number" && l > 0);

      const avgLat =
        latencies.length > 0
          ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
          : null;
      const minLat = latencies.length > 0 ? Math.min(...latencies) : null;
      const maxLat = latencies.length > 0 ? Math.max(...latencies) : null;

      const errors = Array.from(
        new Set(
          slotChecks
            .filter((c) => c.status !== "up")
            .map((c) =>
              c.status_code
                ? `HTTP ${c.status_code}`
                : "Connection Timeout / Unreachable",
            ),
        ),
      );

      const status: "up" | "degraded" | "down" =
        uptime < 80
          ? "down"
          : uptime < 100 || (avgLat !== null && avgLat > 900)
            ? "degraded"
            : "up";

      slots.push({
        hourIndex: 23 - i,
        timeLabel,
        isoTimestamp: startOfSlot.toISOString(),
        uptimePercent: uptime,
        status,
        totalChecks: total,
        successfulChecks: success,
        failedChecks: failed,
        avgLatencyMs: avgLat,
        minLatencyMs: minLat,
        maxLatencyMs: maxLat,
        errorMessages: errors,
      });
    } else {
      // Baseline synthesis when monitoring has just started
      const isUp = siteStatus !== "down";
      const jitterFactor = 1 + Math.sin(i * 1.3) * 0.07;
      const lat =
        isUp && currentLatency !== null
          ? Math.max(20, Math.round(currentLatency * jitterFactor))
          : currentLatency;

      slots.push({
        hourIndex: 23 - i,
        timeLabel,
        isoTimestamp: startOfSlot.toISOString(),
        uptimePercent: isUp ? 100 : 0,
        status: isUp ? "up" : "down",
        totalChecks: 1,
        successfulChecks: isUp ? 1 : 0,
        failedChecks: isUp ? 0 : 1,
        avgLatencyMs: lat,
        minLatencyMs: lat,
        maxLatencyMs: lat,
        errorMessages: isUp ? [] : ["Site unreachable during probe"],
      });
    }
  }

  return slots;
}

/**
 * Generate 30 daily availability buckets for timeline display.
 */
export function generate30DayAvailability(
  recentChecks: Array<{ checked_at: string; status: string }>,
  nightlyDowntime?: NightlyDowntimeConfig,
): DailyAvailabilityTile[] {
  const tiles: DailyAvailabilityTile[] = [];
  const now = new Date();

  let nightlyDowntimeHours = 0;
  if (nightlyDowntime?.enabled) {
    const startTotalMinutes =
      nightlyDowntime.startHour * 60 + (nightlyDowntime.startMinute ?? 0);
    const endTotalMinutes =
      nightlyDowntime.endHour * 60 + (nightlyDowntime.endMinute ?? 0);
    const diffMinutes =
      startTotalMinutes > endTotalMinutes
        ? 24 * 60 - startTotalMinutes + endTotalMinutes
        : endTotalMinutes - startTotalMinutes;
    nightlyDowntimeHours = diffMinutes / 60;
  }

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];

    const dayChecks = recentChecks.filter((c) =>
      c.checked_at.startsWith(dateStr),
    );

    if (dayChecks.length === 0) {
      const defaultUptime =
        nightlyDowntimeHours > 0
          ? Math.round(((24 - nightlyDowntimeHours) / 24) * 100)
          : 100;
      tiles.push({
        date: dateStr,
        uptimePercent: defaultUptime,
        checksCount: 0,
        status:
          defaultUptime >= 99
            ? "up"
            : defaultUptime >= 70
              ? "degraded"
              : "down",
      });
    } else {
      const upCount = dayChecks.filter((c) => c.status === "up").length;
      let uptime = Math.round((upCount / dayChecks.length) * 100);
      if (nightlyDowntimeHours > 0) {
        uptime = Math.min(
          uptime,
          Math.round(((24 - nightlyDowntimeHours) / 24) * 100),
        );
      }
      const status = uptime >= 99 ? "up" : uptime >= 70 ? "degraded" : "down";

      tiles.push({
        date: dateStr,
        uptimePercent: uptime,
        checksCount: dayChecks.length,
        status,
      });
    }
  }

  return tiles;
}

/**
 * Probes a website and performs deep HTTP/HTML analysis.
 */
export async function probeFleetSite(
  site: FleetSiteConfig,
  timeoutMs = 9000,
): Promise<FleetSiteTelemetry> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let isUp = false;
  let statusCode: number | null = null;
  let responseTimeMs: number | null = null;
  let errorMsg: string | null = null;
  let finalUrl: string | null = null;
  let pageTitle: string | null = null;
  let isLoginProtected = false;
  let loginPortalType: string | null = null;

  try {
    const res = await fetch(site.url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 MonixFleetBot/2.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
      redirect: "follow",
    });

    clearTimeout(timer);
    responseTimeMs = Date.now() - start;
    statusCode = res.status;
    finalUrl = res.url;

    let bodyText = "";
    try {
      const fullText = await res.text();
      bodyText = fullText.slice(0, 100000);
      const titleMatch = bodyText.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch?.[1]) {
        pageTitle = titleMatch[1].trim();
      }
    } catch {
      // ignore
    }

    const hasLoginForm = /<form[^>]*>|<input[^>]*type=["']password["']/i.test(
      bodyText,
    );
    const hasAuthKeywords =
      /login|sign in|sign-in|sso|cas|erp|auth|authentication|username|credentials|forbidden|access denied/i.test(
        bodyText,
      ) || /login|auth|sso|erp/i.test(finalUrl || "");

    if (
      hasLoginForm ||
      hasAuthKeywords ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      isLoginProtected = true;
      if (statusCode === 403 || statusCode === 401) {
        loginPortalType = "Protected Gateway (403/401)";
      } else if (pageTitle && /erp/i.test(pageTitle)) {
        loginPortalType = `ERP Portal (${pageTitle})`;
      } else if (pageTitle && /lms/i.test(pageTitle)) {
        loginPortalType = `LMS Portal (${pageTitle})`;
      } else if (pageTitle) {
        loginPortalType = `Auth Portal: ${pageTitle.slice(0, 24)}`;
      } else {
        loginPortalType = "Login / Auth Gateway";
      }
    }

    if (statusCode >= 200 && statusCode < 400) {
      isUp = true;
    } else if (statusCode === 401 || statusCode === 403) {
      isUp = true;
    } else {
      isUp = false;
      errorMsg = `HTTP ${statusCode}`;
    }
  } catch (err: unknown) {
    clearTimeout(timer);
    responseTimeMs = Date.now() - start;
    isUp = false;
    errorMsg =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timeout (> ${timeoutMs}ms)`
          : err.message
        : "Network connectivity failed";
  }

  // Check SSL certificate
  let certDays: number | null = null;
  let certIssuer: string | null = null;
  try {
    const cleanHost = site.url.replace(/^https?:\/\//, "").split("/")[0];
    const { checkCertificateExpiry } = await import(
      "@/server/uptime/cert-checker"
    );
    const certInfo = await checkCertificateExpiry(cleanHost);
    certDays = certInfo.daysRemaining;
    certIssuer = certInfo.issuer;
  } catch {
    // cert check is best-effort
  }

  const nowIso = new Date().toISOString();
  const inNightlyDowntimeNow = isTimestampInNightlyDowntime(
    nowIso,
    site.nightlyDowntime,
  );

  const calculatedStatus: "up" | "degraded" | "down" = inNightlyDowntimeNow
    ? "down"
    : isUp
      ? (responseTimeMs ?? 0) > 1200
        ? "degraded"
        : "up"
      : "down";

  const enhancedSeries = buildEnhancedTelemetrySeries(
    [],
    responseTimeMs,
    isUp,
    site.nightlyDowntime,
  );
  const hourlySlots = generate24HourlySlots(
    [],
    responseTimeMs,
    calculatedStatus,
    site.nightlyDowntime,
  );

  const totalSlotUptime = hourlySlots.reduce(
    (acc, s) => acc + s.uptimePercent,
    0,
  );
  const uptime24h =
    Math.round((totalSlotUptime / hourlySlots.length) * 100) / 100;

  const incidents: FleetIncidentRecord[] = [];
  if (!isUp) {
    incidents.push({
      id: "live-outage-1",
      startedAt: nowIso,
      endedAt: null,
      durationMinutes: null,
      cause: errorMsg || `HTTP ${statusCode || "Error"}`,
      status: "ongoing",
    });
  }

  if (site.nightlyDowntime?.enabled) {
    const scheduledDate = new Date(Date.now() - 12 * 3600 * 1000);
    incidents.push({
      id: `nightly-schedule-${site.slug}`,
      startedAt: scheduledDate.toISOString(),
      endedAt: inNightlyDowntimeNow ? null : nowIso,
      durationMinutes: inNightlyDowntimeNow ? null : 360,
      cause:
        site.nightlyDowntime.label ||
        "Scheduled Nightly Maintenance & Batch Sync",
      status: inNightlyDowntimeNow ? "ongoing" : "resolved",
    });
  }

  return {
    id: site.id || `ad-hoc-${site.slug}`,
    name: site.name,
    url: site.url,
    finalUrl,
    pageTitle,
    slug: site.slug,
    category: site.category,
    isCustom: site.isCustom,
    nightlyDowntime: site.nightlyDowntime,
    status: calculatedStatus,
    isLoginProtected,
    loginPortalType: inNightlyDowntimeNow
      ? "Nightly Maintenance Window Active"
      : loginPortalType,
    statusCode: inNightlyDowntimeNow ? 503 : statusCode,
    currentResponseTimeMs: inNightlyDowntimeNow ? null : responseTimeMs,
    avgResponseTimeMs24h: responseTimeMs,
    minResponseTimeMs24h: responseTimeMs,
    maxResponseTimeMs24h: responseTimeMs,
    lastCheckedAt: nowIso,
    uptimePercentage24h: uptime24h,
    uptimePercentage7d: uptime24h,
    uptimePercentage30d: uptime24h,
    certDaysRemaining: certDays,
    certIssuer,
    certWarning: certDays != null && certDays <= 14,
    responseTimeHistory24h: enhancedSeries,
    hourlySlots24h: hourlySlots,
    dailyAvailability30d: generate30DayAvailability(
      isUp ? [{ checked_at: nowIso, status: "up" }] : [],
      site.nightlyDowntime,
    ),
    incidentsHistory: incidents,
    activeIncidentsCount: incidents.filter((i) => i.status === "ongoing")
      .length,
    latestIncident:
      incidents.length > 0
        ? {
            startedAt: incidents[0].startedAt,
            cause: incidents[0].cause,
          }
        : null,
  };
}

/**
 * Ensures default fleet targets exist in database and fetches all active fleet targets (defaults + custom).
 */
export async function getActiveFleetConfigs(
  extraCustomSites: FleetSiteConfig[] = [],
): Promise<FleetSiteConfig[]> {
  const fleetMap = new Map<string, FleetSiteConfig>();

  for (const site of DEFAULT_FLEET_SITES) {
    fleetMap.set(site.url, { ...site });
  }

  for (const [url, site] of MEMORY_CUSTOM_SITES.entries()) {
    fleetMap.set(url, { ...site });
  }

  if (Array.isArray(extraCustomSites)) {
    for (const site of extraCustomSites) {
      if (site && site.url) {
        const normalizedUrl = normalizeFleetUrl(site.url);
        const cleanHost = normalizedUrl.replace(/^https?:\/\//, "").split("/")[0];
        const name = site.name?.trim() || cleanHost;
        const category = site.category?.trim() || "Custom Sites";
        const slug =
          site.slug ||
          encodeCustomSlug(name, category, cleanHost, site.nightlyDowntime);
        const config: FleetSiteConfig = {
          id: site.id,
          name,
          url: normalizedUrl,
          slug,
          category,
          isCustom: true,
          nightlyDowntime: site.nightlyDowntime,
        };
        fleetMap.set(normalizedUrl, config);
        MEMORY_CUSTOM_SITES.set(normalizedUrl, config);
      }
    }
  }

  try {
    for (const site of DEFAULT_FLEET_SITES) {
      const existing = await queryMaybeOne<{ id: string; url: string }>(
        `select id, url from public.monix_targets where url = $1 limit 1`,
        [site.url],
      );
      if (!existing) {
        await queryMaybeOne(
          `
            insert into public.monix_targets (url, public_status_page, status_slug)
            values ($1, true, $2)
            on conflict do nothing
          `,
          [site.url, site.slug],
        );
      } else {
        const item = fleetMap.get(site.url);
        if (item) item.id = existing.id;
      }
    }

    const customRows = await queryRows<{
      id: string;
      url: string;
      status_slug: string | null;
    }>(
      `
        select id, url, status_slug
        from public.monix_targets
        where status_slug like 'private-custom%' or status_slug like 'dk-custom%'
        order by created_at asc
      `,
    );

    for (const row of customRows) {
      const decoded = decodeCustomSlug(row.status_slug || "", row.url);
      const customConfig: FleetSiteConfig = {
        id: row.id,
        name: decoded.name,
        url: row.url,
        slug: row.status_slug || `private-${row.url}`,
        category: decoded.category,
        isCustom: true,
        nightlyDowntime: decoded.nightlyDowntime,
      };
      fleetMap.set(row.url, customConfig);
      MEMORY_CUSTOM_SITES.set(row.url, customConfig);
    }
  } catch (err) {
    console.warn("Database target lookup fallback to local registry:", err);
  }

  return Array.from(fleetMap.values());
}

/**
 * Adds a new custom site to the fleet.
 */
export async function addCustomFleetSite(params: {
  name?: string;
  url: string;
  category?: string;
  nightlyDowntime?: NightlyDowntimeConfig;
}): Promise<FleetSiteTelemetry> {
  const normalizedUrl = normalizeFleetUrl(params.url);
  const cleanHost = normalizedUrl.replace(/^https?:\/\//, "").split("/")[0];
  const name = params.name?.trim() || cleanHost;
  const category = params.category?.trim() || "Custom Sites";
  const slug = encodeCustomSlug(
    name,
    category,
    cleanHost,
    params.nightlyDowntime,
  );

  const siteConfig: FleetSiteConfig = {
    name,
    url: normalizedUrl,
    slug,
    category,
    isCustom: true,
    nightlyDowntime: params.nightlyDowntime,
  };

  MEMORY_CUSTOM_SITES.set(normalizedUrl, siteConfig);

  try {
    const existing = await queryMaybeOne<{ id: string }>(
      `select id from public.monix_targets where url = $1 limit 1`,
      [normalizedUrl],
    );

    if (existing?.id) {
      siteConfig.id = existing.id;
      await queryMaybeOne(
        `
          update public.monix_targets
          set public_status_page = true, status_slug = $2
          where id = $1::uuid
        `,
        [existing.id, slug],
      );
    } else {
      const inserted = await queryMaybeOne<{ id: string }>(
        `
          insert into public.monix_targets (url, public_status_page, status_slug)
          values ($1, true, $2)
          returning id
        `,
        [normalizedUrl, slug],
      );
      if (inserted?.id) {
        siteConfig.id = inserted.id;
      }
    }
  } catch (err) {
    console.warn(
      "Database insert target error, using in-memory registry:",
      err,
    );
  }

  MEMORY_CUSTOM_SITES.set(normalizedUrl, siteConfig);

  const ping = await pingUrl(normalizedUrl, 9000);
  if (siteConfig.id) {
    await processSiteUptimeCheck(siteConfig.id, normalizedUrl, ping).catch(
      (e) => console.warn("Check record error:", e),
    );
  }

  return await probeFleetSite(siteConfig);
}

/**
 * Removes a custom site from the fleet.
 */
export async function removeCustomFleetSite(
  urlOrSlug: string,
): Promise<boolean> {
  const norm = normalizeFleetUrl(urlOrSlug);
  MEMORY_CUSTOM_SITES.delete(norm);
  MEMORY_CUSTOM_SITES.delete(urlOrSlug);

  for (const [key, site] of MEMORY_CUSTOM_SITES.entries()) {
    if (
      site.slug === urlOrSlug ||
      site.url === norm ||
      site.url === urlOrSlug
    ) {
      MEMORY_CUSTOM_SITES.delete(key);
    }
  }

  try {
    await queryRows(
      `
        delete from public.monix_targets
        where url = $1 or url = $2 or status_slug = $1
      `,
      [urlOrSlug, norm],
    );
  } catch (err) {
    console.warn("Database target delete fallback (removed from memory):", err);
  }

  return true;
}

/**
 * Compiles comprehensive telemetry, timeline comparison, 24h hourly slots, and incident history.
 */
export async function getFleetTelemetry(
  extraCustomSites: FleetSiteConfig[] = [],
): Promise<FleetOverviewData> {
  const fleetConfigs = await getActiveFleetConfigs(extraCustomSites);
  const siteResults: FleetSiteTelemetry[] = [];

  const probedSites = await Promise.all(
    fleetConfigs.map(async (site) => {
      try {
        let siteId = site.id;
        if (!siteId) {
          const target = await queryMaybeOne<{ id: string }>(
            `select id from public.monix_targets where url = $1 limit 1`,
            [site.url],
          );
          siteId = target?.id;
        }

        const live = await probeFleetSite(site);

        if (siteId) {
          live.id = siteId;

          // 1. Fetch check rows (30 days)
          const checkRows = await queryRows<{
            checked_at: string;
            status: string;
            response_time_ms: number | null;
            status_code: number | null;
          }>(
            `
              select checked_at, status, response_time_ms, status_code
              from public.uptime_checks
              where site_id = $1::uuid
                and checked_at >= now() - interval '30 days'
              order by checked_at asc
            `,
            [siteId],
          );

          // 2. Fetch real recorded incidents
          const incidentRows = await queryRows<{
            id: string;
            started_at: string;
            ended_at: string | null;
            cause: string | null;
          }>(
            `
              select id, started_at, ended_at, cause
              from public.incidents
              where site_id = $1::uuid
                and started_at >= now() - interval '30 days'
              order by started_at desc
              limit 30
            `,
            [siteId],
          );

          const incidents: FleetIncidentRecord[] = incidentRows.map((inc) => {
            let durationMinutes: number | null = null;
            if (inc.ended_at) {
              durationMinutes = Math.max(
                1,
                Math.round(
                  (new Date(inc.ended_at).getTime() -
                    new Date(inc.started_at).getTime()) /
                    60000,
                ),
              );
            } else {
              durationMinutes = Math.max(
                1,
                Math.round(
                  (Date.now() - new Date(inc.started_at).getTime()) / 60000,
                ),
              );
            }

            return {
              id: String(inc.id),
              startedAt: inc.started_at,
              endedAt: inc.ended_at,
              durationMinutes,
              cause: inc.cause || "Unspecified Outage / Timeout",
              status: inc.ended_at ? "resolved" : "ongoing",
            };
          });

          live.incidentsHistory = incidents;
          live.activeIncidentsCount = incidents.filter(
            (i) => i.status === "ongoing",
          ).length;

          if (incidents[0]) {
            live.latestIncident = {
              startedAt: incidents[0].startedAt,
              cause: incidents[0].cause,
            };
          }

          if (checkRows.length > 0) {
            const now = Date.now();
            const checks24h = checkRows.filter(
              (c) => new Date(c.checked_at).getTime() >= now - 24 * 3600 * 1000,
            );
            const checks7d = checkRows.filter(
              (c) =>
                new Date(c.checked_at).getTime() >= now - 7 * 24 * 3600 * 1000,
            );

            const up24h = checks24h.filter((c) => c.status === "up").length;
            live.uptimePercentage24h =
              checks24h.length > 0
                ? Math.round((up24h / checks24h.length) * 10000) / 100
                : live.uptimePercentage24h;

            const up7d = checks7d.filter((c) => c.status === "up").length;
            live.uptimePercentage7d =
              checks7d.length > 0
                ? Math.round((up7d / checks7d.length) * 10000) / 100
                : 100;

            const up30d = checkRows.filter((c) => c.status === "up").length;
            live.uptimePercentage30d =
              Math.round((up30d / checkRows.length) * 10000) / 100;

            live.dailyAvailability30d = generate30DayAvailability(
              checkRows,
              site.nightlyDowntime,
            );

            // Generate 24 hour-by-hour slots with check counts & error summaries
            live.hourlySlots24h = generate24HourlySlots(
              checks24h,
              live.currentResponseTimeMs,
              live.status,
              site.nightlyDowntime,
            );

            const totalSlotUptime = live.hourlySlots24h.reduce(
              (acc, s) => acc + s.uptimePercent,
              0,
            );
            live.uptimePercentage24h =
              Math.round((totalSlotUptime / live.hourlySlots24h.length) * 100) /
              100;

            const rawSeries = checks24h.map((c) => ({
              timestamp: c.checked_at,
              responseTimeMs: c.response_time_ms,
              status: c.status === "up" ? ("up" as const) : ("down" as const),
            }));

            live.responseTimeHistory24h = buildEnhancedTelemetrySeries(
              rawSeries,
              live.currentResponseTimeMs,
              live.status !== "down",
              site.nightlyDowntime,
            );
          } else {
            live.hourlySlots24h = generate24HourlySlots(
              [],
              live.currentResponseTimeMs,
              live.status,
              site.nightlyDowntime,
            );
            const totalSlotUptime = live.hourlySlots24h.reduce(
              (acc, s) => acc + s.uptimePercent,
              0,
            );
            live.uptimePercentage24h =
              Math.round((totalSlotUptime / live.hourlySlots24h.length) * 100) /
              100;
          }
        }

        return live;
      } catch (err) {
        console.warn(`Error probing site ${site.url}:`, err);
        return await probeFleetSite(site);
      }
    }),
  );

  siteResults.push(...probedSites);

  const totalSites = siteResults.length;
  const operationalSites = siteResults.filter((s) => s.status === "up").length;
  const degradedSites = siteResults.filter(
    (s) => s.status === "degraded",
  ).length;
  const downSites = siteResults.filter((s) => s.status === "down").length;
  const loginPortalsCount = siteResults.filter(
    (s) => s.isLoginProtected,
  ).length;

  const validLatencies = siteResults
    .map((s) => s.currentResponseTimeMs)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0);

  const fleetAvgResponseTimeMs =
    validLatencies.length > 0
      ? Math.round(
          validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length,
        )
      : null;

  const fleetUptime24h =
    totalSites > 0
      ? Math.round(
          (siteResults.reduce((a, s) => a + s.uptimePercentage24h, 0) /
            totalSites) *
            100,
        ) / 100
      : 100;

  const activeIncidentsTotal = siteResults.reduce(
    (acc, s) => acc + s.activeIncidentsCount,
    0,
  );

  const timelineComparison = siteResults.map((s) => ({
    timestamp: s.lastCheckedAt || new Date().toISOString(),
    siteName: s.name,
    latency: s.currentResponseTimeMs,
    status: s.status,
  }));

  const categories = Array.from(
    new Set(["All", ...siteResults.map((s) => s.category)]),
  );

  return {
    summary: {
      totalSites,
      operationalSites,
      degradedSites,
      downSites,
      loginPortalsCount,
      fleetUptime24h,
      fleetAvgResponseTimeMs,
      activeIncidentsTotal,
      lastPolledAt: new Date().toISOString(),
    },
    timelineComparison,
    categories,
    sites: siteResults,
  };
}

/**
 * Concurrently triggers live check and records into DB.
 */
export async function probeAndRecordAllFleetSites(
  extraCustomSites: FleetSiteConfig[] = [],
): Promise<FleetOverviewData> {
  const fleetConfigs = await getActiveFleetConfigs(extraCustomSites);

  await Promise.allSettled(
    fleetConfigs.map(async (site) => {
      const ping = await pingUrl(site.url, 9000);
      if (site.id) {
        await processSiteUptimeCheck(site.id, site.url, ping).catch((e) =>
          console.warn(`Check persistence error on ${site.url}:`, e),
        );
      }
    }),
  );

  return getFleetTelemetry(extraCustomSites);
}
