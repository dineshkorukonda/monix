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
  customFetch?: typeof fetch,
): Promise<{
  status: "up" | "down";
  statusCode: number | null;
  responseTimeMs: number | null;
  error?: string;
}> {
  if (customFetch && customFetch !== fetch) {
    const start = Date.now();
    try {
      const res = await customFetch(url);
      const isUp = res.status >= 200 && res.status < 400;
      return {
        status: isUp ? "up" : "down",
        statusCode: res.status,
        responseTimeMs: Date.now() - start,
        error: isUp ? undefined : `HTTP status ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        status: "down",
        statusCode: null,
        responseTimeMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  const { robustProbeSite } = await import("@/server/fleet/probe-helper");
  const result = await robustProbeSite(url, timeoutMs);
  return {
    status: result.isUp ? "up" : "down",
    statusCode: result.statusCode,
    responseTimeMs: result.responseTimeMs,
    error: result.isUp ? undefined : result.error || undefined,
  };
}

export async function processSiteUptimeCheck(
  siteId: string,
  url: string,
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

      // Dispatch webhook for incident.resolved if configured
      const target = await dbQueryMaybeOne<{ webhook_url: string | null }>(
        `select webhook_url from public.monix_targets where id = $1::uuid limit 1`,
        [siteId],
      );
      if (target?.webhook_url) {
        const { dispatchWebhook } = await import(
          "@/server/alerts/webhook-dispatcher"
        );
        await dispatchWebhook(target.webhook_url, {
          event: "incident.resolved",
          site: { id: siteId, url },
          timestamp: new Date().toISOString(),
          details: {
            incidentId: activeIncident.id,
            startedAt: activeIncident.started_at,
            resolvedAt: new Date().toISOString(),
          },
        }).catch((err) => console.error("Webhook dispatch error:", err));
      }
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
        const cause = pingResult.error
          ? pingResult.error
          : pingResult.statusCode
            ? `HTTP ${pingResult.statusCode}`
            : "Unknown downtime";

        const newInc = await dbQueryMaybeOne<{ id: string }>(
          `
            insert into public.incidents (site_id, started_at, cause)
            values ($1::uuid, now(), $2)
            returning id
          `,
          [siteId, cause],
        );
        incidentCreated = true;

        // Dispatch webhook for incident.started if configured
        const target = await dbQueryMaybeOne<{ webhook_url: string | null }>(
          `select webhook_url from public.monix_targets where id = $1::uuid limit 1`,
          [siteId],
        );
        if (target?.webhook_url) {
          const { dispatchWebhook } = await import(
            "@/server/alerts/webhook-dispatcher"
          );
          await dispatchWebhook(target.webhook_url, {
            event: "incident.started",
            site: { id: siteId, url },
            timestamp: new Date().toISOString(),
            details: {
              incidentId: newInc?.id,
              cause,
            },
          }).catch((err) => console.error("Webhook dispatch error:", err));
        }
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
