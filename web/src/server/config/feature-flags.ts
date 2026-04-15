export function useIntegrationFirstAnalytics(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_INTEGRATION_FIRST === "true";
}

export function useNextIntegrationApi(): boolean {
  return process.env.NEXT_PUBLIC_USE_NEXT_INTEGRATION_API === "true";
}

export function enableDualReadVerification(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_DUAL_READ_VERIFICATION === "true";
}
