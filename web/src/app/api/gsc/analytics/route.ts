import { NextRequest, NextResponse } from "next/server";
import { requireBearerToken } from "@/server/auth/policy";
import { buildIntegrationServices } from "@/server/bootstrap/integrations";
import { asJson } from "@/server/transport/dto";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    const token = requireBearerToken(request);
    const body = await request.json();
    const payload = await buildIntegrationServices().gsc.getAnalytics(token, {
      site_url: String(body?.site_url || "").trim(),
      ...(body?.start_date ? { start_date: String(body.start_date) } : {}),
      ...(body?.end_date ? { end_date: String(body.end_date) } : {}),
    });
    return NextResponse.json(asJson(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}
