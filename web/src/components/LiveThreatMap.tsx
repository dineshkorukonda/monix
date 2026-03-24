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
    pulse: "shadow-[0_0_15px_rgba(239,68,68,0.8)] border-red-500 bg-red-400",
  },
  {
    city: "Frankfurt",
    region: "EU relay",
    lng: 8.6821,
    lat: 50.1109,
    severity: "medium",
    pulse:
      "shadow-[0_0_15px_rgba(245,158,11,0.8)] border-amber-500 bg-amber-400",
  },
  {
    city: "Virginia",
    region: "US origin",
    lng: -77.4874,
    lat: 39.0438,
    severity: "tracking",
    pulse: "shadow-[0_0_15px_rgba(34,211,238,0.8)] border-cyan-500 bg-cyan-400",
  },
];

const feed = [
  "Ingress probe burst mapped across three CDNs",
  "Redirect drift detected between public and edge routes",
  "Header coverage dropped below baseline on one monitored zone",
];

export default function LiveThreatMap() {
  return (
    <Card className="overflow-hidden glass-panel border-white/5 bg-black/40">
      <CardHeader className="border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-cyan-500 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]">
              Global activity
            </p>
            <CardTitle className="mt-2 text-white">
              Live tracking surface
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className="border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.15)]"
          >
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
                    className={`h-3 w-3 rounded-full border ${marker.pulse} animate-pulse`}
                    title={`${marker.city} ${marker.severity}`}
                  />
                </MarkerContent>
              </MapMarker>
            ))}
          </ActivityMap>
        </div>
        <div className="space-y-4 p-6 bg-white/[0.01]">
          {markers.map((marker) => (
            <div
              key={marker.city}
              className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 hover:border-cyan-500/30 transition-colors group"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                  {marker.city}
                </p>
                <Badge
                  variant="outline"
                  className="border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] group-hover:border-cyan-500/20 group-hover:text-cyan-400 group-hover:bg-cyan-500/10 transition-colors"
                >
                  {marker.severity}
                </Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-white/50">
                {marker.region}
              </p>
            </div>
          ))}

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 blur-[30px] rounded-full pointer-events-none" />
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-500/70 drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
              Live notes
            </p>
            <div className="mt-3 space-y-2 relative z-10">
              {feed.map((item) => (
                <p
                  key={item}
                  className="text-sm leading-6 text-white/70 flex items-start gap-2"
                >
                  <span className="mt-2.5 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
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
