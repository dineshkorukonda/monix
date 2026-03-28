"use client";

import { MapMarker, MarkerContent, MarkerPopup, Map as GLMap } from "@/components/ui/map";
import { getScanLocations, type ScanLocation } from "@/lib/api";
import { useEffect, useState } from "react";
import { Globe, Loader2 } from "lucide-react";

function scoreDot(score: number) {
  if (score >= 80) return "#34d399";
  if (score >= 50) return "#fbbf24";
  return "#f87171";
}

export default function ScansWorldMap() {
  const [locations, setLocations] = useState<ScanLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getScanLocations()
      .then(setLocations)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-xs">Loading map…</span>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-white/20 gap-2">
        <Globe className="h-8 w-8" />
        <p className="text-xs">No location data yet. Run a scan to see pins.</p>
      </div>
    );
  }

  return (
    <GLMap
      zoom={1.4}
      center={[10, 20]}
      minZoom={1}
      maxZoom={12}
      styles={{
        dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
      }}
    >
      {locations.map((loc) => {
        const color = scoreDot(loc.score);
        const domain = loc.url.replace(/^https?:\/\//, "").split("/")[0];
        return (
          <MapMarker key={`${loc.lat}-${loc.lng}-${loc.url}`} longitude={loc.lng} latitude={loc.lat}>
            <MarkerContent>
              <div className="relative flex items-center justify-center cursor-pointer group">
                <span
                  className="absolute h-5 w-5 rounded-full opacity-25 animate-ping"
                  style={{ backgroundColor: color }}
                />
                <span
                  className="relative h-3 w-3 rounded-full border-2 border-black/40 shadow-lg"
                  style={{ backgroundColor: color }}
                />
              </div>
            </MarkerContent>
            <MarkerPopup offset={14}>
              <div className="space-y-1 min-w-[160px] p-1">
                <p className="text-xs font-semibold truncate">{domain}</p>
                {(loc.city || loc.country) && (
                  <p className="text-[11px] text-muted-foreground">
                    {[loc.city, loc.country].filter(Boolean).join(", ")}
                  </p>
                )}
                {loc.org && <p className="text-[11px] text-muted-foreground/70">{loc.org}</p>}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-semibold" style={{ color }}>
                    Score {loc.score}
                  </span>
                </div>
              </div>
            </MarkerPopup>
          </MapMarker>
        );
      })}
    </GLMap>
  );
}
