import { type NextRequest, NextResponse } from "next/server";
import { buildIntegrationServices } from "@/server/bootstrap/integrations";
import { handleRouteError } from "@/server/transport/http";

export async function GET(request: NextRequest) {
  try {
    const upstream = await buildIntegrationServices().gsc.handleOAuthCallback(
      request.nextUrl.searchParams.toString(),
    );

    const location = upstream.headers.get("location");
    if (location) {
      return NextResponse.redirect(location, {
        status: upstream.status || 302,
      });
    }

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "text/plain",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
