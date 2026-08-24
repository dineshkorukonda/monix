import { type NextRequest, NextResponse } from "next/server";
import { runFullUrlAnalysis } from "@/server/analysis/analyze-url-engine";
import { normalizeAndValidateScanUrl } from "@/server/analysis/url-validator";

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

    const validation = normalizeAndValidateScanUrl(body.url);
    if (!validation.valid || !validation.url) {
      return NextResponse.json(
        { status: "error", error: validation.error || "Invalid URL provided." },
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
      url: validation.url,
      fullScan,
      includePortScan,
      includeMetadata,
      includePerformance,
      targetId: null,
      persist: true,
    });

    const slug = (result.public_slug ||
      result.slug ||
      result.report_id) as string;
    const scores = (result.scores || {
      overall: result.score ?? result.overall ?? 0,
      security: result.security_score ?? 0,
      seo: result.seo_score ?? 0,
      performance: result.performance_score ?? null,
    }) as Record<string, unknown>;

    return NextResponse.json({
      status: "success",
      slug,
      public_slug: slug,
      report_id: result.report_id,
      url: result.url || validation.url,
      score: result.score ?? result.overall ?? 0,
      scores,
      createdAt: result.created_at || new Date().toISOString(),
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json(
      { status: "error", error: message },
      { status: 500 },
    );
  }
}
