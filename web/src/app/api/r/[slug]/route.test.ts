import { describe, expect, it, mock } from "bun:test";
import { NextRequest } from "next/server";

mock.module("@/server/db/monix-data", () => ({
  getReportByPublicSlug: async (slug: string) => {
    if (slug === "valid1234567") {
      return {
        report_id: "test-report-id",
        public_slug: "valid1234567",
        url: "https://example.com",
        score: 95,
        created_at: new Date().toISOString(),
        results: {},
      };
    }
    throw Object.assign(new Error("Report not found."), { status: 404 });
  },
}));

const { GET } = await import("./route");

describe("GET /api/r/[slug]", () => {
  it("returns 400 for empty slug", async () => {
    const req = new NextRequest("http://localhost:3000/api/r/");
    const res = await GET(req, { params: Promise.resolve({ slug: "" }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.status).toBe("error");
  });

  it("returns 404 for unknown slug", async () => {
    const req = new NextRequest("http://localhost:3000/api/r/nonexistent12");
    const res = await GET(req, {
      params: Promise.resolve({ slug: "nonexistent12" }),
    });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.status).toBe("error");
    expect(json.error).toBe("Report not found.");
  });

  it("returns 200 and report payload for valid slug without auth", async () => {
    const req = new NextRequest("http://localhost:3000/api/r/valid1234567");
    const res = await GET(req, {
      params: Promise.resolve({ slug: "valid1234567" }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.public_slug).toBe("valid1234567");
    expect(json.score).toBe(95);
  });
});
