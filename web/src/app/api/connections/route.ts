import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "success", connections: [], count: 0 });
}
