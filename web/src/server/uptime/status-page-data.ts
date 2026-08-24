import { queryMaybeOne, queryRows } from "@/server/db/postgres";

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

  // Fetch target - must have public_status_page = true
  const site = await dbQueryMaybeOne<{
    id: string;
    url: string;
    public_status_page: boolean;
    status_slug: string | null;
  }>(
    isUuid
      ? `
          select id, url, public_status_page, status_slug
          from public.monix_targets
          where id = $1::uuid and public_status_page = true
          limit 1
        `
      : `
          select id, url, public_status_page, status_slug
          from public.monix_targets
          where status_slug = $1 and public_status_page = true
          limit 1
        `,
    [slugOrId],
  );

  if (!site) return null;

  // 1. Latest check
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

  // 2. 24h Response Time History & Stats
  const checks24h = await dbQueryRows<{
    status: "up" | "down";
    response_time_ms: number | null;
    checked_at: string;
  }>(
    `
      select status, response_time_ms, checked_at
      from public.uptime_checks
      where site_id = $1::uuid and checked_at >= now() - interval '24 hours'
      order by checked_at asc
    `,
    [site.id],
  );

  const upCount24h = checks24h.filter((c) => c.status === "up").length;
  const uptime24h =
    checks24h.length > 0
      ? Math.round((upCount24h / checks24h.length) * 10000) / 100
      : 100;

  // 3. 30d Uptime Percentage
  const stats30d = await dbQueryMaybeOne<{
    total: string;
    up_count: string;
  }>(
    `
      select 
        count(*)::text as total,
        count(*) filter (where status = 'up')::text as up_count
      from public.uptime_checks
      where site_id = $1::uuid and checked_at >= now() - interval '30 days'
    `,
    [site.id],
  );

  const total30d = Number(stats30d?.total || 0);
  const up30d = Number(stats30d?.up_count || 0);
  const uptime30d =
    total30d > 0 ? Math.round((up30d / total30d) * 10000) / 100 : 100;

  // 4. Incidents Log (Last 30 days)
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
      order by started_at desc
      limit 50
    `,
    [site.id],
  );

  const incidents = incidentRows.map((i) => {
    let durationSeconds: number | null = null;
    if (i.ended_at) {
      durationSeconds = Math.max(
        1,
        Math.round(
          (new Date(i.ended_at).getTime() - new Date(i.started_at).getTime()) /
            1000,
        ),
      );
    }
    return {
      id: i.id,
      startedAt: i.started_at,
      endedAt: i.ended_at,
      durationSeconds,
      cause: i.cause,
      status: i.ended_at ? ("resolved" as const) : ("ongoing" as const),
    };
  });

  return {
    site: {
      id: site.id,
      name: displayHost(site.url),
      url: site.url,
      status: latestCheck ? latestCheck.status : "unknown",
      currentResponseTimeMs: latestCheck?.response_time_ms ?? null,
      currentStatusCode: latestCheck?.status_code ?? null,
      lastCheckedAt: latestCheck?.checked_at ?? null,
      uptimePercentage24h: uptime24h,
      uptimePercentage30d: uptime30d,
    },
    responseTimeHistory24h: checks24h.map((c) => ({
      timestamp: c.checked_at,
      responseTimeMs: c.response_time_ms,
      status: c.status,
    })),
    incidents,
  };
}
