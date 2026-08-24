import { type NextRequest, NextResponse } from "next/server";
import { getReportByPublicSlug } from "@/server/db/monix-data";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json(
        { status: "error", error: "Missing report slug." },
        { status: 400 },
      );
    }
    const payload = await getReportByPublicSlug(slug);
    return NextResponse.json(payload);
  } catch (e) {
    const status =
      e && typeof e === "object" && "status" in e ? Number(e.status) : 500;
    const message = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ status: "error", error: message }, { status });
  }
}
