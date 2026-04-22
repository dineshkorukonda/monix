import { type NextRequest, NextResponse } from "next/server";
import { runFullUrlAnalysis } from "@/server/analysis/analyze-url-engine";
import { requireMonixAuth } from "@/server/auth/policy";
import { requireUserSub } from "@/server/db/monix-data";
import { queryMaybeOne } from "@/server/db/postgres";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 },
      );
    }
    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { error: "Missing 'url' in request body" },
        { status: 400 },
      );
    }
    let targetId: string | null = null;
    const tidRaw = body.target_id;
    if (tidRaw != null && String(tidRaw).trim()) {
      const tid = String(tidRaw).trim();
      const row = await queryMaybeOne<{ id: string }>(
        `
          select id
          from monix_targets
          where id = $1::uuid and owner_id = $2::uuid
          limit 1
        `,
        [tid, sub],
      );
      if (!row) {
        return NextResponse.json(
          { error: "Target not found." },
          { status: 404 },
        );
      }
      targetId = tid;
    }
    const fullScan =
      request.nextUrl.searchParams.get("full")?.toLowerCase() === "true";
    const includePortScan = Boolean(body.include_port_scan ?? fullScan);
    const includeMetadata = Boolean(body.include_metadata ?? fullScan);
    let includePerformance = Boolean(body.include_performance ?? false);
    if (fullScan) includePerformance = true;
    const result = await runFullUrlAnalysis({
      url,
      fullScan,
      includePortScan,
      includeMetadata,
      includePerformance,
      targetId,
      persist: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
