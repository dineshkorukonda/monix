/**
 * Match Monix targets to Cloudflare zones and roll up edge analytics for dashboard pages.
 */

import {
  type CloudflareAnalytics,
  type CloudflareZone,
  getCloudflareAnalytics,
  getCloudflareStatus,
  getCloudflareZones,
  type Target,
} from "@/lib/api";

export type CfTargetEdge = {
  zone: CloudflareZone;
  analytics: CloudflareAnalytics;
};

export type CfWorkspaceResult = {
  connected: boolean;
  zones: CloudflareZone[];
  /** Per target: edge metrics when hostname matched a zone and analytics loaded */
  byTargetId: Record<string, CfTargetEdge | null>;
  aggregate: CfWorkspaceAggregate;
};

export type CfWorkspaceAggregate = {
  hasData: boolean;
  totalRequests: number;
  totalThreats: number;
  totalCached: number;
  bandwidthBytes: number;
  cacheRatio: number | null;
  periodDays: number;
  matchedProjectCount: number;
  byProject: { name: string; id: string; requests: number; threats: number }[];
};

/** Public hostname from a stored target URL (lowercase, no port). */
export function hostnameFromTargetUrl(url: string): string {
  const raw = url.trim();
  if (!raw) return "";
  try {
    const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
    return u.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Whether a Cloudflare zone apex (e.g. example.com) covers this host (incl. www / subdomains). */
export function zoneCoversHost(zoneName: string, host: string): boolean {
  const z = zoneName.toLowerCase();
  const h = host.toLowerCase();
  if (!z || !h) return false;
  if (h === z) return true;
  if (h.endsWith(`.${z}`)) return true;
  return false;
}

export function findZoneForHost(
  zones: CloudflareZone[],
  host: string,
): CloudflareZone | null {
  const matches = zones.filter((z) => zoneCoversHost(z.name, host));
  if (matches.length === 0) return null;
  return matches.sort((a, b) => b.name.length - a.name.length)[0];
}

function emptyAggregate(periodDays: number): CfWorkspaceAggregate {
  return {
    hasData: false,
    totalRequests: 0,
    totalThreats: 0,
    totalCached: 0,
    bandwidthBytes: 0,
    cacheRatio: null,
    periodDays,
    matchedProjectCount: 0,
    byProject: [],
  };
}

/**
 * Load Cloudflare zones and 7-day analytics for each distinct zone that matches a target hostname.
 * De-duplicates zones so each zone is fetched at most once.
 */
export async function loadCloudflareWorkspaceMetrics(
  targets: Target[],
  options?: { analyticsDays?: number },
): Promise<CfWorkspaceResult> {
  const days = options?.analyticsDays ?? 7;
  if (targets.length === 0) {
    return {
      connected: false,
      zones: [],
      byTargetId: {},
      aggregate: emptyAggregate(days),
    };
  }

  const status = await getCloudflareStatus().catch(() => ({
    connected: false,
  }));
  if (!status.connected) {
    return {
      connected: false,
      zones: [],
      byTargetId: {},
      aggregate: emptyAggregate(days),
    };
  }

  let zones: CloudflareZone[] = [];
  try {
    zones = await getCloudflareZones();
  } catch {
    return {
      connected: true,
      zones: [],
      byTargetId: Object.fromEntries(targets.map((t) => [t.id, null])),
      aggregate: emptyAggregate(days),
    };
  }

  const targetZone = new Map<string, CloudflareZone | null>();
  for (const t of targets) {
    const host = hostnameFromTargetUrl(t.url);
    targetZone.set(t.id, host ? findZoneForHost(zones, host) : null);
  }

  const uniqueZoneIds = [
    ...new Set(
      [...targetZone.values()]
        .filter((z): z is CloudflareZone => z != null)
        .map((z) => z.id),
    ),
  ];

  const analyticsByZoneId = new Map<string, CloudflareAnalytics | null>();
  for (let i = 0; i < uniqueZoneIds.length; i += 4) {
    const chunk = uniqueZoneIds.slice(i, i + 4);
    await Promise.all(
      chunk.map(async (zoneId) => {
        try {
          const analytics = await getCloudflareAnalytics(zoneId, days);
          analyticsByZoneId.set(zoneId, analytics);
        } catch {
          analyticsByZoneId.set(zoneId, null);
        }
      }),
    );
  }

  const byTargetId: Record<string, CfTargetEdge | null> = {};
  for (const t of targets) {
    const z = targetZone.get(t.id) ?? null;
    if (!z) {
      byTargetId[t.id] = null;
      continue;
    }
    const a = analyticsByZoneId.get(z.id);
    byTargetId[t.id] = a ? { zone: z, analytics: a } : null;
  }

  const aggregate = rollUpCfWorkspace(byTargetId, targets, days);
  return { connected: true, zones, byTargetId, aggregate };
}

export function rollUpCfWorkspace(
  byTargetId: Record<string, CfTargetEdge | null>,
  targets: Target[],
  periodDays: number,
): CfWorkspaceAggregate {
  const targetById = new Map(targets.map((t) => [t.id, t]));
  const byProject: CfWorkspaceAggregate["byProject"] = [];
  let totalRequests = 0;
  let totalThreats = 0;
  let totalCached = 0;
  let bandwidthBytes = 0;
  let matched = 0;

  for (const [id, row] of Object.entries(byTargetId)) {
    if (!row?.analytics) continue;
    matched++;
    const a = row.analytics.totals;
    totalRequests += a.requests;
    totalThreats += a.threats;
    totalCached += a.cached_requests;
    bandwidthBytes += a.bandwidth_bytes;
    const t = targetById.get(id);
    byProject.push({
      id,
      name: (t?.name ?? row.analytics.zone_name) || row.zone.name,
      requests: a.requests,
      threats: a.threats,
    });
  }

  byProject.sort((x, y) => y.requests - x.requests);
  const cacheRatio = totalRequests > 0 ? totalCached / totalRequests : null;

  return {
    hasData: matched > 0,
    totalRequests,
    totalThreats,
    totalCached,
    bandwidthBytes,
    cacheRatio,
    periodDays,
    matchedProjectCount: matched,
    byProject: byProject.slice(0, 24),
  };
}

export type CfEdgeIssue = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  site: string;
  page: string;
  recommendation: string;
  category: string;
  date: string;
};

/** Synthetic issues from edge telemetry (complement scan findings). */
export function buildCfEdgeIssues(
  targets: Target[],
  cf: CfWorkspaceResult,
): CfEdgeIssue[] {
  if (!cf.connected) return [];
  const day = new Date().toISOString().slice(0, 10);
  const list: CfEdgeIssue[] = [];

  for (const t of targets) {
    const row = cf.byTargetId[t.id];
    const host = hostnameFromTargetUrl(t.url);
    if (!row && host && cf.zones.length > 0) {
      list.push({
        id: `cf-nomatch-${t.id}`,
        severity: "warning",
        title: "No Cloudflare zone matched this hostname",
        site: t.name,
        page: t.url,
        recommendation:
          "Add the domain to your Cloudflare account or use a hostname that matches a zone on this token.",
        category: "Cloudflare edge",
        date: day,
      });
      continue;
    }
    if (!row?.analytics) continue;
    const th = row.analytics.totals.threats;
    if (th > 500) {
      list.push({
        id: `cf-threats-${t.id}`,
        severity: "critical",
        title: `High volume of edge security events (${th.toLocaleString()} in ${row.analytics.period_days}d)`,
        site: t.name,
        page: t.url,
        recommendation:
          "Review Cloudflare Security events, WAF, and firewall rules for this zone.",
        category: "Cloudflare edge",
        date: day,
      });
    } else if (th > 0) {
      list.push({
        id: `cf-threats-${t.id}`,
        severity: "info",
        title: `Cloudflare recorded ${th.toLocaleString()} security event${th === 1 ? "" : "s"} (${row.analytics.period_days}d)`,
        site: t.name,
        page: t.url,
        recommendation:
          "Check Cloudflare Security overview for blocked or challenged requests.",
        category: "Cloudflare edge",
        date: day,
      });
    }
    const r = row.analytics.totals.requests;
    const c = row.analytics.totals.cached_requests;
    if (r > 1000 && c / r < 0.1) {
      list.push({
        id: `cf-cache-${t.id}`,
        severity: "warning",
        title: "Low cache ratio at the edge",
        site: t.name,
        page: t.url,
        recommendation:
          "Consider page rules, cache rules, or origin cache headers to improve cache hit ratio.",
        category: "Cloudflare edge",
        date: day,
      });
    }
  }

  return list;
}
