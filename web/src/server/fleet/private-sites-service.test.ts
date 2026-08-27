import { describe, expect, it } from "bun:test";
import {
  addCustomFleetSite,
  DEFAULT_FLEET_SITES,
  generate24HourlySlots,
  getActiveFleetConfigs,
  isTimestampInNightlyDowntime,
  normalizeFleetUrl,
  probeFleetSite,
  removeCustomFleetSite,
} from "./private-sites-service";

describe("private-sites-service", () => {
  it("defines the exact 7 requested fleet domains and nightly maintenance schedules", () => {
    expect(DEFAULT_FLEET_SITES.length).toBe(7);
    const urls = DEFAULT_FLEET_SITES.map((s) => s.url);
    expect(urls).toContain("https://kluniversity.in");
    expect(urls).toContain("https://newerp.kluniversity.in");
    expect(urls).toContain("https://lms.kluniversity.in");
    expect(urls).toContain("https://klef.in");
    expect(urls).toContain("https://iskconcommunity.com");
    expect(urls).toContain("https://msf.iskconcommunity.com");
    expect(urls).toContain("https://dev.iskconcommunity.com");

    const erpSite = DEFAULT_FLEET_SITES.find(
      (s) => s.slug === "newerp-kluniversity",
    );
    expect(erpSite?.nightlyDowntime?.enabled).toBe(true);
    expect(erpSite?.nightlyDowntime?.startHour).toBe(23);

    const lmsSite = DEFAULT_FLEET_SITES.find(
      (s) => s.slug === "lms-kluniversity",
    );
    expect(lmsSite?.nightlyDowntime?.enabled).toBe(true);
    expect(lmsSite?.nightlyDowntime?.startHour).toBe(0);
  });

  it("accurately detects timestamps within nightly downtime window", () => {
    const config = {
      enabled: true,
      startHour: 23,
      startMinute: 30,
      endHour: 5,
      endMinute: 30,
      timezoneOffsetHours: 5.5,
      label: "Nightly ERP Maintenance Window",
    };

    // 01:00 AM IST is 19:30 UTC previous day -> should be in nightly window
    const inDowntimeDate = new Date("2026-08-27T19:30:00Z"); // 01:00 IST
    expect(isTimestampInNightlyDowntime(inDowntimeDate, config)).toBe(true);

    // 14:00 PM IST is 08:30 UTC -> should NOT be in nightly window
    const daytimeDate = new Date("2026-08-27T08:30:00Z"); // 14:00 IST
    expect(isTimestampInNightlyDowntime(daytimeDate, config)).toBe(false);
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

  it("generates 24 discrete hourly slots and reflects nightly downtime slots", () => {
    const now = new Date();
    const mockChecks = [
      {
        checked_at: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        status: "up",
        response_time_ms: 120,
        status_code: 200,
      },
    ];

    const nightlyConfig = {
      enabled: true,
      startHour: 23,
      startMinute: 0,
      endHour: 5,
      endMinute: 0,
      timezoneOffsetHours: 5.5,
      label: "Nightly ERP Maintenance Window",
    };

    const slots = generate24HourlySlots(mockChecks, 120, "up", nightlyConfig);
    expect(slots.length).toBe(24);
    expect(slots[0].hourIndex).toBe(0);
    expect(slots[23].hourIndex).toBe(23);
    expect(typeof slots[0].timeLabel).toBe("string");

    // Some slots must reflect the nightly downtime
    const downSlots = slots.filter((s) => s.status === "down");
    expect(downSlots.length).toBeGreaterThan(0);
    expect(downSlots[0].errorMessages).toContain(
      "Nightly ERP Maintenance Window",
    );
  });

  it("probes a fleet site and generates enhanced baseline telemetry series", async () => {
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
