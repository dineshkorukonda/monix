import { NextResponse } from "next/server";
import { threatInfoPayload } from "@/server/analysis/threat-catalog";

export async function GET() {
  return NextResponse.json(threatInfoPayload());
}
