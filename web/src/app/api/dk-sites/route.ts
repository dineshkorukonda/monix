import { type NextRequest, NextResponse } from "next/server";
import {
  addCustomFleetSite,
  getFleetTelemetry,
  probeAndRecordAllFleetSites,
  removeCustomFleetSite,
} from "@/server/fleet/dk-sites-service";
import { handleRouteError } from "@/server/transport/http";

export const dynamic = "force-dynamic";
export const maxDuration = 45; // Generous timeout for concurrent multi-site probing

export async function GET(_request: NextRequest) {
  try {
    const data = await getFleetTelemetry();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      action?: "add_site" | "delete_site" | "probe_all";
      name?: string;
      url?: string;
      category?: string;
      slug?: string;
    } = {};

    try {
      body = await request.json();
    } catch {
      // Empty body defaults to probe_all
    }

    if (body.action === "add_site") {
      if (!body.url) {
        return NextResponse.json(
          { error: "URL is required to add a site" },
          { status: 400 },
        );
      }
      await addCustomFleetSite({
        name: body.name,
        url: body.url,
        category: body.category,
      });
      const updated = await getFleetTelemetry();
      return NextResponse.json(updated);
    }

    if (body.action === "delete_site") {
      if (!body.url && !body.slug) {
        return NextResponse.json(
          { error: "URL or slug required to remove site" },
          { status: 400 },
        );
      }
      await removeCustomFleetSite(body.slug || body.url || "");
      const updated = await getFleetTelemetry();
      return NextResponse.json(updated);
    }

    // Default action: Probe all sites concurrently
    const data = await probeAndRecordAllFleetSites();
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
