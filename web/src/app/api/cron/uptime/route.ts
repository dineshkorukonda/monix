import { type NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/server/transport/http";
import { runAllUptimeChecks } from "@/server/uptime/uptime-checker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET?.trim();

    // If CRON_SECRET is set, protect the route
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}` && authHeader !== cronSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const result = await runAllUptimeChecks();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
