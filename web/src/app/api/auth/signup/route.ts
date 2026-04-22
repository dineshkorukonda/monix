import { type NextRequest, NextResponse } from "next/server";
import { signAccessToken } from "@/server/auth/jwt";
import { hashPassword } from "@/server/auth/passwords";
import {
  createMonixUser,
  getMonixUserByEmail,
} from "@/server/db/monix-user";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    const email = (body.email ?? "").trim().toLowerCase();
    const password = body.password ?? "";
    const fullName = (body.full_name ?? "").trim();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }
    const existing = await getMonixUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 },
      );
    }
    const [first_name, ...rest] = fullName.split(/\s+/).filter(Boolean);
    const user = await createMonixUser({
      email,
      password_hash: await hashPassword(password),
      first_name: first_name ?? "",
      last_name: rest.join(" "),
    });
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
