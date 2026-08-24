import { type NextRequest, NextResponse } from "next/server";
import {
  getFleetTelemetry,
  probeAndRecordAllFleetSites,
} from "@/server/fleet/dk-sites-service";
import { handleRouteError } from "@/server/transport/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Vercel edge/node timeout budget for parallel probing

export async function GET(_request: NextRequest) {
  try {
    const data = await getFleetTelemetry();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(_request: NextRequest) {
  try {
    const data = await probeAndRecordAllFleetSites();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
