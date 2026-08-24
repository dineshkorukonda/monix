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
});
