import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { hashPassword, validatePassword } from "@/server/auth/passwords";
import { updateMonixPassword } from "@/server/db/monix-user";
import { queryMaybeOne } from "@/server/db/postgres";
import { handleRouteError } from "@/server/transport/http";

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };
    const token = (body.token ?? "").trim();
    const password = body.password ?? "";
    const pwdError = validatePassword(password);
    if (!token || pwdError) {
      return NextResponse.json(
        { error: pwdError ?? "Reset token is required." },
        { status: 400 },
      );
    }
    const user = await queryMaybeOne<{ id: string }>(
      `
        select id
        from monix_users
        where reset_token_hash = $1
          and reset_token_expires_at is not null
          and reset_token_expires_at > now()
        limit 1
      `,
      [sha256(token)],
    );
    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or expired." },
        { status: 400 },
      );
    }
    await updateMonixPassword(user.id, await hashPassword(password));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
