import { describe, expect, it } from "bun:test";
import {
  checkMemoryRateLimit,
  getClientIp,
  MAX_SCAN_REQUESTS_PER_HOUR,
  SCAN_WINDOW_MS,
} from "./rate-limit";

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.195, 70.41.3.18",
    });
    expect(getClientIp(headers)).toBe("203.0.113.195");
  });

  it("extracts IP from x-real-ip header", () => {
    const headers = new Headers({ "x-real-ip": "198.51.100.1" });
    expect(getClientIp(headers)).toBe("198.51.100.1");
  });

  it("extracts IP from cf-connecting-ip header", () => {
    const headers = new Headers({ "cf-connecting-ip": "198.51.100.2" });
    expect(getClientIp(headers)).toBe("198.51.100.2");
  });

  it("falls back to 127.0.0.1 when no headers present", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("127.0.0.1");
  });
});

describe("checkMemoryRateLimit", () => {
  it("allows up to MAX_SCAN_REQUESTS_PER_HOUR and blocks 6th request", () => {
    const ip = `test-ip-${Date.now()}`;
    for (let i = 1; i <= MAX_SCAN_REQUESTS_PER_HOUR; i++) {
      const res = checkMemoryRateLimit(
        ip,
        MAX_SCAN_REQUESTS_PER_HOUR,
        SCAN_WINDOW_MS,
      );
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(MAX_SCAN_REQUESTS_PER_HOUR - i);
    }

    const blocked = checkMemoryRateLimit(
      ip,
      MAX_SCAN_REQUESTS_PER_HOUR,
      SCAN_WINDOW_MS,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetSeconds).toBeGreaterThan(0);
  });

  it("resets after window elapses", () => {
    const ip = `test-ip-reset-${Date.now()}`;
    const shortWindow = 50; // 50ms
    for (let i = 1; i <= 2; i++) {
      checkMemoryRateLimit(ip, 2, shortWindow);
    }
    const blocked = checkMemoryRateLimit(ip, 2, shortWindow);
    expect(blocked.allowed).toBe(false);

    // Wait for window to elapse
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60);

    const allowedAgain = checkMemoryRateLimit(ip, 2, shortWindow);
    expect(allowedAgain.allowed).toBe(true);
  });
});
