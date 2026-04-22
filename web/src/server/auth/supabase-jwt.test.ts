import { beforeEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { AuthVerificationError, verifyAccessToken } from "./jwt";

function ephemeralHs256Key(): string {
  return randomBytes(32).toString("hex");
}

describe("verifyAccessToken", () => {
  beforeEach(() => {
    process.env.MONIX_JWT_SECRET = ephemeralHs256Key();
    process.env.MONIX_JWT_ISSUER = "monix-test";
    process.env.MONIX_JWT_AUDIENCE = "monix-app";
  });

  it("verifies HS256 tokens with issuer and audience", async () => {
    const secret = process.env.MONIX_JWT_SECRET ?? "";
    const token = await new SignJWT({ email: "user@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("11111111-1111-1111-1111-111111111111")
      .setIssuer("monix-test")
      .setAudience("monix-app")
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(secret));

    const payload = await verifyAccessToken(token);
    expect(payload.sub).toBe("11111111-1111-1111-1111-111111111111");
    expect(payload.email).toBe("user@example.com");
  });

  it("throws when the token is invalid", async () => {
    await expect(verifyAccessToken("not-a-token")).rejects.toBeInstanceOf(
      AuthVerificationError,
    );
  });
});
