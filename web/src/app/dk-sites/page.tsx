"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import type {
  FleetOverviewData,
  FleetSiteTelemetry,
} from "@/server/fleet/dk-sites-service";

function MiniSparkline({
  history,
  status,
}: {
  history: FleetSiteTelemetry["responseTimeHistory24h"];
  status: FleetSiteTelemetry["status"];
}) {
  if (!history || history.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-zinc-600 text-[11px] font-mono border border-zinc-800/40 rounded bg-black/40">
        [AWAITING_TELEMETRY]
      </div>
    );
  }

  const validPoints = history.filter(
    (
      p,
    ): p is {
      timestamp: string;
      responseTimeMs: number;
      status: "up" | "down";
    } => typeof p.responseTimeMs === "number" && p.responseTimeMs >= 0,
  );

  if (validPoints.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-zinc-600 text-[11px] font-mono border border-zinc-800/40 rounded bg-black/40">
        [NO_LATENCY_RECORDS]
      </div>
    );
  }

  const values = validPoints.map((p) => p.responseTimeMs);
  const maxVal = Math.max(...values, 100);
  const minVal = 0;
  const height = 64;
  const width = 360;
  const paddingX = 8;
  const paddingY = 8;

  const pointsStr = validPoints
    .map((p, idx) => {
      const x =
        validPoints.length > 1
          ? paddingX + (idx / (validPoints.length - 1)) * (width - paddingX * 2)
          : width / 2;
      const y =
        height -
        paddingY -
        ((p.responseTimeMs - minVal) / (maxVal - minVal || 1)) *
          (height - paddingY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const lastPoint = validPoints[validPoints.length - 1];
  const lastX = validPoints.length > 1 ? width - paddingX : width / 2;
  const lastY =
    height -
    paddingY -
    (((lastPoint?.responseTimeMs ?? 0) - minVal) / (maxVal - minVal || 1)) *
      (height - paddingY * 2);

  const strokeColor =
    status === "up" ? "#00ff66" : status === "degraded" ? "#facc15" : "#ef4444";

  return (
    <div className="w-full bg-[#08080a] border border-zinc-800/80 rounded p-2.5 space-y-1">
      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
        <span className="text-zinc-500 uppercase tracking-wider">
          24h Latency Curve
        </span>
        <span className="text-zinc-300 font-semibold">Peak: {maxVal}ms</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-14 overflow-visible"
      >
        <line
          x1={paddingX}
          y1={height - paddingY}
          x2={width - paddingX}
          y2={height - paddingY}
          stroke="#1f1f23"
          strokeWidth="1"
        />
        <line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke="#1f1f23"
          strokeDasharray="2,4"
          strokeWidth="1"
        />

        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />

        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          fill={strokeColor}
          className="animate-pulse"
        />
      </svg>
      <div className="flex justify-between text-[9px] font-mono text-zinc-500 pt-0.5">
        <span>24h ago</span>
        <span>
          Avg: {Math.round(values.reduce((a, b) => a + b, 0) / values.length)}ms
        </span>
        <span>Latest: {lastPoint?.responseTimeMs}ms</span>
      </div>
    </div>
  );
}

export default function DkSitesMonitoringPage() {
  const [data, setData] = useState<FleetOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // 30s default
  const [countdown, setCountdown] = useState<number>(30);

  const fetchFleetData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dk-sites", { cache: "no-store" });
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
      const res = await fetch("/api/dk-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const categories = ["All", "KL University", "ISKCON Community"];

  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 pt-24 pb-20 space-y-8">
        {/* Top Header */}
        <header className="border-b border-zinc-800/80 pb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]" />
                <span className="font-mono text-xs text-[#00ff66] uppercase tracking-widest font-semibold">
                  PRIVATE FLEET RADAR :: /DK-SITES
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Live Uptime &amp; Latency Monitor
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl font-mono">
                Real-time continuous health monitoring, 24h latency tracking,
                and SSL expiration alerts for the designated 7 core domains.
              </p>
            </div>

            {/* Top Right Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Auto Refresh Selector */}
              <div className="flex items-center gap-1.5 border border-zinc-800 bg-[#0d0d0f] rounded px-3 py-1.5 text-xs font-mono text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Auto-refresh:</span>
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
                <span>
                  {probing ? "Probing Fleet..." : "Run Instant Check"}
                </span>
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
                {data.summary.downSites > 0
                  ? `${data.summary.downSites} site(s) offline`
                  : data.summary.degradedSites > 0
                    ? `${data.summary.degradedSites} site(s) degraded`
                    : "All systems healthy"}
              </p>
            </div>

            {/* KPI 2: Fleet 24h Uptime */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>24h Avg Uptime</span>
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                {data.summary.fleetUptime24h}%
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Target: &gt;99.90% SLA
              </p>
            </div>

            {/* KPI 3: Fleet Latency */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>Avg Latency</span>
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white font-mono">
                {data.summary.fleetAvgResponseTimeMs !== null
                  ? `${data.summary.fleetAvgResponseTimeMs} ms`
                  : "--"}
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Fleet global response time
              </p>
            </div>

            {/* KPI 4: Active Incidents */}
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded space-y-1.5">
              <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono uppercase">
                <span>Active Outages</span>
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
                  : "Requires immediate attention"}
              </p>
            </div>
          </section>
        )}

        {/* Filter Tabs */}
        <section className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1" />
            {categories.map((cat) => (
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
          <div className="text-zinc-500 text-xs font-mono">
            Showing {filteredSites.length} of {data?.summary.totalSites ?? 7}{" "}
            sites
          </div>
        </section>

        {/* Site Cards Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3 font-mono">
            <RefreshCw className="w-6 h-6 text-[#00ff66] animate-spin mx-auto" />
            <p className="text-zinc-400 text-xs">
              Pinging fleet targets &amp; fetching latency curves...
            </p>
          </div>
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
                  {/* Top Bar: Name, Category, Status Badge */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 mb-1.5">
                          {site.category}
                        </span>
                        <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                          <span>{site.name}</span>
                        </h2>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-mono text-zinc-400 hover:text-[#00ff66] transition-colors inline-flex items-center gap-1 mt-0.5"
                        >
                          <span>{site.url}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      {/* Status Badge */}
                      <div
                        className={`px-2.5 py-1 rounded border text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${statusColor}`}
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
                        HTTP Code
                      </div>
                      <div className="text-sm sm:text-base font-mono font-bold text-zinc-200">
                        {site.statusCode ?? "--"}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">
                        24h / 30d Uptime
                      </div>
                      <div className="text-sm sm:text-base font-mono font-bold text-zinc-200">
                        {site.uptimePercentage24h}%
                      </div>
                    </div>
                  </div>

                  {/* 24-Hour Sparkline Graph */}
                  <MiniSparkline
                    history={site.responseTimeHistory24h}
                    status={site.status}
                  />

                  {/* Bottom Footer: SSL Status & Deep Dive Link */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
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
                          ? `SSL: ${site.certDaysRemaining} days valid`
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

      <Footer />
    </div>
  );
}
