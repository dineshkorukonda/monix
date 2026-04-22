import type { NextRequest } from "next/server";
import { AuthVerificationError, verifyAccessToken } from "@/server/auth/jwt";

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

export async function requireMonixAuth(request: NextRequest): Promise<{
  token: string;
  sub: string;
  email: string;
}> {
  const token = requireBearerToken(request);
  try {
    const payload = await verifyAccessToken(token);
    return {
      token,
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
    };
  } catch (error) {
    if (error instanceof AuthVerificationError) {
      throw new UnauthorizedError(error.message);
    }
    throw error;
  }
}
