import { queryMaybeOne, queryRows } from "@/server/db/postgres";
import {
  DEFAULT_FLEET_SITES,
  decodeCustomSlug,
} from "@/server/fleet/private-sites-service";

export interface StatusPageData {
  site: {
    id: string;
    name: string;
    url: string;
    status: "up" | "down" | "unknown";
    currentResponseTimeMs: number | null;
    currentStatusCode: number | null;
    lastCheckedAt: string | null;
    uptimePercentage24h: number;
    uptimePercentage30d: number;
    certificateExpiryAt: string | null;
    certIssuer: string | null;
    certDaysRemaining: number | null;
    certWarning: boolean;
  };
  responseTimeHistory24h: Array<{
    timestamp: string;
    responseTimeMs: number | null;
    status: "up" | "down";
  }>;
  incidents: Array<{
    id: string;
    startedAt: string;
    endedAt: string | null;
    durationSeconds: number | null;
    cause: string | null;
    status: "ongoing" | "resolved";
  }>;
}

function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
}

export async function getStatusPageData(
  slugOrId: string,
  dbQueryMaybeOne = queryMaybeOne,
  dbQueryRows = queryRows,
): Promise<StatusPageData | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      slugOrId,
    );

  // Fetch target - search by ID, status_slug, or direct URL match
  const site = await dbQueryMaybeOne<{
    id: string;
    url: string;
    public_status_page: boolean;
    status_slug: string | null;
    certificate_expiry_at: string | null;
    cert_issuer: string | null;
    cert_warning_days: number | null;
  }>(
    isUuid
      ? `
          select id, url, public_status_page, status_slug,
                 certificate_expiry_at, cert_issuer, cert_warning_days
          from public.monix_targets
          where id = $1::uuid
          limit 1
        `
      : `
          select id, url, public_status_page, status_slug,
                 certificate_expiry_at, cert_issuer, cert_warning_days
          from public.monix_targets
          where status_slug = $1 or url = $1 or url = 'https://' || $1 or url = 'http://' || $1
          limit 1
        `,
    [slugOrId],
  );

  // If not found in DB by exact slug, check if slugOrId matches any fleet predefined sites or custom slugs
  let probeTargetUrl: string | null = null;
  let targetDisplayName = slugOrId;

  if (!site) {
    const fleetMatch = DEFAULT_FLEET_SITES.find(
      (s) =>
        s.slug === slugOrId ||
        s.url.includes(slugOrId) ||
        slugOrId.includes(s.slug),
    );

    if (fleetMatch) {
      probeTargetUrl = fleetMatch.url;
      targetDisplayName = fleetMatch.name;
    } else if (slugOrId.startsWith("private-custom_")) {
      const decoded = decodeCustomSlug(slugOrId, slugOrId);
      targetDisplayName = decoded.name;
    } else {
      const cleanHost = slugOrId
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        ?.trim();
      const isDomainLike =
        cleanHost?.includes(".") && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanHost);

      if (isDomainLike) {
        probeTargetUrl = slugOrId.startsWith("http")
          ? slugOrId
          : `https://${cleanHost}`;
        targetDisplayName = cleanHost;
      }
    }

    if (probeTargetUrl) {
      const cleanHost = probeTargetUrl
        .replace(/^https?:\/\//, "")
        .split("/")[0]
        ?.trim();
      try {
        const { robustProbeSite } = await import("@/server/fleet/probe-helper");
        const probe = await robustProbeSite(probeTargetUrl, 9000);

        let certDays: number | null = null;
        let certIssuer: string | null = null;
        try {
          const { checkCertificateExpiry } = await import(
            "@/server/uptime/cert-checker"
          );
          const certInfo = await checkCertificateExpiry(cleanHost);
          certDays = certInfo.daysRemaining;
          certIssuer = certInfo.issuer;
        } catch {
          // ignore cert failure
        }

        return {
          site: {
            id: `ad-hoc-${cleanHost}`,
            name: probe.pageTitle || targetDisplayName,
            url: probe.finalUrl || probeTargetUrl,
            status: probe.isUp ? "up" : "down",
            currentResponseTimeMs: probe.responseTimeMs,
            currentStatusCode: probe.statusCode,
            lastCheckedAt: new Date().toISOString(),
            uptimePercentage24h: probe.isUp ? 100 : 0,
            uptimePercentage30d: probe.isUp ? 100 : 0,
            certificateExpiryAt: null,
            certIssuer,
            certDaysRemaining: certDays,
            certWarning: certDays != null && certDays <= 14,
          },
          responseTimeHistory24h: [
            {
              timestamp: new Date().toISOString(),
              responseTimeMs: probe.responseTimeMs,
              status: probe.isUp ? "up" : "down",
            },
          ],
          incidents: probe.isUp
            ? []
            : [
                {
                  id: "live-incident-1",
                  startedAt: new Date().toISOString(),
                  endedAt: null,
                  durationSeconds: null,
                  cause:
                    probe.error ||
                    `HTTP ${probe.statusCode || "Error"} error detected on live health probe`,
                  status: "ongoing",
                },
              ],
        };
      } catch (err: unknown) {
        return {
          site: {
            id: `ad-hoc-${cleanHost}`,
            name: targetDisplayName,
            url: probeTargetUrl,
            status: "down",
            currentResponseTimeMs: null,
            currentStatusCode: null,
            lastCheckedAt: new Date().toISOString(),
            uptimePercentage24h: 0,
            uptimePercentage30d: 0,
            certificateExpiryAt: null,
            certIssuer: null,
            certDaysRemaining: null,
            certWarning: false,
          },
          responseTimeHistory24h: [],
          incidents: [
            {
              id: "live-incident-1",
              startedAt: new Date().toISOString(),
              endedAt: null,
              durationSeconds: null,
              cause:
                err instanceof Error
                  ? err.message
                  : "Connection failed or host unreachable",
              status: "ongoing",
            },
          ],
        };
      }
    }

    return null;
  }

  // Target exists in DB - fetch check records & incidents
  const latestCheck = await dbQueryMaybeOne<{
    status: "up" | "down";
    response_time_ms: number | null;
    status_code: number | null;
    checked_at: string;
  }>(
    `
      select status, response_time_ms, status_code, checked_at
      from public.uptime_checks
      where site_id = $1::uuid
      order by checked_at desc
      limit 1
    `,
    [site.id],
  );

  const stats24h = await dbQueryMaybeOne<{
    total: string;
    up_count: string;
  }>(
    `
      select
        count(*)::text as total,
        count(*) filter (where status = 'up')::text as up_count
      from public.uptime_checks
      where site_id = $1::uuid
        and checked_at >= now() - interval '24 hours'
    `,
    [site.id],
  );

  const stats30d = await dbQueryMaybeOne<{
    total: string;
    up_count: string;
  }>(
    `
      select
        count(*)::text as total,
        count(*) filter (where status = 'up')::text as up_count
      from public.uptime_checks
      where site_id = $1::uuid
        and checked_at >= now() - interval '30 days'
    `,
    [site.id],
  );

  const total24h = Number(stats24h?.total ?? 0);
  const up24h = Number(stats24h?.up_count ?? 0);
  const uptime24h = total24h > 0 ? (up24h / total24h) * 100 : 100;

  const total30d = Number(stats30d?.total ?? 0);
  const up30d = Number(stats30d?.up_count ?? 0);
  const uptime30d = total30d > 0 ? (up30d / total30d) * 100 : 100;

  const historyRows = await dbQueryRows<{
    checked_at: string;
    response_time_ms: number | null;
    status: "up" | "down";
  }>(
    `
      select checked_at, response_time_ms, status
      from public.uptime_checks
      where site_id = $1::uuid
        and checked_at >= now() - interval '24 hours'
      order by checked_at asc
    `,
    [site.id],
  );

  const incidentRows = await dbQueryRows<{
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
      limit 20
    `,
    [site.id],
  );

  let certDaysRemaining: number | null = null;
  let certWarning = false;
  if (site.certificate_expiry_at) {
    const diffMs = new Date(site.certificate_expiry_at).getTime() - Date.now();
    certDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    certWarning = certDaysRemaining <= (site.cert_warning_days ?? 14);
  }

  const cleanHost = displayHost(site.url);

  return {
    site: {
      id: site.id,
      name: cleanHost,
      url: site.url,
      status: latestCheck?.status ?? "unknown",
      currentResponseTimeMs: latestCheck?.response_time_ms ?? null,
      currentStatusCode: latestCheck?.status_code ?? null,
      lastCheckedAt: latestCheck?.checked_at ?? null,
      uptimePercentage24h: Math.round(uptime24h * 100) / 100,
      uptimePercentage30d: Math.round(uptime30d * 100) / 100,
      certificateExpiryAt: site.certificate_expiry_at,
      certIssuer: site.cert_issuer,
      certDaysRemaining,
      certWarning,
    },
    responseTimeHistory24h: historyRows.map((r) => ({
      timestamp: r.checked_at,
      responseTimeMs: r.response_time_ms,
      status: r.status,
    })),
    incidents: incidentRows.map((inc) => {
      let durationSeconds: number | null = null;
      if (inc.ended_at) {
        durationSeconds = Math.round(
          (new Date(inc.ended_at).getTime() -
            new Date(inc.started_at).getTime()) /
            1000,
        );
      }
      return {
        id: String(inc.id),
        startedAt: inc.started_at,
        endedAt: inc.ended_at,
        durationSeconds,
        cause: inc.cause,
        status: inc.ended_at ? ("resolved" as const) : ("ongoing" as const),
      };
    }),
  };
}
