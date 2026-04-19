import {
  createRemoteJWKSet,
  decodeJwt,
  decodeProtectedHeader,
  type JWTPayload,
  jwtVerify,
} from "jose";

export class AuthVerificationError extends Error {
  readonly status = 401;

  constructor(message: string) {
    super(message);
    this.name = "AuthVerificationError";
  }
}

function supabaseProjectUrl(): string {
  const raw =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "");
}

function jwtIssuer(): string {
  const explicit = process.env.SUPABASE_JWT_ISSUER?.trim();
  if (explicit) {
    return explicit;
  }
  const base = supabaseProjectUrl();
  if (!base) {
    throw new AuthVerificationError(
      "Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL for JWT verification",
    );
  }
  return `${base}/auth/v1`;
}

function jwksEndpoint(): string {
  const explicit = process.env.SUPABASE_JWKS_URL?.trim();
  if (explicit) {
    return explicit;
  }
  const base = supabaseProjectUrl();
  if (!base) {
    throw new AuthVerificationError(
      "Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL for JWT verification",
    );
  }
  return `${base}/auth/v1/.well-known/jwks.json`;
}

function audiences(): string[] {
  const raw = (process.env.SUPABASE_JWT_AUD ?? "authenticated").trim();
  return raw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksEndpoint()));
  }
  return jwks;
}

/**
 * Verify a Supabase-issued access token (RS256/ES256 via JWKS, or HS256 with SUPABASE_JWT_SECRET).
 * Mirrors the intent of Django `reports.supabase_auth._decode`.
 */
export async function verifySupabaseAccessToken(
  token: string,
): Promise<JWTPayload> {
  const header = decodeProtectedHeader(token);
  const alg = (header.alg ?? "HS256").toUpperCase();
  const aud = audiences();
  const issuer = jwtIssuer();
  const verifyOpts = {
    issuer,
    audience: aud.length ? aud : undefined,
  };

  if (alg === "HS256") {
    const secret = process.env.SUPABASE_JWT_SECRET?.trim();
    if (!secret) {
      throw new AuthVerificationError(
        "HS256 token requires SUPABASE_JWT_SECRET (Supabase Settings → API → JWT Secret)",
      );
    }
    const key = new TextEncoder().encode(secret);
    const unverified = decodeJwt(token);
    const hsOpts = {
      algorithms: ["HS256" as const],
      audience: verifyOpts.audience,
      issuer: unverified.iss ? issuer : undefined,
    };
    const { payload } = await jwtVerify(token, key, hsOpts);
    return payload;
  }

  const { payload } = await jwtVerify(token, getJwks(), {
    algorithms: ["RS256", "ES256"],
    ...verifyOpts,
  });
  return payload;
}
