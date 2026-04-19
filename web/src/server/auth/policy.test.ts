import { beforeEach, describe, expect, it } from "bun:test";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { requireSupabaseAuth } from "./policy";

describe("requireSupabaseAuth", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://proj.supabase.co";
    process.env.SUPABASE_JWT_SECRET = "unit-test-jwt-secret-for-hs256-tokens";
    process.env.SUPABASE_JWT_AUD = "authenticated";
    process.env.MONIX_VERIFY_SUPABASE_JWT = "true";
  });

  it("returns token and sub for a valid bearer JWT", async () => {
    const secret = process.env.SUPABASE_JWT_SECRET ?? "";
    expect(secret.length).toBeGreaterThan(0);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("22222222-2222-2222-2222-222222222222")
      .setIssuer("https://proj.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(secret));

    const req = new NextRequest("http://localhost/api/gsc/status", {
      headers: { authorization: `Bearer ${token}` },
    });
    const out = await requireSupabaseAuth(req);
    expect(out.token).toBe(token);
    expect(out.sub).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("skips verification when MONIX_VERIFY_SUPABASE_JWT is false", async () => {
    process.env.MONIX_VERIFY_SUPABASE_JWT = "false";
    const req = new NextRequest("http://localhost/api/gsc/status", {
      headers: { authorization: "Bearer not-a-jwt" },
    });
    const out = await requireSupabaseAuth(req);
    expect(out.sub).toBe("");
    expect(out.token).toBe("not-a-jwt");
  });
});
