import { describe, expect, it } from "bun:test";
import { generatePublicSlug, isValidPublicSlug } from "./slug";

describe("generatePublicSlug", () => {
  it("generates a 12-character URL-safe string by default", () => {
    const slug = generatePublicSlug();
    expect(slug).toBeString();
    expect(slug.length).toBe(12);
    expect(isValidPublicSlug(slug)).toBe(true);
  });

  it("generates unique slugs", () => {
    const set = new Set<string>();
    for (let i = 0; i < 100; i++) {
      set.add(generatePublicSlug());
    }
    expect(set.size).toBe(100);
  });

  it("supports custom length", () => {
    const slug = generatePublicSlug(10);
    expect(slug.length).toBe(10);
    expect(isValidPublicSlug(slug)).toBe(true);
  });

  it("validates valid and invalid slugs", () => {
    expect(isValidPublicSlug("abc123_-XYZ0")).toBe(true);
    expect(isValidPublicSlug("abc/123")).toBe(false);
    expect(isValidPublicSlug("abc 123")).toBe(false);
    expect(isValidPublicSlug("")).toBe(false);
  });
});
