import { type NextRequest, NextResponse } from "next/server";
import { requireSupabaseAuth } from "@/server/auth/policy";
import { listScansForUser, requireUserSub } from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const { token } = await requireSupabaseAuth(request);
    const sub = await requireUserSub(token);
    const data = await listScansForUser(sub);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
