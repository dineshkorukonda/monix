import { describe, expect, it } from "bun:test";
import { DK_SITES, probeFleetSite } from "./dk-sites-service";

describe("dk-sites-service", () => {
  it("defines the exact 7 requested fleet domains", () => {
    expect(DK_SITES.length).toBe(7);
    const urls = DK_SITES.map((s) => s.url);
    expect(urls).toContain("https://kluniversity.in");
    expect(urls).toContain("https://newerp.kluniversity.in");
    expect(urls).toContain("https://lms.kluniversity.in");
    expect(urls).toContain("https://klef.in");
    expect(urls).toContain("https://iskconcommunity.com");
    expect(urls).toContain("https://msf.iskconcommunity.com");
    expect(urls).toContain("https://dev.iskconcommunity.com");
  });

  it("probes a fleet site and formats telemetry structure properly", async () => {
    const site = DK_SITES[0];
    const telemetry = await probeFleetSite(site);

    expect(telemetry.name).toBe(site.name);
    expect(telemetry.url).toBe(site.url);
    expect(telemetry.slug).toBe(site.slug);
    expect(telemetry.category).toBe(site.category);
    expect(["up", "down", "degraded", "unknown"]).toContain(telemetry.status);
    expect(Array.isArray(telemetry.responseTimeHistory24h)).toBe(true);
  });
});
