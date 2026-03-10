"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Map as ActivityMap,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";

const markers = [
  {
    city: "Singapore",
    region: "APAC edge",
    lng: 103.8198,
    lat: 1.3521,
    severity: "high",
    pulse: "shadow-[0_0_0_10px_rgba(239,68,68,0.18)]",
  },
  {
    city: "Frankfurt",
    region: "EU relay",
    lng: 8.6821,
    lat: 50.1109,
    severity: "medium",
    pulse: "shadow-[0_0_0_10px_rgba(245,158,11,0.16)]",
  },
  {
    city: "Virginia",
    region: "US origin",
    lng: -77.4874,
    lat: 39.0438,
    severity: "tracking",
    pulse: "shadow-[0_0_0_10px_rgba(255,255,255,0.12)]",
  },
];

const feed = [
  "Ingress probe burst mapped across three CDNs",
  "Redirect drift detected between public and edge routes",
  "Header coverage dropped below baseline on one monitored zone",
];

export default function LiveThreatMap() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Global activity</p>
            <CardTitle className="mt-2">Live tracking surface</CardTitle>
          </div>
          <Badge variant="outline" className="border-white/12 bg-white/[0.04]">
            MapLibre live view
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5 p-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="h-[320px] border-b border-white/10 lg:h-full lg:border-b-0 lg:border-r">
          <ActivityMap
            center={[15, 26]}
            zoom={1.3}
            styles={{
              dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
              light:
                "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
            }}
          >
            {markers.map((marker) => (
              <MapMarker
                key={marker.city}
                longitude={marker.lng}
                latitude={marker.lat}
              >
                <MarkerContent>
                  <div
                    className={`h-4 w-4 rounded-full border border-black bg-white ${marker.pulse}`}
                    title={`${marker.city} ${marker.severity}`}
                  />
                </MarkerContent>
              </MapMarker>
            ))}
          </ActivityMap>
        </div>
        <div className="space-y-4 p-6">
          {markers.map((marker) => (
            <div
              key={marker.city}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{marker.city}</p>
                <Badge
                  variant="outline"
                  className="border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-[0.2em]"
                >
                  {marker.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                {marker.region}
              </p>
            </div>
          ))}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--ink-soft)]">
              Live notes
            </p>
            <div className="mt-3 space-y-2">
              {feed.map((item) => (
                <p key={item} className="text-sm leading-6 text-white/88">
                  {item}
                </p>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
