import { type NextRequest, NextResponse } from "next/server";
import { requireMonixAuth } from "@/server/auth/policy";
import {
  deleteTargetForUser,
  getTargetDetail,
  requireUserSub,
} from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const { id } = await ctx.params;
    const data = await getTargetDetail(sub, id);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    const { id } = await ctx.params;
    await deleteTargetForUser(sub, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
