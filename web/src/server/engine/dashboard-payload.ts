import { getSystemStatsPayload } from "@/server/engine/system-stats";

export function dashboardPayload(): Record<string, unknown> {
  const system_stats = {
    ...getSystemStatsPayload(),
    timestamp: new Date().toISOString(),
  };
  return {
    status: "success",
    connections: [],
    alerts: [],
    system_stats,
    traffic_summary: {
      total_requests: 0,
      unique_ips: 0,
      total_404s: 0,
      high_risk_hits: 0,
      suspicious_ips: [],
      log_exists: false,
    },
  };
}
