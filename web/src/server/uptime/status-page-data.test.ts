import { describe, expect, it } from "bun:test";
import { getStatusPageData } from "./status-page-data";

describe("status-page-data", () => {
  it("returns null when target is not found or is private", async () => {
    const mockQueryMaybeOne = async () => null;
    const mockQueryRows = async () => [];

    const res = await getStatusPageData(
      "private-site",
      mockQueryMaybeOne,
      mockQueryRows,
    );
    expect(res).toBeNull();
  });

  it("returns complete status page data when site is public", async () => {
    const siteId = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";

    const mockQueryMaybeOne = async <T>(text: string): Promise<T | null> => {
      if (text.includes("from public.monix_targets")) {
        return {
          id: siteId,
          url: "https://status.example.com",
          public_status_page: true,
          status_slug: "example",
        } as unknown as T;
      }
      if (
        text.includes("from public.uptime_checks") &&
        text.includes("limit 1")
      ) {
        return {
          status: "up",
          response_time_ms: 42,
          status_code: 200,
          checked_at: new Date().toISOString(),
        } as unknown as T;
      }
      if (text.includes("interval '24 hours'")) {
        return {
          total: "100",
          up_count: "100",
        } as unknown as T;
      }
      if (text.includes("interval '30 days'")) {
        return {
          total: "100",
          up_count: "99",
        } as unknown as T;
      }
      return null;
    };

    const mockQueryRows = async <T>(text: string): Promise<T[]> => {
      if (text.includes("from public.uptime_checks")) {
        return [
          {
            status: "up",
            response_time_ms: 40,
            checked_at: new Date().toISOString(),
          },
          {
            status: "up",
            response_time_ms: 45,
            checked_at: new Date().toISOString(),
          },
        ] as unknown as T[];
      }
      if (text.includes("from public.incidents")) {
        return [
          {
            id: "1",
            started_at: new Date(Date.now() - 120000).toISOString(),
            ended_at: new Date(Date.now() - 60000).toISOString(),
            cause: "Temporary 500",
          },
        ] as unknown as T[];
      }
      return [] as unknown as T[];
    };

    const res = await getStatusPageData(
      "example",
      mockQueryMaybeOne,
      mockQueryRows,
    );

    expect(res).not.toBeNull();
    expect(res?.site.status).toBe("up");
    expect(res?.site.currentResponseTimeMs).toBe(42);
    expect(res?.site.uptimePercentage24h).toBe(100);
    expect(res?.site.uptimePercentage30d).toBe(99);
    expect(res?.responseTimeHistory24h.length).toBe(2);
    expect(res?.incidents[0].status).toBe("resolved");
    expect(res?.incidents[0].durationSeconds).toBeGreaterThan(0);
  });
});
