import { verifyAccessToken } from "@/server/auth/jwt";
import { decryptAtRest, encryptAtRest } from "@/server/crypto/fernet-tokens";
import {
  queryMaybeOne,
  queryRows,
} from "@/server/db/postgres";
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
  const payload = await verifyAccessToken(bearerJwt);
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("Unauthorized");
  return sub;
}

async function decryptStoredToken(userId: string): Promise<string | null> {
  const row = await queryMaybeOne<{ api_token_encrypted: string }>(
    `
      select api_token_encrypted
      from monix_cloudflare_credentials
      where user_id = $1::uuid
      limit 1
    `,
    [userId],
  );
  if (!row?.api_token_encrypted) return null;
  try {
    return decryptAtRest(row.api_token_encrypted);
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
    const row = await queryMaybeOne<{
      account_name: string;
      account_id: string;
      zones_count: number;
    }>(
      `
        select account_name, account_id, zones_count
        from monix_cloudflare_credentials
        where user_id = $1::uuid
        limit 1
      `,
      [sub],
    );
    if (!row) return { connected: false };
    return {
      connected: true,
      account_name: row.account_name || "Cloudflare",
      account_id: row.account_id || undefined,
      zones_count: Number(row.zones_count ?? 0),
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
    await queryRows(
      `
        insert into monix_cloudflare_credentials (
          user_id, api_token_encrypted, account_id, account_name,
          zones_count, updated_at
        )
        values ($1::uuid, $2, $3, $4, $5, now())
        on conflict (user_id) do update
        set api_token_encrypted = excluded.api_token_encrypted,
            account_id = excluded.account_id,
            account_name = excluded.account_name,
            zones_count = excluded.zones_count,
            updated_at = now()
      `,
      [
        sub,
        enc,
        summary.account_id.slice(0, 64),
        summary.account_name.slice(0, 255),
        summary.zones_count,
      ],
    );
    return {
      success: true,
      account_name: summary.account_name,
      zones_count: summary.zones_count,
    };
  }

  async disconnect(bearerJwt: string): Promise<{ ok: boolean }> {
    const sub = await requireSub(bearerJwt);
    await queryRows(
      "delete from monix_cloudflare_credentials where user_id = $1::uuid",
      [sub],
    );
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
      await queryRows(
        `
          update monix_cloudflare_credentials
          set zones_count = $2, updated_at = now()
          where user_id = $1::uuid
        `,
        [sub, rows.length],
      );
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
      const zone = await getZone(plain, zid);
      return await fetchZoneAnalyticsDashboard(
        plain,
        zid,
        String(zone.name ?? ""),
        days,
      );
    } catch (e) {
      if (e instanceof CloudflareApiError) {
        const status = e.message.includes("not found") ? 400 : 502;
        throw Object.assign(new Error(e.message), { status });
      }
      throw e;
    }
  }
}
