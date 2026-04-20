import { NextResponse } from "next/server";
import { dashboardPayload } from "@/server/analysis/dashboard-payload";

export async function GET() {
  return NextResponse.json(dashboardPayload());
}
