import { describe, expect, it } from "bun:test";
import {
  discoverPassiveSubdomains,
  extractRootDomain,
  resolveAndProbeSubdomain,
} from "./subdomain-enumerator";

describe("subdomain-enumerator", () => {
  describe("extractRootDomain", () => {
    it("extracts root domain correctly", () => {
      expect(extractRootDomain("https://example.com/path")).toBe("example.com");
      expect(extractRootDomain("sub.example.com:8080")).toBe("sub.example.com");
    });
  });

  describe("discoverPassiveSubdomains", () => {
    it("parses crt.sh passive results", async () => {
      const mockFetch = async () => {
        return new Response(
          JSON.stringify([
            { name_value: "api.example.com\nmail.example.com" },
            { common_name: "dev.example.com" },
          ]),
          { status: 200 },
        );
      };

      const subs = await discoverPassiveSubdomains("example.com", mockFetch);
      expect(subs).toContain("api.example.com");
      expect(subs).toContain("mail.example.com");
      expect(subs).toContain("dev.example.com");
      expect(subs).toContain("example.com");
    });
  });

  describe("resolveAndProbeSubdomain", () => {
    it("probes and returns live status and IDs", async () => {
      const mockResolve4Fn = async () => ["93.184.216.34"];
      const mockFetch = async () => new Response(null, { status: 200 });

      const res = await resolveAndProbeSubdomain(
        "api.example.com",
        null,
        mockResolve4Fn,
        mockFetch,
      );

      expect(res).defined;
      expect(res?.subdomain).toBe("api.example.com");
      expect(res?.ips).toEqual(["93.184.216.34"]);
      expect(res?.isLive).toBe(true);
      expect(res?.httpStatus).toBe(200);
    });
  });
});
