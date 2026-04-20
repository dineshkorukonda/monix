import { NextResponse } from "next/server";
import { getSystemStatsPayload } from "@/server/engine/system-stats";

export async function GET() {
  return NextResponse.json({ status: "success", ...getSystemStatsPayload() });
}
