import { type NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/server/auth/policy";
import { deleteUserData, requireUserSub } from "@/server/db/monix-data";
import { getSupabaseAdmin } from "@/server/db/supabase-admin";
import { handleRouteError } from "@/server/transport/http";

export async function DELETE(request: NextRequest) {
  try {
    const { token } = await requireSupabaseAuth(request);
    const sub = await requireUserSub(token);
    await deleteUserData(sub);
    try {
      await getSupabaseAdmin().auth.admin.deleteUser(sub);
    } catch {
      /* Supabase may reject if user already gone */
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
