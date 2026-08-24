import { queryMaybeOne, queryRows } from "@/server/db/postgres";

export interface PingResult {
  siteId: string;
  url: string;
  status: "up" | "down";
  statusCode: number | null;
  responseTimeMs: number | null;
  error?: string;
}

export interface UptimeCheckRecord {
  id: string;
  site_id: string;
  checked_at: string;
  status: "up" | "down";
  response_time_ms: number | null;
  status_code: number | null;
}

export interface IncidentRecord {
  id: string;
  site_id: string;
  started_at: string;
  ended_at: string | null;
  cause: string | null;
}

export const DEFAULT_TIMEOUT_MS = 10000;
export const CONSECUTIVE_FAILURES_FOR_INCIDENT = 2;

export async function pingUrl(
  url: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  customFetch: typeof fetch = fetch,
): Promise<{
  status: "up" | "down";
  statusCode: number | null;
  responseTimeMs: number | null;
  error?: string;
}> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await customFetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Monix-Uptime-Bot/1.0 (+https://monix.dev)",
      },
      cache: "no-store",
    });
    const responseTimeMs = Date.now() - start;
    clearTimeout(timer);

    const isUp = res.status >= 200 && res.status < 400;
    return {
      status: isUp ? "up" : "down",
      statusCode: res.status,
      responseTimeMs,
      error: isUp ? undefined : `HTTP status ${res.status}`,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const responseTimeMs = Date.now() - start;
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? `Timeout (exceeded ${timeoutMs}ms)`
          : err.message
        : "Network error";
    return {
      status: "down",
      statusCode: null,
      responseTimeMs,
      error: message,
    };
  }
}

export async function processSiteUptimeCheck(
  siteId: string,
  _url: string,
  pingResult: {
    status: "up" | "down";
    statusCode: number | null;
    responseTimeMs: number | null;
    error?: string;
  },
  dbQueryRows = queryRows,
  dbQueryMaybeOne = queryMaybeOne,
): Promise<{
  checkId?: string;
  incidentCreated?: boolean;
  incidentResolved?: boolean;
}> {
  // 1. Record uptime check
  const checkRows = await dbQueryRows<{ id: string }>(
    `
      insert into public.uptime_checks (site_id, checked_at, status, response_time_ms, status_code)
      values ($1::uuid, now(), $2, $3, $4)
      returning id
    `,
    [
      siteId,
      pingResult.status,
      pingResult.responseTimeMs,
      pingResult.statusCode,
    ],
  );
  const checkId = checkRows[0]?.id ? String(checkRows[0].id) : undefined;

  // 2. Fetch active incident if any
  const activeIncident = await dbQueryMaybeOne<{
    id: string;
    site_id: string;
    started_at: string;
  }>(
    `
      select id, site_id, started_at
      from public.incidents
      where site_id = $1::uuid and ended_at is null
      order by started_at desc
      limit 1
    `,
    [siteId],
  );

  let incidentCreated = false;
  let incidentResolved = false;

  if (pingResult.status === "up") {
    // If there is an active incident, resolve it
    if (activeIncident) {
      await dbQueryRows(
        `
          update public.incidents
          set ended_at = now()
          where id = $1
        `,
        [activeIncident.id],
      );
      incidentResolved = true;
    }
  } else {
    // pingResult.status === "down"
    if (!activeIncident) {
      // Check last N checks to see if consecutive failure threshold is reached
      const recentChecks = await dbQueryRows<{
        id: string;
        status: "up" | "down";
      }>(
        `
          select id, status
          from public.uptime_checks
          where site_id = $1::uuid
          order by checked_at desc
          limit $2
        `,
        [siteId, CONSECUTIVE_FAILURES_FOR_INCIDENT],
      );

      const allFailed =
        recentChecks.length >= CONSECUTIVE_FAILURES_FOR_INCIDENT &&
        recentChecks.every((c) => c.status === "down");

      if (allFailed) {
        await dbQueryRows(
          `
            insert into public.incidents (site_id, started_at, cause)
            values ($1::uuid, now(), $2)
          `,
          [siteId, pingResult.error || "Service unavailable"],
        );
        incidentCreated = true;
      }
    }
  }

  return { checkId, incidentCreated, incidentResolved };
}

export async function runAllUptimeChecks(
  options: { timeoutMs?: number; customFetch?: typeof fetch } = {},
): Promise<{
  totalSites: number;
  checksRun: number;
  incidentsCreated: number;
  incidentsResolved: number;
}> {
  // Only query signed-in user monitored sites (monix_targets)
  const sites = await queryRows<{ id: string; url: string }>(
    `
      select id, url
      from public.monix_targets
      where url is not null and url != ''
    `,
  );

  let incidentsCreated = 0;
  let incidentsResolved = 0;
  let checksRun = 0;

  for (const site of sites) {
    try {
      const pingRes = await pingUrl(
        site.url,
        options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        options.customFetch ?? fetch,
      );
      const res = await processSiteUptimeCheck(site.id, site.url, pingRes);
      checksRun++;
      if (res.incidentCreated) incidentsCreated++;
      if (res.incidentResolved) incidentsResolved++;
    } catch (err) {
      console.error(
        `Failed uptime ping for site ${site.id} (${site.url}):`,
        err,
      );
    }
  }

  return {
    totalSites: sites.length,
    checksRun,
    incidentsCreated,
    incidentsResolved,
  };
}
