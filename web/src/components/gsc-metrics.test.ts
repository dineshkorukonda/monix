import { describe, expect, it } from "bun:test";
import { formatCompactNumber } from "./gsc-metrics";

describe("formatCompactNumber", () => {
  it("formats ordinary counts and rounds fractional counts", () => {
    expect(formatCompactNumber(42)).toBe("42");
    expect(formatCompactNumber(42.6)).toBe("43");
    expect(formatCompactNumber(1_250)).toBe("1.3k");
    expect(formatCompactNumber(2_500_000)).toBe("2.5M");
  });

  it("switches suffixes at the thousand and million boundaries", () => {
    expect(formatCompactNumber(999)).toBe("999");
    expect(formatCompactNumber(1_000)).toBe("1.0k");
    expect(formatCompactNumber(999_999)).toBe("1000.0k");
    expect(formatCompactNumber(1_000_000)).toBe("1.0M");
  });

  it("distinguishes zero from missing or invalid data", () => {
    expect(formatCompactNumber(0)).toBe("0");
    expect(formatCompactNumber(null)).toBe("—");
    expect(formatCompactNumber(undefined)).toBe("—");
    expect(formatCompactNumber(Number.NaN)).toBe("—");
  });
});
