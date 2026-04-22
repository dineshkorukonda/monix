import { type NextRequest, NextResponse } from "next/server";
import { requireMonixAuth } from "@/server/auth/policy";
import { emailFromBearer } from "@/server/db/monix-auth-email";
import {
  createTargetForUser,
  listTargetsPayload,
  requireUserSub,
} from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const data = await listTargetsPayload(sub);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const email = await emailFromBearer(token);
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
    const environment = String(body.environment ?? "").trim();
    const created = await createTargetForUser(sub, email, url, environment);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
