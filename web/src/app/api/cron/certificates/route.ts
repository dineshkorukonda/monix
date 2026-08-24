import { type NextRequest, NextResponse } from "next/server";
import { runCertificateExpiryChecks } from "@/server/uptime/cert-checker";

export const dynamic = "force-dynamic";

async function handleCron(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runCertificateExpiryChecks();

  return NextResponse.json({
    ok: true,
    checked: results.length,
    results,
  });
}

export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}
