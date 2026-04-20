import { verifySupabaseAccessToken } from "@/server/auth/supabase-jwt";
import {
  ensureMonixUser,
  getMonixProfile,
  updateMonixProfile,
} from "@/server/db/monix-user";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { syncTargetSearchConsole } from "@/server/integrations/gsc-api";

export async function requireUserSub(bearerJwt: string): Promise<string> {
  const payload = await verifySupabaseAccessToken(bearerJwt);
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
  db: ReturnType<typeof getSupabaseAdmin>,
  targetIds: string[],
): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  for (const id of targetIds) m.set(id, 0);
  if (!targetIds.length) return m;
  const { data, error } = await db
    .from("monix_scans")
    .select("target_id")
    .in("target_id", targetIds);
  if (error || !data) return m;
  for (const row of data as { target_id: string }[]) {
    const tid = row.target_id;
    m.set(tid, (m.get(tid) ?? 0) + 1);
  }
  return m;
}

export async function listTargetsPayload(userId: string): Promise<unknown[]> {
  const db = getSupabaseAdmin();
  const { data: targets, error } = await db
    .from("monix_targets")
    .select(
      "id, url, environment, gsc_property_url, gsc_analytics, gsc_synced_at, gsc_sync_error, created_at",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (targets ?? []) as Record<string, unknown>[];
  const ids = rows.map((t) => String(t.id));
  const counts = await scanCountByTarget(db, ids);
  const out: unknown[] = [];
  for (const t of rows) {
    const tid = String(t.id);
    const { data: scans } = await db
      .from("monix_scans")
      .select("score, results, created_at")
      .eq("target_id", tid)
      .order("created_at", { ascending: false })
      .limit(1);
    const latest = scans?.[0] as Record<string, unknown> | undefined;
    const results =
      (latest?.results as Record<string, unknown> | undefined) ?? {};
    const findings = (results.findings as unknown[]) ?? [];
    const score = latest?.score != null ? Number(latest.score) : null;
    out.push({
      id: tid,
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
      scan_count: counts.get(tid) ?? 0,
      gsc_property_url: t.gsc_property_url || null,
      gsc_analytics: t.gsc_analytics,
      gsc_synced_at: t.gsc_synced_at ?? null,
      gsc_sync_error: t.gsc_sync_error || null,
    });
  }
  return out;
}

export async function getTargetDetail(
  userId: string,
  targetId: string,
): Promise<Record<string, unknown>> {
  const db = getSupabaseAdmin();
  const { data: t, error } = await db
    .from("monix_targets")
    .select(
      "id, url, environment, gsc_property_url, gsc_analytics, gsc_synced_at, gsc_sync_error, created_at",
    )
    .eq("id", targetId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!t) throw Object.assign(new Error("Target not found."), { status: 404 });
  const row = t as Record<string, unknown>;
  const { data: scans } = await db
    .from("monix_scans")
    .select("report_id, score, created_at")
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = scans?.[0] as Record<string, unknown> | undefined;
  const score = latest?.score != null ? Number(latest.score) : null;
  const cntMap = await scanCountByTarget(db, [targetId]);
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
  if (!url.startsWith("http://") && !url.startsWith("https://"))
    url = `https://${url}`;
  await ensureMonixUser(userId, email);
  const db = getSupabaseAdmin();
  const { data: created, error } = await db
    .from("monix_targets")
    .insert({ owner_id: userId, url, environment: environment.trim() })
    .select(
      "id, url, environment, gsc_property_url, gsc_analytics, gsc_synced_at, gsc_sync_error, created_at",
    )
    .single();
  if (error) throw new Error(error.message);
  const row = created as Record<string, unknown>;
  try {
    await syncTargetSearchConsole(userId, String(row.id), String(row.url));
  } catch {
    /* ignore */
  }
  const { data: refreshed } = await db
    .from("monix_targets")
    .select("gsc_property_url, gsc_analytics, gsc_synced_at, gsc_sync_error")
    .eq("id", row.id)
    .single();
  const r = refreshed as Record<string, unknown> | null;
  return {
    id: String(row.id),
    url: row.url,
    name: displayHost(String(row.url)),
    environment: row.environment,
    gsc_property_url: r?.gsc_property_url || null,
    gsc_analytics: r?.gsc_analytics ?? null,
    gsc_synced_at: r?.gsc_synced_at ?? null,
    gsc_sync_error: r?.gsc_sync_error || null,
  };
}

export async function deleteTargetForUser(
  userId: string,
  targetId: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error, count } = await db
    .from("monix_targets")
    .delete({ count: "exact" })
    .eq("id", targetId)
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
  if (!count)
    throw Object.assign(new Error("Target not found."), { status: 404 });
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
  const db = getSupabaseAdmin();
  const { data: targets } = await db
    .from("monix_targets")
    .select("id, url")
    .eq("owner_id", userId);
  const tlist = (targets ?? []) as { id: string; url: string }[];
  if (!tlist.length) return [];
  const targetIds = tlist.map((x) => x.id);
  const idToUrl = new Map(tlist.map((t) => [t.id, t.url]));
  const ownedUrls = tlist.map((t) => t.url);

  const { data: byTarget } = await db
    .from("monix_scans")
    .select("report_id, url, score, created_at, target_id")
    .in("target_id", targetIds)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: orphans } = await db
    .from("monix_scans")
    .select("report_id, url, score, created_at, target_id")
    .is("target_id", null)
    .in("url", ownedUrls)
    .order("created_at", { ascending: false })
    .limit(100);

  const merged = [...(byTarget ?? []), ...(orphans ?? [])] as Record<
    string,
    unknown
  >[];
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
  const db = getSupabaseAdmin();
  const { data: targets } = await db
    .from("monix_targets")
    .select("id, url")
    .eq("owner_id", userId);
  const tlist = (targets ?? []) as { id: string; url: string }[];
  if (!tlist.length) return [];
  const targetIds = tlist.map((x) => x.id);
  const ownedUrls = tlist.map((t) => t.url);

  const a = await db
    .from("monix_scans")
    .select("report_id, url, score, results, target_id, created_at")
    .in("target_id", targetIds)
    .order("created_at", { ascending: false })
    .limit(200);
  const b = await db
    .from("monix_scans")
    .select("report_id, url, score, results, target_id, created_at")
    .is("target_id", null)
    .in("url", ownedUrls)
    .order("created_at", { ascending: false })
    .limit(200);
  const rows = [...(a.data ?? []), ...(b.data ?? [])] as Record<
    string,
    unknown
  >[];
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
  const db = getSupabaseAdmin();
  const { data: scan, error } = await db
    .from("monix_scans")
    .select(
      "report_id, url, score, results, created_at, expires_at, is_expired",
    )
    .eq("report_id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!scan)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  const row = scan as {
    is_expired: boolean;
    expires_at: string;
    report_id: string;
    url: string;
    score: number;
    created_at: string;
    results: unknown;
  };
  const expired =
    row.is_expired || new Date(row.expires_at).getTime() <= Date.now();
  if (expired)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  return {
    report_id: String(row.report_id),
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
  const db = getSupabaseAdmin();
  const { data: scan, error } = await db
    .from("monix_scans")
    .select(
      "report_id, url, score, results, created_at, expires_at, is_expired, target_id",
    )
    .eq("report_id", reportId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!scan)
    throw Object.assign(new Error("Report not found."), { status: 404 });
  const row = scan as {
    is_expired: boolean;
    expires_at: string;
    target_id: string | null;
    url: string;
  };
  const expired =
    row.is_expired || new Date(row.expires_at).getTime() <= Date.now();
  if (expired)
    throw Object.assign(new Error("Report not found."), { status: 404 });

  if (row.target_id) {
    const { data: own } = await db
      .from("monix_targets")
      .select("id")
      .eq("id", row.target_id)
      .eq("owner_id", userId)
      .maybeSingle();
    if (!own) throw Object.assign(new Error("Forbidden"), { status: 403 });
  } else {
    const { data: targets } = await db
      .from("monix_targets")
      .select("url")
      .eq("owner_id", userId);
    const urls = new Set((targets ?? []).map((t: { url: string }) => t.url));
    if (!urls.has(row.url))
      throw Object.assign(new Error("Forbidden"), { status: 403 });
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
  const display = `${first} ${last}`.trim() || email || userId;
  const initials = (email || "U").slice(0, 2).toUpperCase();
  return {
    email: profile?.email ?? email,
    name: display,
    first_name: first,
    last_name: last,
    initials,
  };
}

export async function patchProfileFromBody(
  userId: string,
  email: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  await ensureMonixUser(userId, email);
  const patch: { first_name?: string; last_name?: string } = {};
  if (typeof body.first_name === "string")
    patch.first_name = body.first_name.trim();
  if (typeof body.last_name === "string")
    patch.last_name = body.last_name.trim();
  if (Object.keys(patch).length) await updateMonixProfile(userId, patch);
  const profile = await getMonixProfile(userId);
  const first = profile?.first_name ?? "";
  const last = profile?.last_name ?? "";
  const display = `${first} ${last}`.trim() || profile?.email || email;
  const initials = (profile?.email ?? email ?? "U").slice(0, 2).toUpperCase();
  return { ok: true, name: display, initials };
}

export async function deleteUserData(userId: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("monix_users").delete().eq("id", userId);
}
