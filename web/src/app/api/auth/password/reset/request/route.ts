import { createHash, randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import {
  getMonixUserByEmail,
  storePasswordResetToken,
} from "@/server/db/monix-user";
import { handleRouteError } from "@/server/transport/http";

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: true });
    }
    const user = await getMonixUserByEmail(email);
    let token: string | null = null;
    if (user) {
      token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
      await storePasswordResetToken(user.id, sha256(token), expires);
    }
    return NextResponse.json({
      ok: true,
      ...(process.env.MONIX_DEV_PASSWORD_RESET_ECHO === "true" && token
        ? { reset_token: token }
        : {}),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
