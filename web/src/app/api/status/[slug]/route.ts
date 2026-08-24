import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/server/transport/http";
import { getStatusPageData } from "@/server/uptime/status-page-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const params = await context.params;
    const slug = params.slug?.trim();

    if (!slug) {
      return NextResponse.json(
        { error: "Site identifier is required." },
        { status: 400 },
      );
    }

    const data = await getStatusPageData(slug);

    if (!data) {
      return NextResponse.json(
        { error: "Status page not found or is private." },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
