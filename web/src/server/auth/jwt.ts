import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export type MonixJwtPayload = JWTPayload & {
  sub: string;
  email?: string;
};

export class AuthVerificationError extends Error {
  readonly status = 401;

  constructor(message: string) {
    super(message);
    this.name = "AuthVerificationError";
  }
}

export class AuthConfigError extends Error {
  readonly status = 500;

  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

function jwtSecret(): Uint8Array {
  const secret =
    process.env.MONIX_JWT_SECRET?.trim() ||
    process.env.MONIX_ENCRYPTION_SECRET?.trim() ||
    process.env.MONIX_FERNET_SECRET?.trim() ||
    "";
  if (!secret) {
    throw new AuthConfigError(
      "Set MONIX_JWT_SECRET or MONIX_ENCRYPTION_SECRET for auth.",
    );
  }
  return new TextEncoder().encode(secret);
}

function jwtIssuer(): string {
  return process.env.MONIX_JWT_ISSUER?.trim() || "monix-local";
}

function jwtAudience(): string {
  return process.env.MONIX_JWT_AUDIENCE?.trim() || "monix-app";
}

export async function signAccessToken(payload: {
  sub: string;
  email: string;
}): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(jwtIssuer())
    .setAudience(jwtAudience())
    .setIssuedAt()
    .setExpirationTime(process.env.MONIX_JWT_TTL || "30d")
    .sign(jwtSecret());
}

export async function verifyAccessToken(
  token: string,
): Promise<MonixJwtPayload> {
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), {
      algorithms: ["HS256"],
      issuer: jwtIssuer(),
      audience: jwtAudience(),
    });
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (!sub) {
      throw new AuthVerificationError("Unauthorized");
    }
    return payload as MonixJwtPayload;
  } catch (error) {
    if (error instanceof AuthConfigError) {
      throw error;
    }
    throw new AuthVerificationError("Unauthorized");
  }
}
