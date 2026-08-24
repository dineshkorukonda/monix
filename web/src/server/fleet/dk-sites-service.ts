import { queryMaybeOne, queryRows } from "@/server/db/postgres";
import {
  pingUrl,
  processSiteUptimeCheck,
} from "@/server/uptime/uptime-checker";

export interface FleetSiteConfig {
  id?: string;
  name: string;
  url: string;
  slug: string;
  category: string;
  isCustom?: boolean;
}

export const DK_DEFAULT_SITES: FleetSiteConfig[] = [
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
  },
  {
    name: "KLU LMS Portal",
    url: "https://lms.kluniversity.in",
    slug: "lms-kluniversity",
    category: "KL University",
  },
  {
    name: "KLEF Main Portal",
    url: "https://klef.in",
    slug: "klef",
    category: "KL University",
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

export interface DailyAvailabilityTile {
  date: string;
  uptimePercent: number;
  checksCount: number;
  status: "up" | "degraded" | "down" | "no_data";
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
  status: "up" | "down" | "degraded" | "unknown";
  isLoginProtected: boolean;
  loginPortalType: string | null; // e.g. "SSO / ERP Portal", "Sign In Form", "Protected Access"
  statusCode: number | null;
  currentResponseTimeMs: number | null;
  avgResponseTimeMs24h: number | null;
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
  dailyAvailability30d: DailyAvailabilityTile[];
  hourlyDistribution: Array<{
    hour: number;
    avgLatencyMs: number | null;
  }>;
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
 * Generate 30 daily availability buckets for timeline display.
 */
function generate30DayAvailability(
  recentChecks: Array<{ checked_at: string; status: string }>,
): DailyAvailabilityTile[] {
  const tiles: DailyAvailabilityTile[] = [];
  const now = new Date();

  // Create 30 days from 29 days ago to today
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];

    const dayChecks = recentChecks.filter((c) =>
      c.checked_at.startsWith(dateStr),
    );

    if (dayChecks.length === 0) {
      // Default to operational if no specific outages recorded on historical days
      tiles.push({
        date: dateStr,
        uptimePercent: 100,
        checksCount: 0,
        status: "up",
      });
    } else {
      const upCount = dayChecks.filter((c) => c.status === "up").length;
      const uptime = Math.round((upCount / dayChecks.length) * 100);
      const status = uptime >= 99 ? "up" : uptime >= 85 ? "degraded" : "down";

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
 * Probes a website and performs deep HTTP/HTML analysis (detecting login/SSO portals, title, redirects).
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

    // Read initial HTML text (first 100KB)
    let bodyText = "";
    try {
      const fullText = await res.text();
      bodyText = fullText.slice(0, 100000);
      const titleMatch = bodyText.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch?.[1]) {
        pageTitle = titleMatch[1].trim();
      }
    } catch {
      // ignore body read error
    }

    // Detect login / authentication screens
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

    // Status evaluation: 200-399 are UP. 401/403 are UP (protected). 500+ is DOWN.
    if (statusCode >= 200 && statusCode < 400) {
      isUp = true;
    } else if (statusCode === 401 || statusCode === 403) {
      isUp = true; // Reachable and securely enforcing access control
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
  const dummyHistory = [
    {
      timestamp: nowIso,
      responseTimeMs,
      status: isUp ? ("up" as const) : ("down" as const),
    },
  ];

  return {
    id: site.id || `ad-hoc-${site.slug}`,
    name: site.name,
    url: site.url,
    finalUrl,
    pageTitle,
    slug: site.slug,
    category: site.category,
    isCustom: site.isCustom,
    status: isUp ? ((responseTimeMs ?? 0) > 1200 ? "degraded" : "up") : "down",
    isLoginProtected,
    loginPortalType,
    statusCode,
    currentResponseTimeMs: responseTimeMs,
    avgResponseTimeMs24h: responseTimeMs,
    lastCheckedAt: nowIso,
    uptimePercentage24h: isUp ? 100 : 0,
    uptimePercentage7d: isUp ? 100 : 0,
    uptimePercentage30d: isUp ? 100 : 0,
    certDaysRemaining: certDays,
    certIssuer,
    certWarning: certDays != null && certDays <= 14,
    responseTimeHistory24h: dummyHistory,
    dailyAvailability30d: generate30DayAvailability(
      isUp ? [{ checked_at: nowIso, status: "up" }] : [],
    ),
    hourlyDistribution: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      avgLatencyMs: h === new Date().getHours() ? responseTimeMs : null,
    })),
    activeIncidentsCount: isUp ? 0 : 1,
    latestIncident: isUp
      ? null
      : {
          startedAt: nowIso,
          cause: errorMsg || `HTTP ${statusCode || "Error"}`,
        },
  };
}

/**
 * Ensures default fleet targets exist in database and fetches all active fleet targets.
 */
export async function getActiveFleetConfigs(): Promise<FleetSiteConfig[]> {
  const fleetList: FleetSiteConfig[] = [...DK_DEFAULT_SITES];

  try {
    // 1. Seed defaults if missing
    for (const site of DK_DEFAULT_SITES) {
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
      }
    }

    // 2. Fetch any custom user-added fleet targets
    const customRows = await queryRows<{
      id: string;
      url: string;
      status_slug: string | null;
    }>(
      `
        select id, url, status_slug
        from public.monix_targets
        where status_slug like 'dk-custom-%'
        order by created_at asc
      `,
    );

    for (const row of customRows) {
      const cleanHost = row.url.replace(/^https?:\/\//, "").split("/")[0];
      fleetList.push({
        id: row.id,
        name: cleanHost,
        url: row.url,
        slug: row.status_slug || `dk-${cleanHost}`,
        category: "Custom Monitored",
        isCustom: true,
      });
    }
  } catch (err) {
    console.warn("Database target lookup fallback to defaults:", err);
  }

  return fleetList;
}

/**
 * Adds a new custom site to the fleet.
 */
export async function addCustomFleetSite(params: {
  name?: string;
  url: string;
  category?: string;
}): Promise<FleetSiteTelemetry> {
  const normalizedUrl = params.url.startsWith("http")
    ? params.url.trim()
    : `https://${params.url.trim()}`;
  const cleanHost = normalizedUrl.replace(/^https?:\/\//, "").split("/")[0];
  const slug = `dk-custom-${cleanHost.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${Date.now().toString(36)}`;
  const category = params.category?.trim() || "Custom Sites";
  const name = params.name?.trim() || cleanHost;

  try {
    const inserted = await queryMaybeOne<{ id: string }>(
      `
        insert into public.monix_targets (url, public_status_page, status_slug)
        values ($1, true, $2)
        returning id
      `,
      [normalizedUrl, slug],
    );

    const siteConfig: FleetSiteConfig = {
      id: inserted?.id,
      name,
      url: normalizedUrl,
      slug,
      category,
      isCustom: true,
    };

    return await probeFleetSite(siteConfig);
  } catch (err) {
    console.warn("Could not insert target in DB, returning probe result:", err);
    return await probeFleetSite({
      name,
      url: normalizedUrl,
      slug,
      category,
      isCustom: true,
    });
  }
}

/**
 * Removes a custom site from the fleet.
 */
export async function removeCustomFleetSite(
  urlOrSlug: string,
): Promise<boolean> {
  try {
    await queryRows(
      `
        delete from public.monix_targets
        where url = $1 or status_slug = $1
      `,
      [urlOrSlug],
    );
    return true;
  } catch (err) {
    console.warn("Failed to delete custom site:", err);
    return false;
  }
}

/**
 * Compiles comprehensive telemetry, timeline comparison, and availability metrics for all fleet sites.
 */
export async function getFleetTelemetry(): Promise<FleetOverviewData> {
  const fleetConfigs = await getActiveFleetConfigs();
  const siteResults: FleetSiteTelemetry[] = [];

  // Probe sites concurrently
  const probedSites = await Promise.all(
    fleetConfigs.map(async (site) => {
      try {
        // Query DB for historical data if available
        let siteId = site.id;
        if (!siteId) {
          const target = await queryMaybeOne<{ id: string }>(
            `select id from public.monix_targets where url = $1 limit 1`,
            [site.url],
          );
          siteId = target?.id;
        }

        // Live probe to get current headers, login portal status, and latency
        const live = await probeFleetSite(site);

        if (siteId) {
          live.id = siteId;

          // Fetch 30-day checks history
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

          if (checkRows.length > 0) {
            // Compute 24h & 7d & 30d uptime
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

            // Generate 30-day availability tiles
            live.dailyAvailability30d = generate30DayAvailability(checkRows);

            // 24h history for line chart
            if (checks24h.length > 0) {
              live.responseTimeHistory24h = checks24h.map((c) => ({
                timestamp: c.checked_at,
                responseTimeMs: c.response_time_ms,
                status: c.status === "up" ? "up" : "down",
              }));
            }
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

  // Compute fleet KPI summaries
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

  // Build unified comparison timeline
  const timelineComparison = siteResults.map((s) => ({
    timestamp: s.lastCheckedAt || new Date().toISOString(),
    siteName: s.name,
    latency: s.currentResponseTimeMs,
    status: s.status,
  }));

  // Collect distinct categories
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
export async function probeAndRecordAllFleetSites(): Promise<FleetOverviewData> {
  const fleetConfigs = await getActiveFleetConfigs();

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

  return getFleetTelemetry();
}
