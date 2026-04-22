import { decryptAtRest, encryptAtRest } from "@/server/crypto/fernet-tokens";
import {
  queryMaybeOne,
  queryRows,
} from "@/server/db/postgres";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GSC_SITES = "https://www.googleapis.com/webmasters/v3/sites";
const WEBMASTERS_READONLY =
  "https://www.googleapis.com/auth/webmasters.readonly";
const SCOPES = ["openid", "email", "profile", WEBMASTERS_READONLY].join(" ");

export function googleOAuthConfig(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    process.env.GOOGLE_REDIRECT_URL?.trim() ||
    "";
  return { clientId, clientSecret, redirectUri };
}

export function buildGscAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = googleOAuthConfig();
  if (!clientId || !redirectUri) {
    throw new Error(
      "Set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI for Search Console OAuth.",
    );
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string | null;
  expires_in?: number | null;
}> {
  const { clientId, clientSecret, redirectUri } = googleOAuthConfig();
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET must be set.");
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  return {
    access_token: String(data.access_token),
    refresh_token: (data.refresh_token as string) ?? null,
    expires_in: (data.expires_in as number) ?? null,
  };
}

export async function refreshAccessToken(refreshPlain: string): Promise<{
  access_token: string;
  expires_in?: number | null;
}> {
  const { clientId, clientSecret } = googleOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshPlain,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  const data = (await res.json()) as Record<string, unknown>;
  return {
    access_token: String(data.access_token),
    expires_in: (data.expires_in as number) ?? null,
  };
}

export async function listSites(
  accessToken: string,
): Promise<Record<string, unknown>[]> {
  const res = await fetch(GSC_SITES, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`GSC list sites failed: ${res.status}`);
  const payload = (await res.json()) as {
    siteEntry?: Record<string, unknown>[];
  };
  return payload.siteEntry ?? [];
}

function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
}

export function gscPropertyMatchesTarget(
  siteUrl: string,
  targetUrl: string,
): boolean {
  const t = new URL(
    targetUrl.startsWith("http") ? targetUrl : `https://${targetUrl}`,
  );
  const th = normalizeHost(t.hostname);
  if (!th) return false;
  const su = siteUrl.trim();
  if (su.startsWith("sc-domain:")) {
    const dom =
      su.split(":", 2)[1]?.trim().toLowerCase().replace(/\/$/, "") ?? "";
    if (th === dom) return true;
    if (th.endsWith(`.${dom}`)) return true;
    return false;
  }
  const p = new URL(su.includes("://") ? su : `https://${su}`);
  const sh = normalizeHost(p.hostname);
  return Boolean(sh && th === sh);
}

export function pickMatchingSiteUrl(
  sites: Record<string, unknown>[],
  targetUrl: string,
): string | null {
  for (const entry of sites) {
    const sUrl = String(entry.siteUrl ?? "").trim();
    if (sUrl && gscPropertyMatchesTarget(sUrl, targetUrl)) return sUrl;
  }
  return null;
}

function defaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 28);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

async function searchAnalyticsQuery(
  siteUrl: string,
  accessToken: string,
  start: string,
  end: string,
  dimensions: string[] | null,
  rowLimit?: number,
): Promise<Record<string, unknown>> {
  const encoded = encodeURIComponent(siteUrl);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`;
  const body: Record<string, unknown> = {
    startDate: start,
    endDate: end,
    dataState: "all",
  };
  if (dimensions) {
    body.dimensions = dimensions;
    body.rowLimit = rowLimit ?? 25;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`searchAnalytics ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function summarizeRows(
  rows: Record<string, unknown>[] | undefined,
): Record<string, number | null> {
  const r = rows ?? [];
  if (!r.length)
    return { clicks: null, impressions: null, ctr: null, position: null };
  let clicks = 0;
  let impr = 0;
  let posW = 0;
  for (const row of r) {
    clicks += Number(row.clicks ?? 0);
    impr += Number(row.impressions ?? 0);
    posW += Number(row.position ?? 0) * Number(row.impressions ?? 0);
  }
  return {
    clicks,
    impressions: impr,
    ctr: impr ? clicks / impr : null,
    position: impr ? posW / impr : null,
  };
}

export async function fetchGscBundleForSite(
  siteUrl: string,
  accessToken: string,
  start?: string,
  end?: string,
): Promise<Record<string, unknown>> {
  const dr = defaultDateRange();
  const startD = start ?? dr.start;
  const endD = end ?? dr.end;
  const totalPayload = await searchAnalyticsQuery(
    siteUrl,
    accessToken,
    startD,
    endD,
    null,
  );
  const summary = summarizeRows(
    totalPayload.rows as Record<string, unknown>[] | undefined,
  );
  const queriesPayload = await searchAnalyticsQuery(
    siteUrl,
    accessToken,
    startD,
    endD,
    ["query"],
    50,
  );
  const qRows = (queriesPayload.rows as Record<string, unknown>[]) ?? [];
  const top_queries = qRows.map((row) => {
    const keys = (row.keys as string[]) ?? [];
    return {
      query: keys[0] ?? "",
      clicks: Number(row.clicks ?? 0),
      impressions: Number(row.impressions ?? 0),
      ctr: Number(row.ctr ?? 0),
      position: Number(row.position ?? 0),
    };
  });
  return {
    summary,
    top_queries,
    start_date: startD,
    end_date: endD,
  };
}

export async function getValidGscAccessToken(
  userId: string,
): Promise<string | null> {
  const row = await queryMaybeOne<{
    refresh_token_encrypted: string;
    access_token: string;
    access_token_expires_at: string | null;
  }>(
    `
      select refresh_token_encrypted, access_token, access_token_expires_at
      from monix_gsc_credentials
      where user_id = $1::uuid
      limit 1
    `,
    [userId],
  );
  if (!row) return null;
  const skewMs = 120_000;
  const now = Date.now();
  if (
    row.access_token &&
    row.access_token_expires_at &&
    new Date(row.access_token_expires_at).getTime() > now + skewMs
  ) {
    return row.access_token;
  }
  let refreshPlain: string;
  try {
    refreshPlain = decryptAtRest(row.refresh_token_encrypted);
  } catch {
    return null;
  }
  try {
    const bundle = await refreshAccessToken(refreshPlain);
    const expiresAt =
      bundle.expires_in != null
        ? new Date(now + bundle.expires_in * 1000).toISOString()
        : null;
    await queryRows(
      `
        update monix_gsc_credentials
        set access_token = $2,
            access_token_expires_at = $3::timestamptz,
            updated_at = now()
        where user_id = $1::uuid
      `,
      [userId, bundle.access_token, expiresAt],
    );
    return bundle.access_token;
  } catch {
    return null;
  }
}

export async function syncTargetSearchConsole(
  userId: string,
  targetId: string,
  targetUrl: string,
): Promise<void> {
  const token = await getValidGscAccessToken(userId);
  const now = new Date().toISOString();
  if (!token) {
    await queryRows(
      `
        update monix_targets
        set gsc_property_url = '',
            gsc_analytics = null,
            gsc_synced_at = $2::timestamptz,
            gsc_sync_error = ''
        where id = $1::uuid
      `,
      [targetId, now],
    );
    return;
  }
  let sites: Record<string, unknown>[];
  try {
    sites = await listSites(token);
  } catch {
    await queryRows(
      `
        update monix_targets
        set gsc_synced_at = $2::timestamptz,
            gsc_sync_error = 'Could not list Search Console properties.'
        where id = $1::uuid
      `,
      [targetId, now],
    );
    return;
  }
  const match = pickMatchingSiteUrl(sites, targetUrl);
  if (!match) {
    await queryRows(
      `
        update monix_targets
        set gsc_property_url = '',
            gsc_analytics = null,
            gsc_synced_at = $2::timestamptz,
            gsc_sync_error = 'No verified Search Console property matches this URL''s domain.'
        where id = $1::uuid
      `,
      [targetId, now],
    );
    return;
  }
  try {
    const bundle = await fetchGscBundleForSite(match, token);
    await queryRows(
      `
        update monix_targets
        set gsc_property_url = $2,
            gsc_analytics = $3::jsonb,
            gsc_synced_at = $4::timestamptz,
            gsc_sync_error = ''
        where id = $1::uuid
      `,
      [targetId, match, JSON.stringify(bundle), now],
    );
  } catch {
    await queryRows(
      `
        update monix_targets
        set gsc_property_url = $2,
            gsc_analytics = null,
            gsc_synced_at = $3::timestamptz,
            gsc_sync_error = 'Could not fetch Search Analytics for this property.'
        where id = $1::uuid
      `,
      [targetId, match, now],
    );
  }
}

export async function saveGscTokensFromOAuth(
  userId: string,
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresIn: number | null | undefined,
): Promise<void> {
  const now = Date.now();
  const expiresAt =
    expiresIn != null ? new Date(now + expiresIn * 1000).toISOString() : null;

  let refreshEnc: string;
  if (refreshToken) {
    refreshEnc = encryptAtRest(refreshToken);
  } else {
    const existing = await queryMaybeOne<{ refresh_token_encrypted: string }>(
      `
        select refresh_token_encrypted
        from monix_gsc_credentials
        where user_id = $1::uuid
        limit 1
      `,
      [userId],
    );
    if (!existing?.refresh_token_encrypted) {
      throw new Error(
        "Google did not return a refresh token. Revoke app access in Google Account settings and connect again.",
      );
    }
    refreshEnc = existing.refresh_token_encrypted;
  }

  await queryRows(
    `
      insert into monix_gsc_credentials (
        user_id, refresh_token_encrypted, access_token,
        access_token_expires_at, updated_at
      )
      values ($1::uuid, $2, $3, $4::timestamptz, now())
      on conflict (user_id) do update
      set refresh_token_encrypted = excluded.refresh_token_encrypted,
          access_token = excluded.access_token,
          access_token_expires_at = excluded.access_token_expires_at,
          updated_at = now()
    `,
    [userId, refreshEnc, accessToken, expiresAt],
  );
}
