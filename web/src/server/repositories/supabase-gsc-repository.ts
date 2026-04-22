import { NextResponse } from "next/server";
import {
  signGscOAuthState,
  verifyGscOAuthState,
} from "@/server/auth/gsc-oauth-state";
import { verifyAccessToken } from "@/server/auth/jwt";
import { ensureMonixUser, getMonixUserById } from "@/server/db/monix-user";
import { queryMaybeOne, queryRows } from "@/server/db/postgres";
import type {
  GscAnalyticsRequest,
  GscConnectContext,
  GscRepository,
} from "@/server/domain/integrations";
import {
  buildGscAuthorizationUrl,
  exchangeCodeForTokens,
  fetchGscBundleForSite,
  getValidGscAccessToken,
  listSites,
  saveGscTokensFromOAuth,
  syncTargetSearchConsole,
} from "@/server/integrations/gsc-api";

function gscSuccessRedirect(): string {
  const explicit = process.env.GSC_OAUTH_SUCCESS_URL?.trim();
  if (explicit) return explicit;
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/dashboard/integrations?gsc=connected`;
}

function gscErrorRedirect(): string {
  if (process.env.GSC_OAUTH_ERROR_URL?.trim())
    return process.env.GSC_OAUTH_ERROR_URL.trim();
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.FRONTEND_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${base}/dashboard/integrations?gsc=error`;
}

async function requireSubFromBearer(bearerJwt: string): Promise<string> {
  const payload = await verifyAccessToken(bearerJwt);
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Unauthorized");
  return sub;
}

export class SupabaseGscRepository implements GscRepository {
  async connectUrl(
    ctx: GscConnectContext,
  ): Promise<{ authorization_url: string }> {
    const state = await signGscOAuthState(ctx.userId);
    return { authorization_url: buildGscAuthorizationUrl(state) };
  }

  async callback(query: string): Promise<Response> {
    const errBase = gscErrorRedirect();
    const okUrl = gscSuccessRedirect();
    const appendReason = (base: string, reason: string) =>
      `${base}${base.includes("?") ? "&" : "?"}reason=${encodeURIComponent(reason)}`;

    const params = new URLSearchParams(query);
    const err = params.get("error");
    if (err) return NextResponse.redirect(appendReason(errBase, err));
    const code = params.get("code");
    const state = params.get("state");
    if (!code || !state) {
      return NextResponse.redirect(appendReason(errBase, "invalid_callback"));
    }
    let userId: string;
    try {
      userId = await verifyGscOAuthState(state);
    } catch {
      return NextResponse.redirect(appendReason(errBase, "invalid_callback"));
    }
    try {
      const bundle = await exchangeCodeForTokens(code);
      const user = await getMonixUserById(userId);
      await ensureMonixUser(userId, user?.email ?? "");
      await saveGscTokensFromOAuth(
        userId,
        bundle.access_token,
        bundle.refresh_token,
        bundle.expires_in ?? null,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("refresh token")) {
        return NextResponse.redirect(appendReason(errBase, "no_refresh_token"));
      }
      return NextResponse.redirect(appendReason(errBase, "token_exchange"));
    }
    return NextResponse.redirect(okUrl);
  }

  async status(bearerJwt: string): Promise<{ connected: boolean }> {
    const sub = await requireSubFromBearer(bearerJwt);
    const row = await queryMaybeOne<{ user_id: string }>(
      `
        select user_id
        from monix_gsc_credentials
        where user_id = $1::uuid
        limit 1
      `,
      [sub],
    );
    return { connected: Boolean(row) };
  }

  async sites(bearerJwt: string): Promise<{ sites: unknown[] }> {
    const sub = await requireSubFromBearer(bearerJwt);
    const access = await getValidGscAccessToken(sub);
    if (!access) {
      throw Object.assign(
        new Error("Google Search Console is not connected."),
        { status: 400 },
      );
    }
    return { sites: await listSites(access) };
  }

  async analytics(
    bearerJwt: string,
    body: GscAnalyticsRequest,
  ): Promise<unknown> {
    const sub = await requireSubFromBearer(bearerJwt);
    const siteUrl = (body.site_url ?? "").trim();
    if (!siteUrl) {
      throw Object.assign(new Error("site_url is required."), { status: 400 });
    }
    const access = await getValidGscAccessToken(sub);
    if (!access) {
      throw Object.assign(
        new Error("Google Search Console is not connected."),
        { status: 400 },
      );
    }
    let start: string | undefined;
    let end: string | undefined;
    if (body.start_date) {
      const s = String(body.start_date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        throw Object.assign(new Error("Invalid start_date."), { status: 400 });
      }
      start = s;
    }
    if (body.end_date) {
      const e = String(body.end_date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e)) {
        throw Object.assign(new Error("Invalid end_date."), { status: 400 });
      }
      end = e;
    }
    const siteList = await listSites(access);
    const allowed = new Set(
      siteList.map((s) => String((s as { siteUrl?: string }).siteUrl ?? "")),
    );
    if (!allowed.has(siteUrl)) {
      throw Object.assign(
        new Error(
          "site_url is not in your verified Search Console properties.",
        ),
        { status: 403 },
      );
    }
    return fetchGscBundleForSite(siteUrl, access, start, end);
  }

  async disconnect(bearerJwt: string): Promise<{ ok: boolean }> {
    const sub = await requireSubFromBearer(bearerJwt);
    await queryRows(
      "delete from monix_gsc_credentials where user_id = $1::uuid",
      [sub],
    );
    return { ok: true };
  }

  async syncTargets(
    bearerJwt: string,
  ): Promise<{ ok: boolean; targets: number; errors: number }> {
    const sub = await requireSubFromBearer(bearerJwt);
    const row = await queryMaybeOne<{ user_id: string }>(
      `
        select user_id
        from monix_gsc_credentials
        where user_id = $1::uuid
        limit 1
      `,
      [sub],
    );
    if (!row) {
      throw Object.assign(
        new Error("Google Search Console is not connected."),
        { status: 400 },
      );
    }
    const targets = await queryRows<{ id: string; url: string }>(
      `
        select id, url
        from monix_targets
        where owner_id = $1::uuid
        order by created_at desc
      `,
      [sub],
    );
    let errors = 0;
    for (const target of targets) {
      try {
        await syncTargetSearchConsole(sub, target.id, target.url);
      } catch {
        errors += 1;
      }
    }
    return { ok: true, targets: targets.length, errors };
  }
}
