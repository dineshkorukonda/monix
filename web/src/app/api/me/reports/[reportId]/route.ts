import { type NextRequest, NextResponse } from "next/server";
import { requireMonixAuth } from "@/server/auth/policy";
import {
  getReportEnvelopeForUser,
  requireUserSub,
} from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

/** Authenticated report fetch (owner or URL-matched orphan). */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ reportId: string }> },
) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const { reportId } = await ctx.params;
    const payload = await getReportEnvelopeForUser(reportId, sub);
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
