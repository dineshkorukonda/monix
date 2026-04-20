import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const limitRaw = request.nextUrl.searchParams.get("limit") ?? "10";
  const limit = Number.parseInt(limitRaw, 10);
  const n = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 10;
  return NextResponse.json({
    status: "success",
    processes: [],
    count: 0,
    limit: n,
  });
}
