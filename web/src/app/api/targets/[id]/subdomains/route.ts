import { type NextRequest, NextResponse } from "next/server";
import { requireMonixAuth, requireUserSub } from "@/server/auth/policy";
import { queryRows } from "@/server/db/postgres";
import { enumerateSubdomainsForTarget } from "@/server/subdomains/subdomain-enumerator";
import { handleRouteError } from "@/server/transport/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const { id } = await ctx.params;

    const target = await queryRows<{
      id: string;
      url: string;
    }>(
      `select id, url from public.monix_targets where id = $1::uuid and owner_id = $2::uuid limit 1`,
      [id, sub],
    );

    if (!target || target.length === 0) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const subdomains = await queryRows<{
      id: string;
      subdomain: string;
      ip_addresses: string[];
      http_status: number | null;
      is_live: boolean;
      discovered_at: string;
      last_probed_at: string;
    }>(
      `select id, subdomain, ip_addresses, http_status, is_live, discovered_at, last_probed_at
       from public.subdomains
       where target_id = $1::uuid
       order by is_live desc, subdomain asc`,
      [id],
    );

    return NextResponse.json({ subdomains });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const { id } = await ctx.params;

    const target = await queryRows<{
      id: string;
      url: string;
    }>(
      `select id, url from public.monix_targets where id = $1::uuid and owner_id = $2::uuid limit 1`,
      [id, sub],
    );

    if (!target || target.length === 0) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const results = await enumerateSubdomainsForTarget(
      target[0].id,
      target[0].url,
    );

    return NextResponse.json({
      ok: true,
      count: results.length,
      subdomains: results,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
