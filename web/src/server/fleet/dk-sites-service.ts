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
  category: "KL University" | "ISKCON Community";
}

export const DK_SITES: FleetSiteConfig[] = [
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

export interface FleetSiteTelemetry {
  id: string;
  name: string;
  url: string;
  slug: string;
  category: string;
  status: "up" | "down" | "degraded" | "unknown";
  statusCode: number | null;
  currentResponseTimeMs: number | null;
  avgResponseTimeMs24h: number | null;
  lastCheckedAt: string | null;
  uptimePercentage24h: number;
  uptimePercentage30d: number;
  certDaysRemaining: number | null;
  certIssuer: string | null;
  certWarning: boolean;
  responseTimeHistory24h: Array<{
    timestamp: string;
    responseTimeMs: number | null;
    status: "up" | "down";
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
    fleetUptime24h: number;
    fleetAvgResponseTimeMs: number | null;
    activeIncidentsTotal: number;
    lastPolledAt: string;
  };
  sites: FleetSiteTelemetry[];
}

/**
 * Ensures all DK_SITES targets exist in the database with status pages enabled.
 */
export async function ensureFleetTargetsSeeded(): Promise<Map<string, string>> {
  const urlToIdMap = new Map<string, string>();

  try {
    for (const site of DK_SITES) {
      // Find existing target by URL or slug
      const existing = await queryMaybeOne<{ id: string }>(
        `
          select id from public.monix_targets
          where url = $1 or status_slug = $2
          limit 1
        `,
        [site.url, site.slug],
      );

      if (existing?.id) {
        urlToIdMap.set(site.url, existing.id);
      } else {
        // Create new target entry
        const created = await queryMaybeOne<{ id: string }>(
          `
            insert into public.monix_targets (url, public_status_page, status_slug)
            values ($1, true, $2)
            returning id
          `,
          [site.url, site.slug],
        );
        if (created?.id) {
          urlToIdMap.set(site.url, created.id);
        }
      }
    }
  } catch (err) {
    console.warn("Could not seed fleet targets in database:", err);
  }

  return urlToIdMap;
}

/**
 * Probes a single site directly in real-time.
 */
export async function probeFleetSite(
  site: FleetSiteConfig,
): Promise<FleetSiteTelemetry> {
  const ping = await pingUrl(site.url, 8000);
  const isUp = ping.status === "up";
  const nowIso = new Date().toISOString();

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

  return {
    id: `ad-hoc-${site.slug}`,
    name: site.name,
    url: site.url,
    slug: site.slug,
    category: site.category,
    status: isUp
      ? (ping.responseTimeMs ?? 0) > 1000
        ? "degraded"
        : "up"
      : "down",
    statusCode: ping.statusCode,
    currentResponseTimeMs: ping.responseTimeMs,
    avgResponseTimeMs24h: ping.responseTimeMs,
    lastCheckedAt: nowIso,
    uptimePercentage24h: isUp ? 100 : 0,
    uptimePercentage30d: isUp ? 100 : 0,
    certDaysRemaining: certDays,
    certIssuer,
    certWarning: certDays != null && certDays <= 14,
    responseTimeHistory24h: [
      {
        timestamp: nowIso,
        responseTimeMs: ping.responseTimeMs,
        status: isUp ? "up" : "down",
      },
    ],
    activeIncidentsCount: isUp ? 0 : 1,
    latestIncident: isUp
      ? null
      : {
          startedAt: nowIso,
          cause: ping.error || `HTTP ${ping.statusCode || "Timeout"}`,
        },
  };
}

/**
 * Retrieves comprehensive telemetry for all 7 DK fleet sites.
 */
export async function getFleetTelemetry(): Promise<FleetOverviewData> {
  const targetMap = await ensureFleetTargetsSeeded();
  const siteResults: FleetSiteTelemetry[] = [];

  for (const site of DK_SITES) {
    const siteId = targetMap.get(site.url);

    if (!siteId) {
      // Direct live probe fallback
      const adhoc = await probeFleetSite(site);
      siteResults.push(adhoc);
      continue;
    }

    try {
      // 1. Fetch latest 24h checks
      const recentChecks = await queryRows<{
        checked_at: string;
        status: string;
        response_time_ms: number | null;
        status_code: number | null;
      }>(
        `
          select checked_at, status, response_time_ms, status_code
          from public.uptime_checks
          where site_id = $1::uuid
            and checked_at >= now() - interval '24 hours'
          order by checked_at asc
        `,
        [siteId],
      );

      // 2. Fetch 30-day stats
      const thirtyDayStats = await queryMaybeOne<{
        total_checks: string;
        up_checks: string;
      }>(
        `
          select count(*)::text as total_checks,
                 count(*) filter (where status = 'up')::text as up_checks
          from public.uptime_checks
          where site_id = $1::uuid
            and checked_at >= now() - interval '30 days'
        `,
        [siteId],
      );

      // 3. Fetch active incidents
      const activeIncidents = await queryRows<{
        id: string;
        started_at: string;
        cause: string | null;
      }>(
        `
          select id, started_at, cause
          from public.incidents
          where site_id = $1::uuid and ended_at is null
          order by started_at desc
        `,
        [siteId],
      );

      // 4. Fetch target metadata (certs)
      const targetMeta = await queryMaybeOne<{
        certificate_expiry_at: string | null;
        cert_issuer: string | null;
        cert_warning_days: number | null;
      }>(
        `
          select certificate_expiry_at, cert_issuer, cert_warning_days
          from public.monix_targets
          where id = $1::uuid
          limit 1
        `,
        [siteId],
      );

      if (recentChecks.length === 0) {
        // No checks recorded yet in DB, run a live probe
        const liveProbe = await probeFleetSite(site);
        liveProbe.id = siteId;
        siteResults.push(liveProbe);
        continue;
      }

      const total24h = recentChecks.length;
      const up24h = recentChecks.filter((c) => c.status === "up").length;
      const uptime24h = total24h > 0 ? (up24h / total24h) * 100 : 100;

      const total30d = Number(thirtyDayStats?.total_checks ?? total24h);
      const up30d = Number(thirtyDayStats?.up_checks ?? up24h);
      const uptime30d = total30d > 0 ? (up30d / total30d) * 100 : 100;

      const lastCheck = recentChecks[recentChecks.length - 1];
      const isUp = lastCheck.status === "up";

      // Calculate avg response time from valid numbers
      const validLatencies = recentChecks
        .map((c) => c.response_time_ms)
        .filter((ms): ms is number => typeof ms === "number" && ms > 0);
      const avgLatency =
        validLatencies.length > 0
          ? Math.round(
              validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length,
            )
          : lastCheck.response_time_ms;

      let certDaysRemaining: number | null = null;
      if (targetMeta?.certificate_expiry_at) {
        const diffMs =
          new Date(targetMeta.certificate_expiry_at).getTime() - Date.now();
        certDaysRemaining = Math.max(
          0,
          Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
        );
      }

      siteResults.push({
        id: siteId,
        name: site.name,
        url: site.url,
        slug: site.slug,
        category: site.category,
        status: isUp
          ? (lastCheck.response_time_ms ?? 0) > 1200
            ? "degraded"
            : "up"
          : "down",
        statusCode: lastCheck.status_code,
        currentResponseTimeMs: lastCheck.response_time_ms,
        avgResponseTimeMs24h: avgLatency,
        lastCheckedAt: lastCheck.checked_at,
        uptimePercentage24h: Math.round(uptime24h * 100) / 100,
        uptimePercentage30d: Math.round(uptime30d * 100) / 100,
        certDaysRemaining,
        certIssuer: targetMeta?.cert_issuer ?? null,
        certWarning:
          certDaysRemaining !== null &&
          certDaysRemaining <= (targetMeta?.cert_warning_days ?? 14),
        responseTimeHistory24h: recentChecks.map((c) => ({
          timestamp: c.checked_at,
          responseTimeMs: c.response_time_ms,
          status: c.status === "up" ? "up" : "down",
        })),
        activeIncidentsCount: activeIncidents.length,
        latestIncident: activeIncidents[0]
          ? {
              startedAt: activeIncidents[0].started_at,
              cause: activeIncidents[0].cause,
            }
          : null,
      });
    } catch (err) {
      console.warn(`Error compiling telemetry for ${site.url}:`, err);
      const fallback = await probeFleetSite(site);
      siteResults.push(fallback);
    }
  }

  // Calculate fleet-wide summary
  const totalSites = siteResults.length;
  const operationalSites = siteResults.filter((s) => s.status === "up").length;
  const degradedSites = siteResults.filter(
    (s) => s.status === "degraded",
  ).length;
  const downSites = siteResults.filter((s) => s.status === "down").length;

  const validFleetLatencies = siteResults
    .map((s) => s.currentResponseTimeMs)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0);
  const fleetAvgResponseTimeMs =
    validFleetLatencies.length > 0
      ? Math.round(
          validFleetLatencies.reduce((a, b) => a + b, 0) /
            validFleetLatencies.length,
        )
      : null;

  const fleetUptimeSum = siteResults.reduce(
    (acc, s) => acc + s.uptimePercentage24h,
    0,
  );
  const fleetUptime24h =
    totalSites > 0
      ? Math.round((fleetUptimeSum / totalSites) * 100) / 100
      : 100;

  const activeIncidentsTotal = siteResults.reduce(
    (acc, s) => acc + s.activeIncidentsCount,
    0,
  );

  return {
    summary: {
      totalSites,
      operationalSites,
      degradedSites,
      downSites,
      fleetUptime24h,
      fleetAvgResponseTimeMs,
      activeIncidentsTotal,
      lastPolledAt: new Date().toISOString(),
    },
    sites: siteResults,
  };
}

/**
 * Triggers concurrent real-time checks across all 7 sites and saves them to DB.
 */
export async function probeAndRecordAllFleetSites(): Promise<FleetOverviewData> {
  const targetMap = await ensureFleetTargetsSeeded();

  // Concurrently ping all sites
  await Promise.allSettled(
    DK_SITES.map(async (site) => {
      const siteId = targetMap.get(site.url);
      const ping = await pingUrl(site.url, 9000);

      if (siteId) {
        await processSiteUptimeCheck(siteId, site.url, ping).catch((e) =>
          console.warn(`Failed saving check for ${site.url}:`, e),
        );
      }
    }),
  );

  return getFleetTelemetry();
}
