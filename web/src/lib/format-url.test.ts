import { describe, expect, it } from "bun:test";
import { formatUrlDomain } from "./format-url";

describe("formatUrlDomain", () => {
  it("formats HTTP and HTTPS URLs without their paths", () => {
    expect(formatUrlDomain("https://example.com/report/123")).toBe(
      "example.com",
    );
    expect(formatUrlDomain("http://localhost:3100/api/health")).toBe(
      "localhost:3100",
    );
    expect(formatUrlDomain("example.com/path")).toBe("example.com");
  });

  it("preserves the existing treatment of empty and unusual inputs", () => {
    expect(formatUrlDomain("")).toBe("");
    expect(formatUrlDomain("https://")).toBe("");
    expect(formatUrlDomain("/relative/path")).toBe("");
    expect(formatUrlDomain("HTTPS://example.com/path")).toBe("HTTPS:");
    expect(formatUrlDomain("https://example.com?view=full")).toBe(
      "example.com?view=full",
    );
  });
});
