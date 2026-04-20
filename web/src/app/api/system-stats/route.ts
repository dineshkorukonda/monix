import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "success",
    cpu_percent: 0,
    memory_percent: 0,
    disk_percent: 0,
    network_sent: 0,
    network_recv: 0,
    uptime: 0,
    load_avg: [0, 0, 0],
    process_count: 0,
  });
}
