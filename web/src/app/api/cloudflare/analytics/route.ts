import { type NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/server/auth/policy";
import { buildIntegrationServices } from "@/server/bootstrap/integrations";
import { asJson } from "@/server/transport/dto";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const { token } = await requireSupabaseAuth(request);
    const zoneId = String(
      request.nextUrl.searchParams.get("zone_id") || "",
    ).trim();
    if (!zoneId) {
      return NextResponse.json(
        { error: "zone_id is required." },
        { status: 400 },
      );
    }
    const daysRaw = request.nextUrl.searchParams.get("days") || "7";
    const days = Number(daysRaw);
    if (!Number.isInteger(days) || days <= 0) {
      return NextResponse.json(
        { error: "days must be a positive integer." },
        { status: 400 },
      );
    }
    const payload = await buildIntegrationServices().cloudflare.getAnalytics(
      token,
      zoneId,
      days,
    );
    return NextResponse.json(asJson(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}
