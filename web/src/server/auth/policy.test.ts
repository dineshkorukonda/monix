import { beforeEach, describe, expect, it } from "bun:test";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { requireMonixAuth } from "./policy";

function ephemeralHs256Key(): string {
  return randomBytes(32).toString("hex");
}

describe("requireMonixAuth", () => {
  beforeEach(() => {
    process.env.MONIX_JWT_SECRET = ephemeralHs256Key();
    process.env.MONIX_JWT_ISSUER = "monix-test";
    process.env.MONIX_JWT_AUDIENCE = "monix-app";
  });

  it("returns token and sub for a valid bearer JWT", async () => {
    const secret = process.env.MONIX_JWT_SECRET ?? "";
    const token = await new SignJWT({
      email: "user@example.com",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("22222222-2222-2222-2222-222222222222")
      .setIssuer("monix-test")
      .setAudience("monix-app")
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(secret));

    const req = new NextRequest("http://localhost/api/gsc/status", {
      headers: { authorization: `Bearer ${token}` },
    });
    const out = await requireMonixAuth(req);
    expect(out.token).toBe(token);
    expect(out.sub).toBe("22222222-2222-2222-2222-222222222222");
    expect(out.email).toBe("user@example.com");
  });
});
