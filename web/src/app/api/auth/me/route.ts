import { type NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/server/auth/policy";
import { emailFromBearer } from "@/server/db/monix-auth-email";
import { buildMeResponse, requireUserSub } from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const { token } = await requireSupabaseAuth(request);
    const sub = await requireUserSub(token);
    const email = await emailFromBearer(token);
    const payload = await buildMeResponse(sub, email);
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
