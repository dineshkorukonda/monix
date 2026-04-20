import { NextResponse } from "next/server";
import { UnauthorizedError } from "@/server/auth/policy";
import { AuthVerificationError } from "@/server/auth/supabase-jwt";
import { UpstreamApiError } from "@/server/infrastructure/upstream-api-client";

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof AuthVerificationError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  if (error instanceof UpstreamApiError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  ) {
    const status = (error as { status: number }).status;
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status });
  }
  const message =
    error instanceof Error ? error.message : "Internal server error";
  return NextResponse.json({ error: message }, { status: 500 });
}
