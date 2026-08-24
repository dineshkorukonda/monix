import { describe, expect, it } from "bun:test";
import { normalizeAndValidateScanUrl } from "./url-validator";

describe("normalizeAndValidateScanUrl", () => {
  it("normalizes and validates plain domain names", () => {
    const res = normalizeAndValidateScanUrl("example.com");
    expect(res.valid).toBe(true);
    expect(res.url).toBe("https://example.com");
  });

  it("normalizes and validates http/https URLs", () => {
    const res = normalizeAndValidateScanUrl("https://monix.dev/docs");
    expect(res.valid).toBe(true);
    expect(res.url).toBe("https://monix.dev/docs");
  });

  it("rejects invalid or empty inputs", () => {
    expect(normalizeAndValidateScanUrl("").valid).toBe(false);
    expect(normalizeAndValidateScanUrl("   ").valid).toBe(false);
    expect(normalizeAndValidateScanUrl("http://").valid).toBe(false);
    expect(normalizeAndValidateScanUrl("invalid url with spaces").valid).toBe(
      false,
    );
    expect(normalizeAndValidateScanUrl("ftp://test.com").valid).toBe(false);
  });
});
