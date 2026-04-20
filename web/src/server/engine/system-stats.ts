import os from "node:os";

/**
 * Lightweight host stats for `/api/system-stats` and `/api/dashboard`.
 * In serverless, values reflect the runtime container, not a monitored server fleet.
 */
export function getSystemStatsPayload(): Record<string, unknown> {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const memoryPercent = total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
  let loadAvg: [number, number, number] = [0, 0, 0];
  try {
    const la = os.loadavg();
    loadAvg = [
      Math.round(la[0] * 100) / 100,
      Math.round(la[1] * 100) / 100,
      Math.round(la[2] * 100) / 100,
    ];
  } catch {
    /* Windows or unsupported */
  }
  return {
    cpu_percent: 0,
    memory_percent: memoryPercent,
    disk_percent: 0,
    network_sent: 0,
    network_recv: 0,
    uptime: Math.floor(os.uptime()),
    load_avg: loadAvg,
    process_count: 0,
  };
}
