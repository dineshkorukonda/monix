import { describe, expect, it } from "bun:test";
import { checkCertificateExpiry, extractHostname } from "./cert-checker";

describe("cert-checker", () => {
  describe("extractHostname", () => {
    it("extracts plain hostname from various URL formats", () => {
      expect(extractHostname("https://example.com/path")).toBe("example.com");
      expect(extractHostname("http://api.example.com:8080/v1")).toBe(
        "api.example.com",
      );
      expect(extractHostname("monix.dev")).toBe("monix.dev");
    });
  });

  describe("checkCertificateExpiry", () => {
    it("handles connection failures gracefully", async () => {
      const res = await checkCertificateExpiry("127.0.0.1", 65534, 14, 500);
      expect(res.valid).toBe(false);
      expect(res.expiryAt).toBeNull();
      expect(res.error).defined;
    });
  });
});
