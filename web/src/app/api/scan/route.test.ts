import { describe, expect, it } from "bun:test";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("POST /api/scan", () => {
  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("returns 400 for missing or invalid URL", async () => {
    const req = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      body: JSON.stringify({ url: "invalid url with spaces" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("returns 429 with Retry-After when rate limit is exceeded", async () => {
    const testIp = `rate-limit-route-test-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      const req = new NextRequest("http://localhost:3000/api/scan", {
        method: "POST",
        body: "invalid",
        headers: { "x-forwarded-for": testIp },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    }

    const blockedReq = new NextRequest("http://localhost:3000/api/scan", {
      method: "POST",
      body: "invalid",
      headers: { "x-forwarded-for": testIp },
    });
    const blockedRes = await POST(blockedReq);
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.headers.get("Retry-After")).toBeDefined();
    const json = await blockedRes.json();
    expect(json.status).toBe("error");
    expect(json.error).toContain("Rate limit exceeded");
  });
});
