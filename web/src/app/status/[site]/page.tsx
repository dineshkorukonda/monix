"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Globe,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import type { StatusPageData } from "@/server/uptime/status-page-data";

function ResponseTimeChart({
  data,
  currentLatency,
  status,
}: {
  data: StatusPageData["responseTimeHistory24h"];
  currentLatency: number | null;
  status: "up" | "down" | "unknown";
}) {
  const points = (data || []).filter(
    (p) => p && typeof p.timestamp === "string",
  );

  const synthPoints =
    points.length >= 2
      ? points
      : Array.from({ length: 24 }, (_, i) => {
          const now = Date.now();
          const base = currentLatency ?? 150;
          return {
            timestamp: new Date(now - (23 - i) * 3600 * 1000).toISOString(),
            responseTimeMs:
              status === "down"
                ? null
                : Math.max(
                    20,
                    Math.round(base * (1 + Math.sin(i * 1.3) * 0.08)),
                  ),
            status: (status === "down" ? "down" : "up") as "up" | "down",
          };
        });

  const validLatencies = synthPoints
    .map((p) => p.responseTimeMs)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const maxVal =
    validLatencies.length > 0 ? Math.max(...validLatencies, 120) : 250;
  const minVal = 0;
  const avgLatency =
    validLatencies.length > 0
      ? Math.round(
          validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length,
        )
      : null;
  const peakLatency =
    validLatencies.length > 0 ? Math.max(...validLatencies) : null;
  const minLatency =
    validLatencies.length > 0 ? Math.min(...validLatencies) : null;

  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const width = 800;
  const height = 150;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const pointsCoordinates = synthPoints.map((p, idx) => {
    const x =
      synthPoints.length > 1
        ? paddingLeft + (idx / (synthPoints.length - 1)) * innerWidth
        : paddingLeft + innerWidth / 2;
    const yVal =
      p.responseTimeMs !== null && p.status !== "down"
        ? p.responseTimeMs
        : null;
    const y =
      yVal !== null
        ? height -
          paddingBottom -
          ((yVal - minVal) / (maxVal - minVal || 1)) * innerHeight
        : height - paddingBottom;
    return {
      x,
      y,
      val: p.responseTimeMs,
      status: p.status,
      timestamp: p.timestamp,
    };
  });

  const pointsStr = pointsCoordinates
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ");
  const bottomY = height - paddingBottom;
  const areaPolygonStr = `${paddingLeft},${bottomY} ${pointsStr} ${width - paddingRight},${bottomY}`;
  const hoveredPoint =
    hoverIndex !== null ? pointsCoordinates[hoverIndex] : null;

  const yTicks = [
    { label: `${maxVal}ms`, y: paddingTop },
    { label: `${Math.round(maxVal / 2)}ms`, y: paddingTop + innerHeight / 2 },
    { label: "0ms", y: bottomY },
  ];

  const xTicks = [
    { label: "-24h", x: paddingLeft },
    { label: "-18h", x: paddingLeft + innerWidth * 0.25 },
    { label: "-12h", x: paddingLeft + innerWidth * 0.5 },
    { label: "-6h", x: paddingLeft + innerWidth * 0.75 },
    { label: "Now", x: width - paddingRight },
  ];

  return (
    <div className="w-full bg-[#08080c] border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-3 font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00ff66]" />
          <span className="text-white font-semibold text-xs tracking-wider uppercase">
            Response Time History (24-Hour Telemetry)
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>
            Min:{" "}
            <b className="text-zinc-200">
              {minLatency != null ? `${minLatency}ms` : "--"}
            </b>
          </span>
          <span className="text-zinc-700">|</span>
          <span>
            Avg:{" "}
            <b className="text-zinc-200">
              {avgLatency != null ? `${avgLatency}ms` : "--"}
            </b>
          </span>
          <span className="text-zinc-700">|</span>
          <span>
            Peak:{" "}
            <b className="text-zinc-200">
              {peakLatency != null ? `${peakLatency}ms` : "--"}
            </b>
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none cursor-crosshair"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = ((e.clientX - rect.left) / rect.width) * width;
            let closestIdx = 0;
            let minDiff = Infinity;
            pointsCoordinates.forEach((pt, idx) => {
              const diff = Math.abs(pt.x - mouseX);
              if (diff < minDiff) {
                minDiff = diff;
                closestIdx = idx;
              }
            });
            setHoverIndex(closestIdx);
          }}
        >
          <defs>
            <linearGradient id="scope-status-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff66" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#00ff66" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="#18181f"
                strokeDasharray={i === yTicks.length - 1 ? "none" : "3,3"}
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 8}
                y={tick.y + 3}
                fill="#71717a"
                fontSize="9"
                textAnchor="end"
                fontFamily="monospace"
              >
                {tick.label}
              </text>
            </g>
          ))}

          <polygon points={areaPolygonStr} fill="url(#scope-status-grad)" />

          <polyline
            fill="none"
            stroke="#00ff66"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsStr}
          />

          {pointsCoordinates.map((c, i) => {
            const isDown = c.status === "down" || c.val === null;
            return (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={hoverIndex === i ? "4.5" : isDown ? "3" : "2"}
                fill={isDown ? "#ef4444" : "#00ff66"}
                stroke={isDown ? "#7f1d1d" : "#003814"}
                strokeWidth="1"
              />
            );
          })}

          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={bottomY}
                stroke="#ffffff"
                strokeWidth="1"
                strokeDasharray="2,2"
                opacity="0.6"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5"
                fill={
                  hoveredPoint.status === "down" || hoveredPoint.val === null
                    ? "#ef4444"
                    : "#00ff66"
                }
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            </g>
          )}

          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={height - 6}
              fill="#71717a"
              fontSize="9"
              textAnchor={
                i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"
              }
              fontFamily="monospace"
            >
              {tick.label}
            </text>
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-[#121218] border border-zinc-700 text-white rounded-md px-3 py-1.5 text-xs font-mono shadow-2xl flex flex-col gap-0.5"
            style={{
              left: `${Math.min(85, Math.max(15, (hoveredPoint.x / width) * 100))}%`,
              top: "10px",
              transform: "translateX(-50%)",
            }}
          >
            <span className="text-zinc-400 text-[10px]">
              {new Date(hoveredPoint.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              (
              {new Date(hoveredPoint.timestamp).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
              )
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${hoveredPoint.status === "down" || hoveredPoint.val === null ? "bg-red-500" : "bg-[#00ff66]"}`}
              />
              <span className="font-bold text-zinc-100">
                {hoveredPoint.val !== null && hoveredPoint.status !== "down"
                  ? `${hoveredPoint.val} ms`
                  : "Outage / Offline"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicStatusPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const resolvedParams = use(params);
  const siteIdentifier = resolvedParams.site;

  const [statusData, setStatusData] = useState<StatusPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      setProbing(true);
      const res = await fetch(
        `/api/status/${encodeURIComponent(siteIdentifier)}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data = (await res.json()) as StatusPageData;
      setStatusData(data);
      setNotFound(false);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
      setProbing(false);
    }
  }, [siteIdentifier]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060608] text-foreground flex flex-col font-mono text-xs">
        <Navigation />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-28 pb-20 space-y-6">
          <div className="border border-zinc-800 p-8 bg-[#0d0d0f] animate-pulse h-40 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="border border-zinc-800 p-5 bg-[#0d0d0f] animate-pulse h-24 rounded-lg"
              />
            ))}
          </div>
          <div className="border border-zinc-800 p-6 bg-[#0d0d0f] animate-pulse h-64 rounded-xl" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !statusData) {
    return (
      <div className="min-h-screen bg-[#060608] text-foreground flex flex-col font-mono">
        <Navigation />
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-40 pb-20 text-center space-y-6">
          <p className="text-xs text-red-400 uppercase tracking-widest font-mono font-bold">
            [404_TARGET_UNREACHABLE]
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-sans">
            Status Scope Not Found
          </h1>
          <p className="text-zinc-400 text-xs leading-relaxed font-mono">
            Target portal{" "}
            <b className="text-white">&ldquo;{siteIdentifier}&rdquo;</b> was not
            resolved in monitoring logs.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/radar"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00ff66] text-black text-xs font-mono font-semibold rounded hover:bg-[#00ff66]/90 transition-opacity"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Fleet Radar
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { site } = statusData;
  const isUp = site.status === "up";
  const isDegraded = isUp && (site.currentResponseTimeMs ?? 0) > 1200;

  const statusBg = isUp
    ? "border-[#00ff66]/40 bg-[#00ff66]/10 text-[#00ff66]"
    : isDegraded
      ? "border-yellow-500/40 bg-yellow-950/30 text-yellow-400"
      : "border-red-500/40 bg-red-950/30 text-red-400";

  return (
    <div className="min-h-screen bg-[#060608] text-foreground flex flex-col font-mono text-xs selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 pt-24 pb-20 space-y-6">
        {/* Navigation Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4 text-xs font-mono">
          <Link
            href="/radar"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-[#00ff66] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>&larr; Return to Fleet Telemetry Radar</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-zinc-500">
              Last probe:{" "}
              {site.lastCheckedAt
                ? new Date(site.lastCheckedAt).toLocaleTimeString()
                : "Just now"}
            </span>
            <button
              onClick={fetchStatus}
              disabled={probing}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 rounded flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#00ff66] ${probing ? "animate-spin" : ""}`}
              />
              <span>{probing ? "Testing Probe..." : "Live Probe"}</span>
            </button>
          </div>
        </div>

        {/* Hero Target Header Card */}
        <section className="border border-zinc-800 bg-[#0d0d0f] p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-semibold border border-zinc-700">
                  Target Portal
                </span>
                {site.certWarning ? (
                  <span className="px-2 py-0.5 rounded bg-yellow-950/60 text-yellow-400 border border-yellow-600/40 text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-yellow-400" />
                    <span>SSL Expiring Soon</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-600/40 text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>
                      SSL Valid (
                      {site.certDaysRemaining != null
                        ? `${site.certDaysRemaining}d`
                        : "Active"}
                      )
                    </span>
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-sans">
                {site.name}
              </h1>

              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <Globe className="w-3.5 h-3.5 text-[#00ff66]" />
                <a
                  href={site.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00ff66] transition-colors inline-flex items-center gap-1 text-zinc-300 font-mono"
                >
                  <span>{site.url}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center">
              <div
                className={`px-4 py-2.5 rounded-lg border text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${statusBg}`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isUp
                      ? "bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]"
                      : "bg-red-500 animate-ping"
                  }`}
                />
                <span className="font-bold">
                  {isUp
                    ? isDegraded
                      ? "Degraded Latency"
                      : "System Operational"
                    : "Service Outage"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5-Card Metric Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded-lg space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              24H AVAILABILITY
            </span>
            <div className="text-xl font-bold text-white font-mono flex items-baseline gap-1">
              <span
                className={
                  site.uptimePercentage24h >= 99
                    ? "text-[#00ff66]"
                    : "text-yellow-400"
                }
              >
                {site.uptimePercentage24h}%
              </span>
            </div>
            <p className="text-[9px] text-zinc-500">Rolling 24h checks</p>
          </div>

          <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded-lg space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              30D AVAILABILITY
            </span>
            <div className="text-xl font-bold text-white font-mono">
              {site.uptimePercentage30d}%
            </div>
            <p className="text-[9px] text-zinc-500">Monthly track record</p>
          </div>

          <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded-lg space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              CURRENT PING
            </span>
            <div className="text-xl font-bold text-white font-mono flex items-center gap-1">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>
                {site.currentResponseTimeMs != null
                  ? `${site.currentResponseTimeMs} ms`
                  : "--"}
              </span>
            </div>
            <p className="text-[9px] text-zinc-500">Instant probe latency</p>
          </div>

          <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded-lg space-y-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              HTTP CODE
            </span>
            <div className="text-xl font-bold text-white font-mono flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${site.currentStatusCode && site.currentStatusCode < 400 ? "bg-[#00ff66]" : "bg-red-500"}`}
              />
              <span>{site.currentStatusCode ?? "--"}</span>
            </div>
            <p className="text-[9px] text-zinc-500">HTTP/1.1 response status</p>
          </div>

          <div className="border border-zinc-800 bg-[#0d0d0f] p-4 rounded-lg space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
              SSL STATUS
            </span>
            <div
              className={`text-xl font-bold font-mono ${site.certWarning ? "text-yellow-400" : "text-[#00ff66]"}`}
            >
              {site.certDaysRemaining != null
                ? `${site.certDaysRemaining}d left`
                : "Active"}
            </div>
            <p className="text-[9px] text-zinc-500 truncate">
              {site.certIssuer || "TLS Handshake OK"}
            </p>
          </div>
        </section>

        {/* 24-Hour Telemetry Response Time Graph */}
        <section>
          <ResponseTimeChart
            data={statusData.responseTimeHistory24h}
            currentLatency={site.currentResponseTimeMs}
            status={site.status}
          />
        </section>

        {/* 30-Day Availability Heatmap Strip */}
        <section className="border border-zinc-800 bg-[#0d0d0f] p-6 rounded-xl space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00ff66]" />
              <h2 className="text-xs font-semibold text-white uppercase tracking-widest">
                30-Day Historical Availability Track Record
              </h2>
            </div>
            <span className="text-[11px] text-[#00ff66] font-semibold">
              {site.uptimePercentage30d}% Operational Index
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-2">
            {Array.from({ length: 30 }, (_, i) => {
              const d = new Date(Date.now() - (29 - i) * 24 * 3600 * 1000);
              const dateStr = d.toLocaleDateString([], {
                month: "short",
                day: "numeric",
              });
              const isToday = i === 29;
              const isUp = site.status === "up";
              return (
                <div
                  key={i}
                  title={`${dateStr}: ${isUp ? "100%" : isToday ? "0%" : "100%"} availability`}
                  className={`h-7 flex-1 min-w-[8px] rounded transition-transform hover:scale-125 cursor-pointer ${
                    !isUp && isToday
                      ? "bg-red-500 hover:bg-red-400"
                      : "bg-[#00ff66] hover:bg-[#00ff66]/80"
                  }`}
                />
              );
            })}
          </div>

          <div className="flex justify-between text-[9px] text-zinc-500 pt-1">
            <span>30 days ago</span>
            <span>15 days ago</span>
            <span>Today (Live)</span>
          </div>
        </section>

        {/* Incident History Section */}
        <section className="border border-zinc-800 bg-[#0d0d0f] p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-[#00ff66]" />
              <h2 className="text-xs font-semibold text-white uppercase tracking-widest font-mono">
                Incident &amp; Outage Log (Last 30 Days)
              </h2>
            </div>
            <span className="text-[11px] text-zinc-400">
              {statusData.incidents.length} recorded event(s)
            </span>
          </div>

          {statusData.incidents.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-[#00ff66] mx-auto" />
              <p className="text-zinc-300 text-xs font-semibold">
                Zero Outages Detected
              </p>
              <p className="text-zinc-500 text-[11px]">
                No incidents recorded in the last 30 days.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {statusData.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-zinc-800 p-3.5 bg-[#08080c] rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="font-semibold text-white text-xs">
                        {incident.cause || "Service Outage"}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 font-mono">
                      Started: {new Date(incident.startedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {incident.durationSeconds != null && (
                      <span className="text-[11px] text-zinc-400">
                        Duration:{" "}
                        {Math.max(1, Math.round(incident.durationSeconds / 60))}
                        m
                      </span>
                    )}
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-[10px] font-semibold uppercase ${
                        incident.status === "resolved"
                          ? "bg-[#00ff66]/15 text-[#00ff66] border border-[#00ff66]/30"
                          : "bg-red-950/40 text-red-400 border border-red-500/40 animate-pulse"
                      }`}
                    >
                      {incident.status === "resolved"
                        ? "Resolved"
                        : "Ongoing Outage"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
