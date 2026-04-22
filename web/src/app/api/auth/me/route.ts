import { type NextRequest, NextResponse } from "next/server";
import { requireMonixAuth } from "@/server/auth/policy";
import {
  buildMeResponse,
  patchProfileFromBody,
  requireUserSub,
} from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const { token, email } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const payload = await buildMeResponse(sub, email);
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { token, email } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const body = (await request.json()) as Record<string, unknown>;
    const payload = await patchProfileFromBody(sub, email, body);
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
