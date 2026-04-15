import { describe, expect, it } from "bun:test";
import {
  enableDualReadVerificationClient,
  useIntegrationFirstAnalyticsClient,
  useNextIntegrationApiClient,
} from "./feature-flags";

describe("feature flag helpers", () => {
  it("returns true only when NEXT_PUBLIC_USE_NEXT_INTEGRATION_API is true", () => {
    process.env.NEXT_PUBLIC_USE_NEXT_INTEGRATION_API = "true";
    expect(useNextIntegrationApiClient()).toBe(true);

    process.env.NEXT_PUBLIC_USE_NEXT_INTEGRATION_API = "false";
    expect(useNextIntegrationApiClient()).toBe(false);
  });

  it("returns true only when NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION is true", () => {
    process.env.NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION = "true";
    expect(enableDualReadVerificationClient()).toBe(true);

    process.env.NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION = "0";
    expect(enableDualReadVerificationClient()).toBe(false);
  });

  it("returns true only when NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST is true", () => {
    process.env.NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST = "true";
    expect(useIntegrationFirstAnalyticsClient()).toBe(true);

    process.env.NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST = "off";
    expect(useIntegrationFirstAnalyticsClient()).toBe(false);
  });
});
