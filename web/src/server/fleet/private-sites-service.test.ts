import { describe, expect, it } from "bun:test";
import { DEFAULT_FLEET_SITES, probeFleetSite } from "./private-sites-service";

describe("private-sites-service", () => {
  it("defines the exact 7 requested fleet domains", () => {
    expect(DEFAULT_FLEET_SITES.length).toBe(7);
    const urls = DEFAULT_FLEET_SITES.map((s) => s.url);
    expect(urls).toContain("https://kluniversity.in");
    expect(urls).toContain("https://newerp.kluniversity.in");
    expect(urls).toContain("https://lms.kluniversity.in");
    expect(urls).toContain("https://klef.in");
    expect(urls).toContain("https://iskconcommunity.com");
    expect(urls).toContain("https://msf.iskconcommunity.com");
    expect(urls).toContain("https://dev.iskconcommunity.com");
  });

  it("probes a fleet site and generates enhanced baseline telemetry waveform for newly initialized sites", async () => {
    const site = DEFAULT_FLEET_SITES[0];
    const telemetry = await probeFleetSite(site);

    expect(telemetry.name).toBe(site.name);
    expect(telemetry.url).toBe(site.url);
    expect(telemetry.slug).toBe(site.slug);
    expect(telemetry.category).toBe(site.category);
    expect(["up", "down", "degraded", "unknown"]).toContain(telemetry.status);
    expect(Array.isArray(telemetry.responseTimeHistory24h)).toBe(true);
    // Baseline points ensure it's not a lonely single dot
    expect(telemetry.responseTimeHistory24h.length).toBeGreaterThanOrEqual(10);
    expect(Array.isArray(telemetry.dailyAvailability30d)).toBe(true);
    expect(telemetry.dailyAvailability30d.length).toBe(30);
    expect(typeof telemetry.isLoginProtected).toBe("boolean");
  });
});
