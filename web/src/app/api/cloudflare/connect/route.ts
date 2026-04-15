import { NextRequest, NextResponse } from "next/server";
import { requireBearerToken } from "@/server/auth/policy";
import { buildIntegrationServices } from "@/server/bootstrap/integrations";
import { asJson } from "@/server/transport/dto";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    const token = requireBearerToken(request);
    const body = await request.json();
    const payload = await buildIntegrationServices().cloudflare.connect(token, {
      api_token: String(body?.api_token || "").trim(),
    });
    return NextResponse.json(asJson(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}
