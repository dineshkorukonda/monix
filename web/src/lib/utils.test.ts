import { describe, expect, it } from "bun:test";
import { cn } from "./utils";

describe("cn", () => {
  it("merges and de-duplicates conflicting tailwind classes", () => {
    const value = cn("p-2 text-sm", "p-4", false && "hidden", "text-sm");
    expect(value).toBe("p-4 text-sm");
  });
});
