import { verifyAccessToken } from "@/server/auth/jwt";
import {
  ensureMonixUser,
  getMonixProfile,
  updateMonixProfile,
} from "@/server/db/monix-user";
import { queryMaybeOne, queryOne, queryRows } from "@/server/db/postgres";
import { syncTargetSearchConsole } from "@/server/integrations/gsc-api";

export async function requireUserSub(bearerJwt: string): Promise<string> {
  const payload = await verifyAccessToken(bearerJwt);
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return sub;
}

function displayHost(url: string): string {
  return url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
}

function formatScanTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function scanCountByTarget(
  targetIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of targetIds) counts.set(id, 0);
  if (!targetIds.length) return counts;
  const rows = await queryRows<{ target_id: string; total: string }>(
    `
      select target_id, count(*)::text as total
      from monix_scans
      where target_id = any($1::uuid[])
      group by target_id
    `,
    [targetIds],
  );
  for (const row of rows) {
    counts.set(row.target_id, Number(row.total));
  }
  return counts;
}

export async function listTargetsPayload(userId: string): Promise<unknown[]> {
  const rows = await queryRows<Record<string, unknown>>(
    `
      select id, url, environment, gsc_property_url, gsc_analytics,
        gsc_synced_at, gsc_sync_error, created_at
      from monix_targets
      where owner_id = $1::uuid
      order by created_at desc
    `,
    [userId],
  );
  if (!rows.length) return [];
  const ids = rows.map((t) => String(t.id));
  const counts = await scanCountByTarget(ids);

  // Fetch latest scan per target in a single query using DISTINCT ON
  const latestScans = await queryRows<Record<string, unknown>>(
    `
      select distinct on (target_id)
        target_id, score, results, created_at
      from monix_scans
      where target_id = any($1::uuid[])
      order by target_id, created_at desc
    `,
    [ids],
  );
  const latestByTarget = new Map<string, Record<string, unknown>>(
    latestScans.map((s) => [String(s.target_id), s]),
  );

  return rows.map((t) => {
    const latest = latestByTarget.get(String(t.id)) ?? null;
    const results =
      (latest?.results as Record<string, unknown> | undefined) ?? {};
    const findings = (results.findings as unknown[]) ?? [];
    const score = latest?.score != null ? Number(latest.score) : null;
    return {
      id: String(t.id),
      name: displayHost(String(t.url)),
      url: t.url,
      environment: t.environment ?? "",
      ip: null,
      location: null,
      activity: latest ? `${findings.length} findings` : null,
      status: latest
        ? score != null && score > 80
          ? "Healthy"
          : "Warning"
        : "Not scanned",
      lastScan: latest?.created_at
        ? formatScanTime(String(latest.created_at))
        : null,
      score,
      created_at: t.created_at,
      scan_count: counts.get(String(t.id)) ?? 0,
      gsc_property_url: t.gsc_property_url || null,
      gsc_analytics: t.gsc_analytics,
      gsc_synced_at: t.gsc_synced_at ?? null,
      gsc_sync_error: t.gsc_sync_error || null,
    };
  });
}

export async function getTargetDetail(
  userId: string,
  targetId: string,
): Promise<Record<string, unknown>> {
  const row = await queryMaybeOne<Record<string, unknown>>(
    `
      select id, url, environment, gsc_property_url, gsc_analytics,
        gsc_synced_at, gsc_sync_error, created_at
      from monix_targets
      where id = $1::uuid and owner_id = $2::uuid
      limit 1
    `,
    [targetId, userId],
  );
  if (!row)
    throw Object.assign(new Error("Target not found."), { status: 404 });
  const latest = await queryMaybeOne<Record<string, unknown>>(
    `
      select report_id, score, created_at
      from monix_scans
      where target_id = $1::uuid
      order by created_at desc
      limit 1
    `,
    [targetId],
  );
  const score = latest?.score != null ? Number(latest.score) : null;
  const cntMap = await scanCountByTarget([targetId]);
  return {
    id: String(row.id),
    name: displayHost(String(row.url)),
    url: row.url,
    environment: row.environment ?? "",
    status: latest
      ? score != null && score > 80
        ? "Healthy"
        : "Warning"
      : "Not scanned",
    lastScan: latest?.created_at
      ? formatScanTime(String(latest.created_at))
      : null,
    score,
    latest_report_id: latest?.report_id ? String(latest.report_id) : null,
    created_at: row.created_at,
    scan_count: cntMap.get(targetId) ?? 0,
    gsc_property_url: row.gsc_property_url || null,
    gsc_analytics: row.gsc_analytics,
    gsc_synced_at: row.gsc_synced_at ?? null,
    gsc_sync_error: row.gsc_sync_error || null,
  };
}

export async function createTargetForUser(
  userId: string,
  email: string,
  urlRaw: string,
  environment: string,
): Promise<Record<string, unknown>> {
  let url = urlRaw.trim();
  if (!url) throw Object.assign(new Error("url is required"), { status: 400 });
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid URL protocol.");
    }
  } catch {
    throw Object.assign(new Error("Invalid URL."), { status: 400 });
  }
  await ensureMonixUser(userId, email);
  const row = await queryOne<Record<string, unknown>>(
    `
      insert into monix_targets (owner_id, url, environment)
      values ($1::uuid, $2, $3)
      returning id, url, environment, gsc_property_url, gsc_analytics,
        gsc_synced_at, gsc_sync_error, created_at
    `,
    [userId, url, environment.trim()],
  );
  try {
    await syncTargetSearchConsole(userId, String(row.id), String(row.url));
  } catch (e) {
    console.error("[GSC sync] Failed to sync new target:", e);
  }
  const refreshed = await queryMaybeOne<Record<string, unknown>>(
    `
      select gsc_property_url, gsc_analytics, gsc_synced_at, gsc_sync_error
      from monix_targets
      where id = $1::uuid
      limit 1
    `,
    [String(row.id)],
  );
  return {
    id: String(row.id),
    url: row.url,
    name: displayHost(String(row.url)),
    environment: row.environment,
    gsc_property_url: refreshed?.gsc_property_url || null,
    gsc_analytics: refreshed?.gsc_analytics ?? null,
    gsc_synced_at: refreshed?.gsc_synced_at ?? null,
    gsc_sync_error: refreshed?.gsc_sync_error || null,
  };
}

export async function deleteTargetForUser(
  userId: string,
  targetId: string,
): Promise<void> {
  const row = await queryMaybeOne<{ id: string }>(
    `
      delete from monix_targets
      where id = $1::uuid and owner_id = $2::uuid
      returning id
    `,
    [targetId, userId],
  );
  if (!row) {
    throw Object.assign(new Error("Target not found."), { status: 404 });
  }
}

function formatScanRow(
  s: Record<string, unknown>,
  idToUrl: Map<string, string>,
): Record<string, unknown> {
  const tid = s.target_id ? String(s.target_id) : null;
  const url = String(s.url);
  const targetName = tid
    ? displayHost(idToUrl.get(tid) ?? url)
    : displayHost(url);
  return {
    id: String(s.report_id),
    report_id: String(s.report_id),
    url,
    score: Number(s.score),
    created_at: s.created_at,
    target_id: tid,
    target_name: targetName,
  };
}

export async function listScansForUser(userId: string): Promise<unknown[]> {
  const targets = await queryRows<{ id: string; url: string }>(
    `
      select id, url
      from monix_targets
      where owner_id = $1::uuid
    `,
    [userId],
  );
  if (!targets.length) return [];
  const targetIds = targets.map((x) => x.id);
  const idToUrl = new Map(targets.map((t) => [t.id, t.url]));
  const ownedUrls = targets.map((t) => t.url);
  const byTarget = await queryRows<Record<string, unknown>>(
    `
      select report_id, url, score, created_at, target_id
      from monix_scans
      where target_id = any($1::uuid[])
      order by created_at desc
      limit 100
    `,
    [targetIds],
  );
  const orphans = await queryRows<Record<string, unknown>>(
    `
      select report_id, url, score, created_at, target_id
      from monix_scans
      where target_id is null and url = any($1::text[])
      order by created_at desc
      limit 100
    `,
    [ownedUrls],
  );
  const merged = [...byTarget, ...orphans];
  merged.sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() -
      new Date(String(a.created_at)).getTime(),
  );
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const s of merged) {
    const id = String(s.report_id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(formatScanRow(s, idToUrl));
    if (out.length >= 100) break;
  }
  return out;
}

export async function scanLocationsForUser(userId: string): Promise<unknown[]> {
  const targets = await queryRows<{ id: string; url: string }>(
    `
      select id, url
      from monix_targets
      where owner_id = $1::uuid
    `,
    [userId],
  );
  if (!targets.length) return [];
  const targetIds = targets.map((x) => x.id);
  const ownedUrls = targets.map((t) => t.url);
  const rows = [
    ...(await queryRows<Record<string, unknown>>(
      `
        select report_id, url, score, results, target_id, created_at
        from monix_scans
        where target_id = any($1::uuid[])
        order by created_at desc
        limit 200
      `,
      [targetIds],
    )),
    ...(await queryRows<Record<string, unknown>>(
      `
        select report_id, url, score, results, target_id, created_at
        from monix_scans
        where target_id is null and url = any($1::text[])
        order by created_at desc
        limit 200
      `,
      [ownedUrls],
    )),
  ];
  rows.sort(
    (x, y) =>
      new Date(String(y.created_at)).getTime() -
      new Date(String(x.created_at)).getTime(),
  );
  const out: unknown[] = [];
  const seen = new Set<string>();
  for (const s of rows.slice(0, 200)) {
    const results = (s.results as Record<string, unknown> | undefined) ?? {};
    const loc =
      (results.server_location as Record<string, unknown> | undefined) ?? {};
    const coords =
      (loc.coordinates as Record<string, unknown> | undefined) ?? {};
    const lat = coords.latitude;
    const lng = coords.longitude;
    if (lat == null || lng == null) continue;
    const key = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      url: String(s.url),
      lat: Number(lat),
      lng: Number(lng),
      city: String(loc.city ?? ""),
      country: String(loc.country ?? ""),
      org: String(loc.org ?? ""),
      score: Number(s.score),
    });
  }
  return out;
}

export async function getReportEnvelopePublic(
  reportId: string,
): Promise<Record<string, unknown>> {
  const row = await queryMaybeOne<{
    report_id: string;
    url: string;
    score: number;
    results: unknown;
    created_at: string;
    expires_at: string;
    is_expired: boolean;
  }>(
    `
      select report_id, url, score, results, created_at, expires_at, is_expired
      from monix_scans
      where report_id = $1::uuid
      limit 1
    `,
    [reportId],
  );
  if (!row)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  const expired =
    row.is_expired || new Date(row.expires_at).getTime() <= Date.now();
  if (expired)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  return {
    report_id: row.report_id,
    url: row.url,
    score: row.score,
    created_at: row.created_at,
    expires_at: row.expires_at,
    results: row.results,
  };
}

export async function getReportEnvelopeForUser(
  reportId: string,
  userId: string,
): Promise<Record<string, unknown>> {
  const row = await queryMaybeOne<{
    target_id: string | null;
    url: string;
    expires_at: string;
    is_expired: boolean;
  }>(
    `
      select target_id, url, expires_at, is_expired
      from monix_scans
      where report_id = $1::uuid
      limit 1
    `,
    [reportId],
  );
  if (!row)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  const expired =
    row.is_expired || new Date(row.expires_at).getTime() <= Date.now();
  if (expired)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  if (row.target_id) {
    const own = await queryMaybeOne<{ id: string }>(
      `
        select id
        from monix_targets
        where id = $1::uuid and owner_id = $2::uuid
        limit 1
      `,
      [row.target_id, userId],
    );
    if (!own) throw Object.assign(new Error("Forbidden"), { status: 403 });
  } else {
    const targets = await queryRows<{ url: string }>(
      `
        select url
        from monix_targets
        where owner_id = $1::uuid
      `,
      [userId],
    );
    const urls = new Set(targets.map((t) => t.url));
    if (!urls.has(row.url)) {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }
  }
  return getReportEnvelopePublic(reportId);
}

export async function buildMeResponse(
  userId: string,
  email: string,
): Promise<Record<string, unknown>> {
  await ensureMonixUser(userId, email);
  const profile = await getMonixProfile(userId);
  const first = profile?.first_name ?? "";
  const last = profile?.last_name ?? "";
  const primaryEmail = profile?.email ?? email;
  const display = `${first} ${last}`.trim() || primaryEmail || userId;
  const initials = (primaryEmail || "U").slice(0, 2).toUpperCase();
  return {
    email: primaryEmail,
    name: display,
    first_name: first,
    last_name: last,
    initials,
    avatar_url: profile?.avatar_url || null,
  };
}

export async function patchProfileFromBody(
  userId: string,
  email: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await ensureMonixUser(userId, email);
  const patch: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  } = {};
  if (typeof body.first_name === "string") {
    patch.first_name = body.first_name.trim();
  }
  if (typeof body.last_name === "string") {
    patch.last_name = body.last_name.trim();
  }
  if (typeof body.avatar_url === "string") {
    patch.avatar_url = body.avatar_url.trim();
  }
  if (Object.keys(patch).length) {
    await updateMonixProfile(userId, patch);
  }
  const profile = await getMonixProfile(userId);
  const first = profile?.first_name ?? "";
  const last = profile?.last_name ?? "";
  const display = `${first} ${last}`.trim() || profile?.email || email;
  const initials = (profile?.email ?? email ?? "U").slice(0, 2).toUpperCase();
  return {
    ok: true,
    name: display,
    initials,
    avatar_url: profile?.avatar_url || null,
  };
}

export async function deleteUserData(userId: string): Promise<void> {
  await queryRows("delete from monix_users where id = $1::uuid", [userId]);
}
