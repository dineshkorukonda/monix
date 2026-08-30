import { describe, expect, it } from "bun:test";
import { DK_DEFAULT_SITES } from "./dk-sites-service";

describe("dk-sites-service compatibility", () => {
  it("re-exports default sites", () => {
    expect(DK_DEFAULT_SITES.length).toBe(16);
  });
});
