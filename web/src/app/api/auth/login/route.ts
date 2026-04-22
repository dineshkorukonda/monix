import { type NextRequest, NextResponse } from "next/server";
import { signAccessToken } from "@/server/auth/jwt";
import { verifyPassword } from "@/server/auth/passwords";
import { getMonixUserByEmail } from "@/server/db/monix-user";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }
    const user = await getMonixUserByEmail(email);
    const ok = await verifyPassword(password, user?.password_hash);
    if (!user || !ok) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }
    const token = await signAccessToken({
      sub: user.id,
      email: user.email ?? email,
    });
    return NextResponse.json({
      token,
      user: { email: user.email ?? email },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
