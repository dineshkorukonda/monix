import { type NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/server/auth/policy";
import { buildIntegrationServices } from "@/server/bootstrap/integrations";
import { asJson } from "@/server/transport/dto";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const { token, sub } = await requireSupabaseAuth(request);
    const payload =
      await buildIntegrationServices().gsc.getConnectAuthorizationUrl({
        bearerToken: token,
        userId: sub,
      });
    return NextResponse.json(asJson(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}
