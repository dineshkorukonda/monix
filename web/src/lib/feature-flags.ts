export function useNextIntegrationApiClient(): boolean {
  return process.env.NEXT_PUBLIC_USE_NEXT_INTEGRATION_API === "true";
}

export function enableDualReadVerificationClient(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION === "true";
}

export function useIntegrationFirstAnalyticsClient(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST === "true";
}
