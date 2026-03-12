"use client";

import {
    Map as ActivityMap,
    MapMarker,
    MarkerContent,
} from "@/components/ui/map";

const markers = [
    { city: "Singapore", lng: 103.8198, lat: 1.3521 },
    { city: "Frankfurt", lng: 8.6821, lat: 50.1109 },
    { city: "Virginia", lng: -77.4874, lat: 39.0438 },
    { city: "London", lng: -0.1276, lat: 51.5072 },
    { city: "Tokyo", lng: 139.6503, lat: 35.6762 },
    { city: "Sydney", lng: 151.2093, lat: -33.8688 },
    { city: "São Paulo", lng: -46.6333, lat: -23.5505 },
];

export default function WorldMap() {
    return (
        <div className="w-full h-full">
            <ActivityMap
                center={[15, 26]}
                zoom={1.5}
                styles={{
                    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                    light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
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
                                className="h-2 w-2 rounded-full bg-white animate-pulse"
                                title={marker.city}
                            />
                        </MarkerContent>
                    </MapMarker>
                ))}
            </ActivityMap>
        </div>
    );
}
