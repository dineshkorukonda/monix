import { beforeEach, describe, expect, it } from "bun:test";
import { SignJWT } from "jose";
import {
  AuthVerificationError,
  verifySupabaseAccessToken,
} from "./supabase-jwt";

describe("verifySupabaseAccessToken", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://proj.supabase.co";
    process.env.SUPABASE_JWT_SECRET = "unit-test-jwt-secret-for-hs256-tokens";
    process.env.SUPABASE_JWT_AUD = "authenticated";
    delete process.env.SUPABASE_JWT_ISSUER;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it("verifies HS256 tokens with issuer and audience", async () => {
    const secret = process.env.SUPABASE_JWT_SECRET ?? "";
    expect(secret.length).toBeGreaterThan(0);
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("11111111-1111-1111-1111-111111111111")
      .setIssuer("https://proj.supabase.co/auth/v1")
      .setAudience("authenticated")
      .setExpirationTime("2h")
      .sign(new TextEncoder().encode(secret));

    const payload = await verifySupabaseAccessToken(token);
    expect(payload.sub).toBe("11111111-1111-1111-1111-111111111111");
  });

  it("throws when HS256 is used without SUPABASE_JWT_SECRET", async () => {
    delete process.env.SUPABASE_JWT_SECRET;
    const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalid";
    await expect(verifySupabaseAccessToken(token)).rejects.toBeInstanceOf(
      AuthVerificationError,
    );
  });

  it("throws when SUPABASE_URL is missing for RS256 path", async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const token =
      "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
    await expect(verifySupabaseAccessToken(token)).rejects.toBeInstanceOf(
      AuthVerificationError,
    );
  });
});
