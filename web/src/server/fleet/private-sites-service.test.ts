import { describe, expect, it } from "bun:test";
import {
  addCustomFleetSite,
  DEFAULT_FLEET_SITES,
  generate24HourlySlots,
  getActiveFleetConfigs,
  normalizeFleetUrl,
  probeFleetSite,
  removeCustomFleetSite,
} from "./private-sites-service";

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

  it("normalizes various URL formats correctly", () => {
    expect(normalizeFleetUrl("example.com")).toBe("https://example.com");
    expect(normalizeFleetUrl("http://test.org/")).toBe("http://test.org");
    expect(normalizeFleetUrl("https://sub.domain.com/app/path")).toBe(
      "https://sub.domain.com/app/path",
    );
  });

  it("adds, retains, and removes custom monitored sites", async () => {
    const custom = await addCustomFleetSite({
      name: "Custom Test Site",
      url: "example.com",
      category: "Test Cluster",
    });

    expect(custom.name).toBe("Custom Test Site");
    expect(custom.url).toBe("https://example.com");
    expect(custom.category).toBe("Test Cluster");
    expect(custom.isCustom).toBe(true);

    const active = await getActiveFleetConfigs();
    const found = active.find((s) => s.url === "https://example.com");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Custom Test Site");
    expect(found?.category).toBe("Test Cluster");

    // Remove
    const removed = await removeCustomFleetSite("https://example.com");
    expect(removed).toBe(true);

    const afterRemove = await getActiveFleetConfigs();
    expect(
      afterRemove.find((s) => s.url === "https://example.com"),
    ).toBeUndefined();
  });

  it("generates 24 discrete hourly slots with status and check metrics", () => {
    const now = new Date();
    const mockChecks = [
      {
        checked_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        status: "up",
        response_time_ms: 120,
        status_code: 200,
      },
      {
        checked_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        status: "down",
        response_time_ms: null,
        status_code: 500,
      },
    ];

    const slots = generate24HourlySlots(mockChecks, 120, "up");
    expect(slots.length).toBe(24);
    expect(slots[0].hourIndex).toBe(0);
    expect(slots[23].hourIndex).toBe(23);
    expect(typeof slots[0].timeLabel).toBe("string");
    expect(typeof slots[0].uptimePercent).toBe("number");
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
    expect(telemetry.responseTimeHistory24h.length).toBeGreaterThanOrEqual(10);
    expect(Array.isArray(telemetry.hourlySlots24h)).toBe(true);
    expect(telemetry.hourlySlots24h.length).toBe(24);
    expect(Array.isArray(telemetry.dailyAvailability30d)).toBe(true);
    expect(telemetry.dailyAvailability30d.length).toBe(30);
    expect(typeof telemetry.isLoginProtected).toBe("boolean");
  });
});
