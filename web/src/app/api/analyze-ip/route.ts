import { type NextRequest, NextResponse } from "next/server";
import { analyzeIpPayload } from "@/server/engine/analyze-ip";
import { handleRouteError } from "@/server/transport/http";

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { status: "error", error: "Invalid JSON body" },
        { status: 400 },
      );
    }
    const ip = String(body.ip ?? "").trim();
    if (!ip) {
      return NextResponse.json(
        { status: "error", error: "Missing 'ip' in request body" },
        { status: 400 },
      );
    }
    const payload = await analyzeIpPayload(ip);
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
