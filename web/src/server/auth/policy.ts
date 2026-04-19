import type { NextRequest } from "next/server";
import {
  AuthVerificationError,
  verifySupabaseAccessToken,
} from "@/server/auth/supabase-jwt";

export class UnauthorizedError extends Error {
  status: number;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}

export function requireBearerToken(request: NextRequest): string {
  const auth = request.headers.get("authorization") ?? "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    throw new UnauthorizedError("Unauthorized");
  }
  return token;
}

function shouldVerifySupabaseJwt(): boolean {
  return process.env.MONIX_VERIFY_SUPABASE_JWT !== "false";
}

/**
 * Bearer token plus verified Supabase `sub` for serverless routes that call upstream APIs.
 * Set `MONIX_VERIFY_SUPABASE_JWT=false` only for local debugging without Supabase env.
 */
export async function requireSupabaseAuth(request: NextRequest): Promise<{
  token: string;
  sub: string;
}> {
  const token = requireBearerToken(request);
  if (!shouldVerifySupabaseJwt()) {
    return { token, sub: "" };
  }
  try {
    const payload = await verifySupabaseAccessToken(token);
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) {
      throw new UnauthorizedError("Unauthorized");
    }
    return { token, sub };
  } catch (error) {
    if (error instanceof AuthVerificationError) {
      throw new UnauthorizedError(error.message);
    }
    throw error;
  }
}
