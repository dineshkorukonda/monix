import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const SALT = "gsc-oauth-state-v1";

function stateSecret(): Uint8Array {
  const raw =
    process.env.MONIX_GSC_STATE_SECRET?.trim() ||
    process.env.GOOGLE_REFRESH_TOKEN_FERNET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  if (!raw) {
    throw new Error(
      "Set MONIX_GSC_STATE_SECRET (or GOOGLE_REFRESH_TOKEN_FERNET_KEY / SUPABASE_SERVICE_ROLE_KEY) for GSC OAuth state signing.",
    );
  }
  return new TextEncoder().encode(
    createHash("sha256").update(`${SALT}:${raw}`, "utf8").digest("base64url"),
  );
}

export async function signGscOAuthState(userSub: string): Promise<string> {
  const secret = stateSecret();
  return new SignJWT({ sub: userSub })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyGscOAuthState(state: string): Promise<string> {
  const secret = stateSecret();
  const { payload } = await jwtVerify(state, secret, { algorithms: ["HS256"] });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) throw new Error("invalid_state");
  return sub;
}

export function randomNonce(): string {
  return randomBytes(12).toString("base64url");
}
