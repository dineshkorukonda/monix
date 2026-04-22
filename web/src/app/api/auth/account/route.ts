import { type NextRequest, NextResponse } from "next/server";
import { requireMonixAuth } from "@/server/auth/policy";
import { deleteUserData, requireUserSub } from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

export async function DELETE(request: NextRequest) {
  try {
    const { token } = await requireMonixAuth(request);
    const sub = await requireUserSub(token);
    await deleteUserData(sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
