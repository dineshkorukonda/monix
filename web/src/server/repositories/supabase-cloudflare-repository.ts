import { verifySupabaseAccessToken } from "@/server/auth/supabase-jwt";
import { decryptAtRest, encryptAtRest } from "@/server/crypto/fernet-tokens";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import type { CloudflareRepository } from "@/server/domain/integrations";
import {
  CloudflareApiError,
  fetchZoneAnalyticsDashboard,
  getZone,
  listZonesAll,
  summarizeForConnect,
  zonesToApiRows,
} from "@/server/integrations/cloudflare-api";

async function requireSub(bearerJwt: string): Promise<string> {
  const payload = await verifySupabaseAccessToken(bearerJwt);
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Unauthorized");
  return sub;
}

async function decryptStoredToken(userId: string): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from("monix_cloudflare_credentials")
    .select("api_token_encrypted")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.api_token_encrypted) return null;
  try {
    return decryptAtRest(data.api_token_encrypted as string);
  } catch {
    return null;
  }
}

export class SupabaseCloudflareRepository implements CloudflareRepository {
  async status(bearerJwt: string): Promise<{
    connected: boolean;
    account_name?: string;
    account_id?: string;
    zones_count?: number;
  }> {
    const sub = await requireSub(bearerJwt);
    const { data } = await getSupabaseAdmin()
      .from("monix_cloudflare_credentials")
      .select("account_name, account_id, zones_count")
      .eq("user_id", sub)
      .maybeSingle();
    if (!data) return { connected: false };
    return {
      connected: true,
      account_name: (data.account_name as string) || "Cloudflare",
      account_id: (data.account_id as string) || undefined,
      zones_count: Number(data.zones_count ?? 0),
    };
  }

  async connect(
    bearerJwt: string,
    payload: { api_token: string },
  ): Promise<{ success: boolean; account_name: string; zones_count: number }> {
    const sub = await requireSub(bearerJwt);
    const token = (payload.api_token ?? "").trim();
    if (!token) {
      throw Object.assign(new Error("api_token is required."), { status: 400 });
    }
    let summary: {
      account_id: string;
      account_name: string;
      zones_count: number;
    };
    try {
      summary = await summarizeForConnect(token);
    } catch (e) {
      if (e instanceof CloudflareApiError) {
        throw Object.assign(new Error(e.message), { status: 400 });
      }
      throw Object.assign(new Error("Could not verify Cloudflare token."), {
        status: 502,
      });
    }
    const enc = encryptAtRest(token);
    await getSupabaseAdmin()
      .from("monix_cloudflare_credentials")
      .upsert(
        {
          user_id: sub,
          api_token_encrypted: enc,
          account_id: summary.account_id.slice(0, 64),
          account_name: summary.account_name.slice(0, 255),
          zones_count: summary.zones_count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    return {
      success: true,
      account_name: summary.account_name,
      zones_count: summary.zones_count,
    };
  }

  async disconnect(bearerJwt: string): Promise<{ ok: boolean }> {
    const sub = await requireSub(bearerJwt);
    await getSupabaseAdmin()
      .from("monix_cloudflare_credentials")
      .delete()
      .eq("user_id", sub);
    return { ok: true };
  }

  async zones(
    bearerJwt: string,
  ): Promise<
    Array<{ id: string; name: string; status: string; plan_name: string }>
  > {
    const sub = await requireSub(bearerJwt);
    const plain = await decryptStoredToken(sub);
    if (!plain) {
      throw Object.assign(new Error("Cloudflare is not connected."), {
        status: 400,
      });
    }
    try {
      const zones = await listZonesAll(plain);
      const rows = zonesToApiRows(zones);
      await getSupabaseAdmin()
        .from("monix_cloudflare_credentials")
        .update({
          zones_count: rows.length,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", sub);
      return rows;
    } catch (e) {
      if (e instanceof CloudflareApiError) {
        throw Object.assign(new Error(e.message), { status: 502 });
      }
      throw e;
    }
  }

  async analytics(
    bearerJwt: string,
    zoneId: string,
    days: number,
  ): Promise<unknown> {
    const sub = await requireSub(bearerJwt);
    const zid = zoneId.trim();
    if (!zid) {
      throw Object.assign(new Error("zone_id is required."), { status: 400 });
    }
    const plain = await decryptStoredToken(sub);
    if (!plain) {
      throw Object.assign(new Error("Cloudflare is not connected."), {
        status: 400,
      });
    }
    try {
      const z = await getZone(plain, zid);
      const zoneName = String(z.name ?? "");
      return await fetchZoneAnalyticsDashboard(plain, zid, zoneName, days);
    } catch (e) {
      if (e instanceof CloudflareApiError) {
        const status = e.message.includes("not found") ? 400 : 502;
        throw Object.assign(new Error(e.message), { status });
      }
      throw e;
    }
  }
}
