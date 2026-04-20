import { NextResponse } from "next/server";
import { getReportEnvelopePublic } from "@/server/db/monix-data";
import { handleRouteError } from "@/server/transport/http";

/** Shareable report payload (matches legacy Django `report_detail`). */
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ reportId: string }> },
) {
  try {
    const { reportId } = await ctx.params;
    const payload = await getReportEnvelopePublic(reportId);
    return NextResponse.json(payload);
  } catch (error) {
    return handleRouteError(error);
  }
}
