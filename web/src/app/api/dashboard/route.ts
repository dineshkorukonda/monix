import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    connections: [],
    alerts: [],
    system_stats: {
      cpu_percent: 0,
      memory_percent: 0,
      disk_percent: 0,
      network_sent: 0,
      network_recv: 0,
      uptime: 0,
      load_avg: [0, 0, 0],
      process_count: 0,
    },
    traffic_summary: {
      total_requests: 0,
      unique_ips: 0,
      total_404s: 0,
      high_risk_hits: 0,
      suspicious_ips: [],
    },
  });
}
