import { type NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "@/server/auth/passwords";
import { requireMonixAuth } from "@/server/auth/policy";
import { getMonixUserById, updateMonixPassword } from "@/server/db/monix-user";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    const { sub } = await requireMonixAuth(request);
    const body = (await request.json()) as {
      old_password?: string;
      new_password?: string;
    };
    const oldPassword = body.old_password ?? "";
    const newPassword = body.new_password ?? "";
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      return NextResponse.json(
        { error: `New ${pwdError.toLowerCase()}` },
        { status: 400 },
      );
    }
    const user = await getMonixUserById(sub);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ok = await verifyPassword(oldPassword, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 },
      );
    }
    await updateMonixPassword(sub, await hashPassword(newPassword));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
