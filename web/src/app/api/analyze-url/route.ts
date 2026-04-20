import { type NextRequest, NextResponse } from "next/server";
import { runFullUrlAnalysis } from "@/server/analysis/analyze-url-engine";

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
    const url = String(body.url ?? "").trim();
    if (!url) {
      return NextResponse.json(
        { status: "error", error: "Missing 'url' in request body" },
        { status: 400 },
      );
    }
    const fullScan =
      request.nextUrl.searchParams.get("full")?.toLowerCase() === "true";
    const includePortScan = Boolean(body.include_port_scan ?? fullScan);
    const includeMetadata = Boolean(body.include_metadata ?? fullScan);
    let includePerformance = Boolean(body.include_performance ?? false);
    if (fullScan) includePerformance = true;
    const result = await runFullUrlAnalysis({
      url,
      fullScan,
      includePortScan,
      includeMetadata,
      includePerformance,
      targetId: null,
      persist: true,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 },
    );
  }
}
