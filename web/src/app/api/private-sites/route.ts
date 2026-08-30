import { type NextRequest, NextResponse } from "next/server";
import {
  addCustomFleetSite,
  type FleetSiteConfig,
  getFleetTelemetry,
  probeAndRecordAllFleetSites,
  removeCustomFleetSite,
} from "@/server/fleet/private-sites-service";
import { handleRouteError } from "@/server/transport/http";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

function parseCustomSitesFromRequest(request: NextRequest): FleetSiteConfig[] {
  try {
    const customHeader = request.headers.get("x-custom-sites");
    if (customHeader) {
      return JSON.parse(decodeURIComponent(customHeader));
    }
  } catch {
    // ignore
  }

  try {
    const { searchParams } = new URL(request.url);
    const customParam = searchParams.get("custom");
    if (customParam) {
      return JSON.parse(decodeURIComponent(customParam));
    }
  } catch {
    // ignore
  }

  return [];
}

export async function GET(request: NextRequest) {
  try {
    const clientCustomSites = parseCustomSitesFromRequest(request);
    const data = await getFleetTelemetry(clientCustomSites);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: {
      action?: "add_site" | "delete_site" | "probe_all" | "sync";
      name?: string;
      url?: string;
      category?: string;
      slug?: string;
      customSites?: FleetSiteConfig[];
      nightlyDowntime?: {
        enabled: boolean;
        startHour: number;
        startMinute?: number;
        endHour: number;
        endMinute?: number;
        timezoneOffsetHours?: number;
        label: string;
      };
    } = {};

    try {
      body = await request.json();
    } catch {
      // Empty body defaults to probe_all
    }

    const headerCustomSites = parseCustomSitesFromRequest(request);
    const customSites = Array.isArray(body.customSites)
      ? body.customSites
      : headerCustomSites;

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
        nightlyDowntime: body.nightlyDowntime,
      });
      const updated = await getFleetTelemetry(customSites);
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
      const remainingCustomSites = (customSites || []).filter(
        (s) =>
          s.url !== body.url &&
          s.slug !== body.slug &&
          s.slug !== body.url &&
          s.url !== body.slug,
      );
      const updated = await getFleetTelemetry(remainingCustomSites);
      return NextResponse.json(updated);
    }

    // Default action: Probe all sites concurrently
    const data = await probeAndRecordAllFleetSites(customSites);
    return NextResponse.json(data);
  } catch (error) {
    return handleRouteError(error);
  }
}
