import { type NextRequest, NextResponse } from "next/server";
import {
  exchangeGoogleSignInCode,
  getGoogleUserInfo,
} from "@/server/auth/google-auth";
import { verifyGoogleSignInState } from "@/server/auth/google-signin-state";
import { signAccessToken } from "@/server/auth/jwt";
import { upsertGoogleUser } from "@/server/db/monix-user";

const ERROR_REDIRECT = "/login?error=google_auth_failed";
const HANDOFF_COOKIE = "monix_auth_handoff";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const errorParam = params.get("error");

  const errorUrl = new URL(ERROR_REDIRECT, request.url);

  if (errorParam || !code || !state) {
    return NextResponse.redirect(errorUrl);
  }

  try {
    await verifyGoogleSignInState(state);
  } catch {
    return NextResponse.redirect(errorUrl);
  }

  try {
    const { access_token } = await exchangeGoogleSignInCode(code);
    const googleUser = await getGoogleUserInfo(access_token);

    if (!googleUser.email) {
      return NextResponse.redirect(errorUrl);
    }

    const user = await upsertGoogleUser({
      google_sub: googleUser.id,
      email: googleUser.email,
      first_name: googleUser.given_name,
      last_name: googleUser.family_name,
      avatar_url: googleUser.picture,
    });

    const token = await signAccessToken({
      sub: user.id,
      email: user.email ?? googleUser.email,
    });

    const payload = JSON.stringify({ token, email: user.email ?? googleUser.email });
    const response = NextResponse.redirect(new URL("/auth/complete", request.url));
    response.cookies.set(HANDOFF_COOKIE, payload, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
    return response;
  } catch {
    return NextResponse.redirect(errorUrl);
  }
}
