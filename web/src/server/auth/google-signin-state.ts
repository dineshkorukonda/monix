import { createHash, randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const SALT = "google-signin-state-v1";

function stateSecret(): Uint8Array {
  const raw =
    process.env.MONIX_JWT_SECRET?.trim() ||
    process.env.MONIX_ENCRYPTION_SECRET?.trim() ||
    process.env.MONIX_FERNET_SECRET?.trim() ||
    "";
  if (!raw) {
    throw new Error("Set MONIX_JWT_SECRET for Google Sign-In.");
  }
  return new TextEncoder().encode(
    createHash("sha256").update(`${SALT}:${raw}`, "utf8").digest("base64url"),
  );
}

export async function signGoogleSignInState(): Promise<string> {
  const secret = stateSecret();
  const nonce = randomBytes(16).toString("base64url");
  return new SignJWT({ nonce })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret);
}

export async function verifyGoogleSignInState(state: string): Promise<void> {
  const secret = stateSecret();
  await jwtVerify(state, secret, { algorithms: ["HS256"] });
}
