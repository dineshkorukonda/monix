const CF_V4 = "https://api.cloudflare.com/client/v4";

const ZONE_HTTP_ANALYTICS_QUERY = `
query ZoneHttpAnalytics($zoneTag: string!, $start: Date!, $end: Date!) {
  viewer {
    zones(filter: {zoneTag: $zoneTag}) {
      daily: httpRequests1dGroups(
        limit: 400
        orderBy: [date_ASC]
        filter: { date_geq: $start, date_lt: $end }
      ) {
        dimensions { date }
        sum {
          requests
          cachedRequests
          bytes
          pageViews
          threats
          countryMap { clientCountryName requests }
          responseStatusMap { edgeResponseStatus requests }
        }
        uniq { uniques }
      }
    }
  }
}
`;

export class CloudflareApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CloudflareApiError";
  }
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token.trim()}`,
    "Content-Type": "application/json",
  };
}

async function cfRequest<T>(
  method: string,
  path: string,
  token: string,
  params?: URLSearchParams,
): Promise<T> {
  const url = `${CF_V4}${path}${params?.toString() ? `?${params}` : ""}`;
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: headers(token),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new CloudflareApiError("Could not reach Cloudflare.");
  }
  let data: { success?: boolean; errors?: { message?: string }[]; result?: T };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    throw new CloudflareApiError("Invalid response from Cloudflare.");
  }
  if (!data.success) {
    const msgs = (data.errors ?? [])
      .map((e) => e.message ?? "")
      .filter(Boolean);
    throw new CloudflareApiError(
      (msgs.join("; ") || "Cloudflare API error").slice(0, 500),
    );
  }
  if (res.status >= 400) throw new CloudflareApiError(`HTTP ${res.status}`);
  return data.result as T;
}

async function cfGraphql<T>(
  token: string,
  query: string,
  variables: Record<string, string>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${CF_V4}/graphql`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw new CloudflareApiError("Could not reach Cloudflare.");
  }
  let body: { data?: T; errors?: { message?: string }[] };
  try {
    body = (await res.json()) as typeof body;
  } catch {
    throw new CloudflareApiError("Invalid response from Cloudflare.");
  }
  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message).join("; ");
    throw new CloudflareApiError(msg.slice(0, 800) || "GraphQL error");
  }
  if (res.status >= 400) throw new CloudflareApiError(`HTTP ${res.status}`);
  if (!body.data) throw new CloudflareApiError("Empty GraphQL data.");
  return body.data;
}

export function verifyToken(token: string): Promise<void> {
  return cfRequest("GET", "/user/tokens/verify", token).then((result) => {
    if (result && typeof result === "object" && "status" in result) {
      const st = String(
        (result as { status?: string }).status ?? "",
      ).toLowerCase();
      if (st && st !== "active")
        throw new CloudflareApiError("API token is not active.");
    }
  });
}

export async function listAccounts(
  token: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let page = 1;
  while (true) {
    const batch = await cfRequest<Record<string, unknown>[]>(
      "GET",
      "/accounts",
      token,
      new URLSearchParams({ page: String(page), per_page: "50" }),
    );
    if (!Array.isArray(batch)) break;
    out.push(...batch.filter((x) => x && typeof x === "object"));
    if (batch.length < 50) break;
    page += 1;
  }
  return out;
}

export async function listZonesAll(
  token: string,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let page = 1;
  while (true) {
    const batch = await cfRequest<Record<string, unknown>[]>(
      "GET",
      "/zones",
      token,
      new URLSearchParams({ page: String(page), per_page: "50" }),
    );
    if (!Array.isArray(batch)) break;
    out.push(...batch.filter((x) => x && typeof x === "object"));
    if (batch.length < 50) break;
    page += 1;
  }
  return out;
}

export async function summarizeForConnect(token: string): Promise<{
  account_id: string;
  account_name: string;
  zones_count: number;
}> {
  await verifyToken(token);
  const zones = await listZonesAll(token);
  if (zones.length) {
    const acc = (zones[0].account as Record<string, unknown> | undefined) ?? {};
    const aid = String(acc.id ?? "");
    let aname = String(acc.name ?? "").trim();
    if (!aname) aname = "Cloudflare";
    return { account_id: aid, account_name: aname, zones_count: zones.length };
  }
  let accounts: Record<string, unknown>[] = [];
  try {
    accounts = await listAccounts(token);
  } catch {
    accounts = [];
  }
  if (accounts.length) {
    const a0 = accounts[0];
    return {
      account_id: String(a0.id ?? ""),
      account_name: String(a0.name ?? "Cloudflare").trim() || "Cloudflare",
      zones_count: 0,
    };
  }
  return { account_id: "", account_name: "Cloudflare", zones_count: 0 };
}

export async function getZone(
  token: string,
  zoneId: string,
): Promise<Record<string, unknown>> {
  const result = await cfRequest<unknown>("GET", `/zones/${zoneId}`, token);
  if (!result || typeof result !== "object")
    throw new CloudflareApiError("Zone not found.");
  return result as Record<string, unknown>;
}

export function zonesToApiRows(zones: Record<string, unknown>[]): Array<{
  id: string;
  name: string;
  status: string;
  plan_name: string;
}> {
  const rows: Array<{
    id: string;
    name: string;
    status: string;
    plan_name: string;
  }> = [];
  for (const z of zones) {
    const plan =
      z.plan && typeof z.plan === "object"
        ? (z.plan as Record<string, unknown>)
        : {};
    const planName = String(plan.name ?? plan.legacy_id ?? "");
    rows.push({
      id: String(z.id ?? ""),
      name: String(z.name ?? ""),
      status: String(z.status ?? ""),
      plan_name: planName,
    });
  }
  return rows.filter((r) => r.id);
}

function mergeCountries(
  maps: Record<string, unknown>[][],
): { country: string; requests: number }[] {
  const by: Record<string, number> = {};
  for (const cmap of maps) {
    for (const c of cmap) {
      const cc = String(c.clientCountryName ?? "");
      by[cc] = (by[cc] ?? 0) + Number(c.requests ?? 0);
    }
  }
  return Object.entries(by)
    .filter(([k]) => k)
    .map(([country, requests]) => ({ country, requests }))
    .sort((a, b) => b.requests - a.requests);
}

function mergeStatus(
  maps: Record<string, unknown>[][],
): { status: string; requests: number }[] {
  const by: Record<string, number> = {};
  for (const smap of maps) {
    for (const s of smap) {
      const code = s.edgeResponseStatus;
      const key = code != null ? String(code) : "";
      by[key] = (by[key] ?? 0) + Number(s.requests ?? 0);
    }
  }
  return Object.entries(by)
    .filter(([k]) => k)
    .map(([status, requests]) => ({ status, requests }))
    .sort((a, b) => b.requests - a.requests);
}

export function parseGraphqlZoneAnalytics(
  data: Record<string, unknown>,
  zoneId: string,
  zoneName: string,
  periodDays: number,
): Record<string, unknown> {
  const viewer = (data.viewer as Record<string, unknown>) ?? {};
  const zones = viewer.zones as unknown[] | undefined;
  if (!zones?.[0] || typeof zones[0] !== "object") {
    throw new CloudflareApiError("Zone not found or no analytics access.");
  }
  const z = zones[0] as Record<string, unknown>;
  let daily = z.daily as unknown[] | undefined;
  if (!Array.isArray(daily)) daily = [];

  const series: Record<string, unknown>[] = [];
  const countryMaps: Record<string, unknown>[][] = [];
  const statusMaps: Record<string, unknown>[][] = [];

  for (const row of daily) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const dims = (r.dimensions as Record<string, unknown>) ?? {};
    const dt = String(dims.date ?? "").slice(0, 10);
    if (!dt) continue;
    const s = (r.sum as Record<string, unknown>) ?? {};
    const u = (r.uniq as Record<string, unknown>) ?? {};
    series.push({
      date: dt,
      requests: Number(s.requests ?? 0),
      cached_requests: Number(s.cachedRequests ?? 0),
      threats: Number(s.threats ?? 0),
      bandwidth: Number(s.bytes ?? 0),
      pageviews: Number(s.pageViews ?? 0),
      uniques: Number(u.uniques ?? 0),
    });
    const cm = s.countryMap as unknown[] | undefined;
    const sm = s.responseStatusMap as unknown[] | undefined;
    if (Array.isArray(cm) && cm.length) {
      countryMaps.push(
        cm.filter(
          (x): x is Record<string, unknown> =>
            Boolean(x) && typeof x === "object",
        ),
      );
    }
    if (Array.isArray(sm) && sm.length) {
      statusMaps.push(
        sm.filter(
          (x): x is Record<string, unknown> =>
            Boolean(x) && typeof x === "object",
        ),
      );
    }
  }

  const totals = {
    requests: series.reduce((a, x) => a + Number(x.requests), 0),
    cached_requests: series.reduce((a, x) => a + Number(x.cached_requests), 0),
    bandwidth_bytes: series.reduce((a, x) => a + Number(x.bandwidth), 0),
    threats: series.reduce((a, x) => a + Number(x.threats), 0),
    pageviews: series.reduce((a, x) => a + Number(x.pageviews), 0),
    uniques: series.reduce((a, x) => a + Number(x.uniques), 0),
  };

  const top_countries = countryMaps.length
    ? mergeCountries(countryMaps).slice(0, 32)
    : [];
  const status_codes = statusMaps.length
    ? mergeStatus(statusMaps).slice(0, 32)
    : [];

  return {
    zone_id: zoneId,
    zone_name: zoneName,
    period_days: periodDays,
    totals,
    series,
    top_countries,
    status_codes,
  };
}

export async function fetchZoneAnalyticsDashboard(
  token: string,
  zoneId: string,
  zoneName: string,
  days: number,
): Promise<Record<string, unknown>> {
  let d = days;
  if (d < 1) d = 1;
  if (d > 366) d = 366;
  const now = new Date();
  const endUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startUtc = new Date(endUtc);
  startUtc.setUTCDate(startUtc.getUTCDate() - d);
  const startD = startUtc.toISOString().slice(0, 10);
  const endExclusive = new Date(endUtc);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
  const endExclusiveStr = endExclusive.toISOString().slice(0, 10);

  const variables = { zoneTag: zoneId, start: startD, end: endExclusiveStr };
  const data = await cfGraphql<Record<string, unknown>>(
    token,
    ZONE_HTTP_ANALYTICS_QUERY,
    variables,
  );
  return parseGraphqlZoneAnalytics(data, zoneId, zoneName, d);
}
