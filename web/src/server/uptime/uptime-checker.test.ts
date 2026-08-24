import { describe, expect, it } from "bun:test";
import { pingUrl, processSiteUptimeCheck } from "./uptime-checker";

describe("uptime-checker", () => {
  describe("pingUrl", () => {
    it("returns up status for 200 OK response", async () => {
      const mockFetch = async () => new Response("OK", { status: 200 });
      const res = await pingUrl(
        "https://example.com",
        5000,
        mockFetch as unknown as typeof fetch,
      );
      expect(res.status).toBe("up");
      expect(res.statusCode).toBe(200);
      expect(res.responseTimeMs).toBeGreaterThan(-1);
      expect(res.error).toBeUndefined();
    });

    it("returns down status for 500 SERVER ERROR", async () => {
      const mockFetch = async () => new Response("Error", { status: 500 });
      const res = await pingUrl(
        "https://example.com",
        5000,
        mockFetch as unknown as typeof fetch,
      );
      expect(res.status).toBe("down");
      expect(res.statusCode).toBe(500);
      expect(res.error).toBe("HTTP status 500");
    });

    it("returns down status for network or timeout failure", async () => {
      const mockFetch = async () => {
        throw new Error("fetch failed: ENOTFOUND");
      };
      const res = await pingUrl(
        "https://non-existent-domain.com",
        5000,
        mockFetch as unknown as typeof fetch,
      );
      expect(res.status).toBe("down");
      expect(res.statusCode).toBe(null);
      expect(res.error).toBe("fetch failed: ENOTFOUND");
    });
  });

  describe("processSiteUptimeCheck", () => {
    it("records an uptime check and does not create incident for single failure", async () => {
      const siteId = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";
      const insertsStream: string[] = [];

      const mockQueryRows = async <T>(text: string): Promise<T[]> => {
        insertsStream.push(text);
        if (text.includes("insert into public.uptime_checks")) {
          return [{ id: "1" }] as unknown as T[];
        }
        if (text.includes("from public.uptime_checks")) {
          // Only 1 recent down check
          return [{ id: "1", status: "down" }] as unknown as T[];
        }
        return [] as unknown as T[];
      };

      const mockQueryMaybeOne = async () => null;

      const res = await processSiteUptimeCheck(
        siteId,
        "https://example.com",
        {
          status: "down",
          statusCode: 500,
          responseTimeMs: 120,
          error: "HTTP 500",
        },
        mockQueryRows,
        mockQueryMaybeOne,
      );

      expect(res.checkId).toBe("1");
      expect(res.incidentCreated).toBe(false);
      expect(res.incidentResolved).toBe(false);
    });

    it("creates an incident when 2 consecutive checks fail", async () => {
      const siteId = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";
      let incidentInserted = false;

      const mockQueryRows = async <T>(text: string): Promise<T[]> => {
        if (text.includes("insert into public.uptime_checks")) {
          return [{ id: "2" }] as unknown as T[];
        }
        if (text.includes("from public.uptime_checks")) {
          // 2 consecutive down checks
          return [
            { id: "2", status: "down" },
            { id: "1", status: "down" },
          ] as unknown as T[];
        }
        if (text.includes("insert into public.incidents")) {
          incidentInserted = true;
          return [{ id: "10" }] as unknown as T[];
        }
        return [] as unknown as T[];
      };

      const mockQueryMaybeOne = async <T>(text: string): Promise<T | null> => {
        if (text.includes("insert into public.incidents")) {
          incidentInserted = true;
          return { id: "10" } as unknown as T;
        }
        return null;
      };

      const res = await processSiteUptimeCheck(
        siteId,
        "https://example.com",
        {
          status: "down",
          statusCode: 500,
          responseTimeMs: 120,
          error: "HTTP 500",
        },
        mockQueryRows,
        mockQueryMaybeOne,
      );

      expect(res.checkId).toBe("2");
      expect(res.incidentCreated).toBe(true);
      expect(incidentInserted).toBe(true);
    });

    it("resolves an active incident when site comes back up", async () => {
      const siteId = "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1";
      let incidentUpdated = false;

      const mockQueryRows = async <T>(text: string): Promise<T[]> => {
        if (text.includes("insert into public.uptime_checks")) {
          return [{ id: "3" }] as unknown as T[];
        }
        if (text.includes("update public.incidents")) {
          incidentUpdated = true;
          return [] as unknown as T[];
        }
        return [] as unknown as T[];
      };

      const mockQueryMaybeOne = async <T>(): Promise<T | null> =>
        ({
          id: "10",
          site_id: siteId,
          started_at: new Date(Date.now() - 60000).toISOString(),
        }) as unknown as T;

      const res = await processSiteUptimeCheck(
        siteId,
        "https://example.com",
        { status: "up", statusCode: 200, responseTimeMs: 45 },
        mockQueryRows,
        mockQueryMaybeOne,
      );

      expect(res.checkId).toBe("3");
      expect(res.incidentResolved).toBe(true);
      expect(incidentUpdated).toBe(true);
    });
  });
});
