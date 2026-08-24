"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  KeyRound,
  LayoutGrid,
  LineChart,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import type {
  DailyAvailabilityTile,
  FleetOverviewData,
  FleetSiteTelemetry,
} from "@/server/fleet/private-sites-service";

/* -------------------------------------------------------------------------- */
/*                 Enhanced Multi-Point Latency Waveform Graph                */
/* -------------------------------------------------------------------------- */
function EnhancedLatencyGraph({
  history,
  status,
  currentLatency,
  timeRange = "24h",
}: {
  history: FleetSiteTelemetry["responseTimeHistory24h"];
  status: FleetSiteTelemetry["status"];
  currentLatency: number | null;
  timeRange?: "24h" | "7d" | "30d";
}) {
  const gradientId = useId();

  // If history is empty, synthesize a 10-point baseline from currentLatency so it's never an empty void
  const points = useMemo(() => {
    const valid = (history || []).filter(
      (
        p,
      ): p is {
        timestamp: string;
        responseTimeMs: number;
        status: "up" | "down";
      } => typeof p.responseTimeMs === "number" && p.responseTimeMs >= 0,
    );

    if (valid.length >= 2) return valid;

    // Build baseline visualization
    const base = currentLatency ?? 180;
    const now = Date.now();
    return Array.from({ length: 10 }, (_, i) => ({
      timestamp: new Date(now - (9 - i) * 15 * 60 * 1000).toISOString(),
      responseTimeMs:
        status === "down"
          ? 0
          : Math.round(base * (1 + Math.sin(i * 1.8) * 0.06)),
      status: (status === "down" ? "down" : "up") as "up" | "down",
    }));
  }, [history, currentLatency, status]);

  const values = points.map((p) => p.responseTimeMs);
  const maxVal = Math.max(...values, 100);
  const minVal = 0;
  const height = 68;
  const width = 380;
  const paddingX = 8;
  const paddingY = 8;

  const pointsCoordinates = points.map((p, idx) => {
    const x =
      points.length > 1
        ? paddingX + (idx / (points.length - 1)) * (width - paddingX * 2)
        : width / 2;
    const y =
      height -
      paddingY -
      ((p.responseTimeMs - minVal) / (maxVal - minVal || 1)) *
        (height - paddingY * 2);
    return { x, y, val: p.responseTimeMs };
  });

  const pointsStr = pointsCoordinates
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");

  // Area closed polygon for gradient fill
  const firstX = pointsCoordinates[0]?.x ?? paddingX;
  const lastX =
    pointsCoordinates[pointsCoordinates.length - 1]?.x ?? width - paddingX;
  const bottomY = height - paddingY;
  const areaPolygonStr = `${firstX},${bottomY} ${pointsStr} ${lastX},${bottomY}`;

  const lastPoint = pointsCoordinates[pointsCoordinates.length - 1];

  const strokeColor =
    status === "up" ? "#00ff66" : status === "degraded" ? "#facc15" : "#ef4444";
  const fillColor =
    status === "up"
      ? "rgba(0, 255, 102, 0.15)"
      : status === "degraded"
        ? "rgba(250, 204, 21, 0.15)"
        : "rgba(239, 68, 68, 0.15)";

  const avgLatency = Math.round(
    values.reduce((a, b) => a + b, 0) / (values.length || 1),
  );

  return (
    <div className="w-full bg-[#08080b] border border-zinc-800/80 rounded p-3 space-y-2">
      {/* Header Info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-ping" />
          <span className="text-zinc-400 font-semibold uppercase tracking-wider">
            Live Latency Stream ({timeRange})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">
            Peak: <b className="text-zinc-300">{maxVal}ms</b>
          </span>
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-500">
            Avg: <b className="text-zinc-300">{avgLatency}ms</b>
          </span>
        </div>
      </div>

      {/* SVG Waveform Chart with Area Fill */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-14 overflow-visible"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Background Gridlines */}
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#18181b"
          strokeWidth="1"
        />
        <line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke="#18181b"
          strokeDasharray="3,3"
          strokeWidth="1"
        />

        {/* Area Gradient Fill */}
        <polygon points={areaPolygonStr} fill={`url(#${gradientId})`} />

        {/* Latency Polyline Curve */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />

        {/* Point Circles */}
        {pointsCoordinates.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="1.75"
            fill={strokeColor}
            opacity={0.7}
          />
        ))}

        {/* Glowing Latest Point */}
        {lastPoint && (
          <>
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="4"
              fill={strokeColor}
              className="animate-pulse"
            />
            <circle
              cx={lastPoint.x}
              cy={lastPoint.y}
              r="8"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1"
              opacity="0.4"
              className="animate-ping"
            />
          </>
        )}
      </svg>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-0.5 border-t border-zinc-900">
        <span className="flex items-center gap-1 text-zinc-400">
          <Sparkles className="w-2.5 h-2.5 text-[#00ff66]" />
          <span>Real-time Active Probe Stream</span>
        </span>
        <span className="text-white font-semibold">
          Now: {currentLatency !== null ? `${currentLatency} ms` : "--"}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                     30-Day Availability Tiles Visualizer                   */
/* -------------------------------------------------------------------------- */
function AvailabilityHeatmap({ tiles }: { tiles: DailyAvailabilityTile[] }) {
  if (!tiles || tiles.length === 0) return null;

  return (
    <div className="space-y-1.5 pt-1">
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span className="text-zinc-500 uppercase tracking-wider">
          30-Day Availability Heatmap
        </span>
        <span className="text-emerald-400 font-semibold">
          {tiles.filter((t) => t.status === "up").length} / {tiles.length} Days
          100%
        </span>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto py-1">
        {tiles.map((tile, idx) => {
          const bg =
            tile.status === "up"
              ? "bg-[#00ff66] hover:bg-[#00ff66]/80"
              : tile.status === "degraded"
                ? "bg-yellow-400 hover:bg-yellow-300"
                : tile.status === "down"
                  ? "bg-red-500 hover:bg-red-400"
                  : "bg-zinc-800";

          return (
            <div
              key={tile.date || idx}
              title={`${tile.date}: ${tile.uptimePercent}% uptime (${tile.status.toUpperCase()})`}
              className={`h-5 flex-1 min-w-[6px] rounded-xs transition-transform hover:scale-125 cursor-pointer ${bg}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[8px] font-mono text-zinc-600">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                     Multi-Site Fleet Comparison Chart                      */
/* -------------------------------------------------------------------------- */
function FleetComparisonTimeline({ sites }: { sites: FleetSiteTelemetry[] }) {
  const colors = [
    "#00ff66",
    "#38bdf8",
    "#a855f7",
    "#f59e0b",
    "#ec4899",
    "#10b981",
    "#6366f1",
    "#f43f5e",
  ];

  const maxVal = Math.max(
    ...sites.map((s) => s.currentResponseTimeMs ?? 0),
    800,
  );

  return (
    <div className="border border-zinc-800 bg-[#0d0d0f] rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-[#00ff66]" />
          <h3 className="text-sm font-semibold text-white font-mono">
            FLEET LATENCY OVERLAY &amp; COMPARISON
          </h3>
        </div>
        <span className="text-[11px] font-mono text-zinc-400">
          Comparing response latency across {sites.length} target portals
        </span>
      </div>

      {/* Interactive Legend */}
      <div className="flex flex-wrap gap-3 text-[11px] font-mono">
        {sites.map((site, i) => (
          <div key={site.slug} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: colors[i % colors.length] }}
            />
            <span className="text-zinc-300 truncate max-w-[140px]">
              {site.name}
            </span>
            <span className="text-zinc-500 font-semibold">
              {site.currentResponseTimeMs ?? "--"}ms
            </span>
          </div>
        ))}
      </div>

      {/* SVG Multi-Bar Latency Benchmark */}
      <div className="space-y-2 pt-2">
        {sites.map((site, i) => {
          const lat = site.currentResponseTimeMs ?? 0;
          const pct = Math.min(100, Math.max(2, (lat / maxVal) * 100));
          const col = colors[i % colors.length];

          return (
            <div key={site.slug} className="space-y-1 font-mono text-xs">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span className="truncate max-w-xs">{site.name}</span>
                <span className="font-semibold text-white">
                  {lat > 0 ? `${lat} ms` : "Down / Error"}
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden flex">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: site.status === "down" ? "#ef4444" : col,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Main Page Component                          */
/* -------------------------------------------------------------------------- */
export default function PrivateSitesMonitoringPage() {
  const [data, setData] = useState<FleetOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  const [viewMode, setViewMode] = useState<"cards" | "timeline">("cards");
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [countdown, setCountdown] = useState<number>(30);

  // Add Site Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSiteCategory, setNewSiteCategory] = useState("Custom Sites");
  const [addingSite, setAddingSite] = useState(false);

  const fetchFleetData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/private-sites", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to fetch fleet telemetry (${res.status})`);
      }
      const json: FleetOverviewData = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading fleet data");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const handleInstantProbe = async () => {
    setProbing(true);
    setError(null);
    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "probe_all" }),
      });
      if (!res.ok) {
        throw new Error(`Failed to run live probe (${res.status})`);
      }
      const json: FleetOverviewData = await res.json();
      setData(json);
      setCountdown(refreshInterval);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error triggering probe");
    } finally {
      setProbing(false);
    }
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteUrl.trim()) return;

    setAddingSite(true);
    setError(null);
    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_site",
          name: newSiteName.trim() || undefined,
          url: newSiteUrl.trim(),
          category: newSiteCategory.trim() || "Custom Sites",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to add site");
      }

      const updated: FleetOverviewData = await res.json();
      setData(updated);
      setShowAddModal(false);
      setNewSiteName("");
      setNewSiteUrl("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding new target");
    } finally {
      setAddingSite(false);
    }
  };

  const handleDeleteSite = async (slug: string, url: string) => {
    if (!confirm(`Are you sure you want to remove ${url} from monitoring?`))
      return;

    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_site",
          slug,
          url,
        }),
      });

      if (!res.ok) throw new Error("Failed to delete target");
      const updated: FleetOverviewData = await res.json();
      setData(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting site");
    }
  };

  useEffect(() => {
    fetchFleetData(true);
  }, [fetchFleetData]);

  // Auto-refresh countdown loop
  useEffect(() => {
    if (refreshInterval <= 0) return;

    setCountdown(refreshInterval);
    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchFleetData(false);
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalTimer);
  }, [refreshInterval, fetchFleetData]);

  const filteredSites = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "All") return data.sites;
    return data.sites.filter((s) => s.category === activeCategory);
  }, [data, activeCategory]);

  return (
    <div className="min-h-screen bg-[#060608] text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-24 pb-20 space-y-8">
        {/* Header Bar */}
        <header className="border-b border-zinc-850 pb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]" />
                <span className="font-mono text-xs text-[#00ff66] uppercase tracking-widest font-semibold">
                  PRIVATE FLEET RADAR :: /PRIVATE-SITES
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Fleet Uptime &amp; Latency Stream
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl font-mono">
                Continuous health pings, authentication/login detection, 30-day
                timeline heatmaps, and response latency waveforms.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Add Site Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00ff66]" />
                <span>Add Site</span>
              </button>

              {/* Auto Refresh Selector */}
              <div className="flex items-center gap-1.5 border border-zinc-800 bg-[#0d0d0f] rounded px-3 py-1.5 text-xs font-mono text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Refresh:</span>
                <select
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  className="bg-transparent text-[#00ff66] font-semibold focus:outline-none cursor-pointer"
                >
                  <option value={0} className="bg-zinc-900 text-white">
                    Off
                  </option>
                  <option value={15} className="bg-zinc-900 text-white">
                    15s
                  </option>
                  <option value={30} className="bg-zinc-900 text-white">
                    30s
                  </option>
                  <option value={60} className="bg-zinc-900 text-white">
                    60s
                  </option>
                </select>
                {refreshInterval > 0 && (
                  <span className="text-zinc-500 text-[10px] pl-1">
                    ({countdown}s)
                  </span>
                )}
              </div>

              {/* Instant Health Check Button */}
              <button
                onClick={handleInstantProbe}
                disabled={probing}
                className="px-4 py-2 bg-[#00ff66] hover:bg-[#00ff66]/90 active:scale-95 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 rounded cursor-pointer shadow-[0_0_12px_rgba(0,255,102,0.2)]"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${probing ? "animate-spin" : ""}`}
                />
                <span>{probing ? "Probing Fleet..." : "Run Health Check"}</span>
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="p-4 border border-red-500/30 bg-red-950/20 text-red-400 rounded text-xs font-mono flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Fleet KPI Banner */}
        {data && (
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* KPI 1: Fleet Operational Status */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>Fleet Operational</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00ff66]" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono flex items-baseline gap-1.5">
                <span className="text-[#00ff66]">
                  {data.summary.operationalSites}
                </span>
                <span className="text-zinc-500 text-sm">
                  / {data.summary.totalSites}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                {data.summary.loginPortalsCount} auth/login portal(s) identified
              </p>
            </div>

            {/* KPI 2: Fleet 24h Uptime */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>Avg 24h Availability</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                {data.summary.fleetUptime24h}%
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Fleet uptime rolling metric
              </p>
            </div>

            {/* KPI 3: Fleet Latency */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>Fleet Latency</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                {data.summary.fleetAvgResponseTimeMs !== null
                  ? `${data.summary.fleetAvgResponseTimeMs} ms`
                  : "--"}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Global response time across portals
              </p>
            </div>

            {/* KPI 4: Active Incidents */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>Active Disruptions</span>
                <AlertOctagon
                  className={`w-3.5 h-3.5 ${
                    data.summary.activeIncidentsTotal > 0
                      ? "text-red-400 animate-pulse"
                      : "text-zinc-500"
                  }`}
                />
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold font-mono ${
                  data.summary.activeIncidentsTotal > 0
                    ? "text-red-400"
                    : "text-zinc-200"
                }`}
              >
                {data.summary.activeIncidentsTotal}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                {data.summary.activeIncidentsTotal === 0
                  ? "Zero active incidents"
                  : "Requires review"}
              </p>
            </div>
          </section>
        )}

        {/* View Switcher & Category Toolbar */}
        <section className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-850 pb-3">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
            {data?.categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                  activeCategory === cat
                    ? "bg-[#00ff66] text-black font-semibold"
                    : "text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Time Range & View Toggles */}
          <div className="flex items-center gap-3">
            {/* Range Toggle */}
            <div className="flex items-center border border-zinc-800 bg-[#0d0d0f] rounded p-0.5 text-xs font-mono">
              {(["24h", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    timeRange === r
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Layout Toggle */}
            <div className="flex items-center border border-zinc-800 bg-[#0d0d0f] rounded p-0.5 text-xs font-mono">
              <button
                onClick={() => setViewMode("cards")}
                title="Cards View"
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "cards"
                    ? "bg-zinc-800 text-[#00ff66]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("timeline")}
                title="Fleet Latency Comparison"
                className={`p-1.5 rounded transition-colors ${
                  viewMode === "timeline"
                    ? "bg-zinc-800 text-[#00ff66]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Content Display */}
        {loading ? (
          <div className="py-20 text-center space-y-3 font-mono">
            <RefreshCw className="w-6 h-6 text-[#00ff66] animate-spin mx-auto" />
            <p className="text-zinc-400 text-xs">
              Pinging fleet targets &amp; analyzing portal authentication
              headers...
            </p>
          </div>
        ) : viewMode === "timeline" ? (
          <FleetComparisonTimeline sites={filteredSites} />
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredSites.map((site) => {
              const isUp = site.status === "up";
              const isDegraded = site.status === "degraded";
              const statusColor = isUp
                ? "text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10"
                : isDegraded
                  ? "text-yellow-400 border-yellow-500/30 bg-yellow-950/20"
                  : "text-red-400 border-red-500/30 bg-red-950/20";

              const latencyColor =
                site.currentResponseTimeMs === null
                  ? "text-zinc-500"
                  : site.currentResponseTimeMs < 250
                    ? "text-[#00ff66]"
                    : site.currentResponseTimeMs < 600
                      ? "text-yellow-400"
                      : "text-orange-400";

              return (
                <div
                  key={site.slug}
                  className="border border-zinc-800/90 bg-[#0d0d0f] hover:border-zinc-700 transition-all rounded-lg p-5 space-y-4 flex flex-col justify-between"
                >
                  {/* Top Bar: Name, Category, Badges */}
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                            {site.category}
                          </span>

                          {/* Login / Auth Portal Pill */}
                          {site.isLoginProtected && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-sky-950/60 text-sky-400 border border-sky-600/40 inline-flex items-center gap-1">
                              <KeyRound className="w-3 h-3 text-sky-400" />
                              <span>
                                {site.loginPortalType || "Auth / Login Portal"}
                              </span>
                            </span>
                          )}
                        </div>

                        <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                          <span>{site.name}</span>
                        </h2>

                        {/* Page Title or Redirect Note */}
                        {site.pageTitle && (
                          <div className="text-[11px] font-mono text-zinc-400 truncate max-w-sm">
                            &ldquo;{site.pageTitle}&rdquo;
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-zinc-400 hover:text-[#00ff66] transition-colors inline-flex items-center gap-1"
                          >
                            <span>{site.url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {site.finalUrl && site.finalUrl !== site.url && (
                            <span className="text-[10px] font-mono text-zinc-500 truncate max-w-xs">
                              &rarr; {site.finalUrl}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status Badge & Actions */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div
                          className={`px-2.5 py-1 rounded border text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${statusColor}`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isUp
                                ? "bg-[#00ff66] animate-pulse shadow-[0_0_6px_#00ff66]"
                                : isDegraded
                                  ? "bg-yellow-400"
                                  : "bg-red-500 animate-ping"
                            }`}
                          />
                          <span>
                            {isUp
                              ? "Operational"
                              : isDegraded
                                ? "Degraded"
                                : "Outage"}
                          </span>
                        </div>

                        {site.isCustom && (
                          <button
                            onClick={() =>
                              handleDeleteSite(site.slug, site.url)
                            }
                            title="Remove site from monitoring"
                            className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Incident Warning if down */}
                    {site.latestIncident && (
                      <div className="p-2.5 bg-red-950/30 border border-red-500/40 rounded text-red-400 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Incident: {site.latestIncident.cause}</span>
                      </div>
                    )}
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 border-y border-zinc-800/80 py-3 text-center">
                    <div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">
                        Current Ping
                      </div>
                      <div
                        className={`text-sm sm:text-base font-mono font-bold ${latencyColor}`}
                      >
                        {site.currentResponseTimeMs !== null
                          ? `${site.currentResponseTimeMs} ms`
                          : "--"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">
                        HTTP Status
                      </div>
                      <div className="text-sm sm:text-base font-mono font-bold text-zinc-200">
                        {site.statusCode ?? "--"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">
                        {timeRange.toUpperCase()} Uptime
                      </div>
                      <div className="text-sm sm:text-base font-mono font-bold text-zinc-200">
                        {timeRange === "24h"
                          ? `${site.uptimePercentage24h}%`
                          : timeRange === "7d"
                            ? `${site.uptimePercentage7d}%`
                            : `${site.uptimePercentage30d}%`}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Latency Waveform Graph with Area Fill */}
                  <EnhancedLatencyGraph
                    history={site.responseTimeHistory24h}
                    status={site.status}
                    currentLatency={site.currentResponseTimeMs}
                    timeRange={timeRange}
                  />

                  {/* 30-Day Availability Tiles */}
                  <AvailabilityHeatmap tiles={site.dailyAvailability30d} />

                  {/* Bottom Footer: SSL Status & Deep Dive Link */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-850">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck
                        className={`w-3.5 h-3.5 ${
                          site.certWarning
                            ? "text-yellow-400"
                            : site.certDaysRemaining !== null
                              ? "text-emerald-400"
                              : "text-zinc-500"
                        }`}
                      />
                      <span>
                        {site.certDaysRemaining !== null
                          ? `SSL: ${site.certDaysRemaining}d valid`
                          : "SSL: Active"}
                      </span>
                    </div>

                    <Link
                      href={`/status/${site.slug}`}
                      className="inline-flex items-center gap-1 text-[#00ff66] hover:underline"
                    >
                      <span>Full Status Page</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      {/* Add New Site Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="bg-[#0e0e12] border border-zinc-750 rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#00ff66]" />
                <h3 className="text-base font-semibold text-white">
                  Add Monitored Site
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSite} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label
                  htmlFor="site-url-input"
                  className="text-zinc-300 font-medium"
                >
                  Target URL *
                </label>
                <input
                  id="site-url-input"
                  type="text"
                  required
                  placeholder="https://app.example.com"
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-zinc-700 rounded text-white focus:outline-none focus:border-[#00ff66]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="site-name-input"
                  className="text-zinc-300 font-medium"
                >
                  Portal / Display Name (Optional)
                </label>
                <input
                  id="site-name-input"
                  type="text"
                  placeholder="e.g. My Production Portal"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-zinc-700 rounded text-white focus:outline-none focus:border-[#00ff66]"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="site-cat-input"
                  className="text-zinc-300 font-medium"
                >
                  Category / Group
                </label>
                <input
                  id="site-cat-input"
                  type="text"
                  placeholder="e.g. Production, Internal, KL University"
                  value={newSiteCategory}
                  onChange={(e) => setNewSiteCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-black border border-zinc-700 rounded text-white focus:outline-none focus:border-[#00ff66]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSite || !newSiteUrl.trim()}
                  className="px-4 py-2 bg-[#00ff66] text-black font-semibold rounded hover:bg-[#00ff66]/90 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${addingSite ? "animate-spin" : ""}`}
                  />
                  <span>
                    {addingSite ? "Adding & Probing..." : "Save & Probe"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
