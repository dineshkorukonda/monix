import { type NextRequest, NextResponse } from "next/server";
import { buildGoogleSignInAuthUrl } from "@/server/auth/google-auth";
import { handleRouteError } from "@/server/transport/http";

export async function GET(_request: NextRequest) {
  try {
    const url = await buildGoogleSignInAuthUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    return handleRouteError(error);
  }
}
