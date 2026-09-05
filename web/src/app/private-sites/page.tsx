"use client";

import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Globe,
  KeyRound,
  LayoutGrid,
  LineChart,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Table as TableIcon,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import type {
  DailyAvailabilityTile,
  FleetOverviewData,
  FleetSiteTelemetry,
  HourlyUptimeSlot,
  NightlyDowntimeConfig,
} from "@/server/fleet/private-sites-service";

/* -------------------------------------------------------------------------- */
/*                     Client-side Nightly Maintenance Helper                 */
/* -------------------------------------------------------------------------- */
function isTimestampInNightlyDowntime(
  timestamp: string | Date,
  config?: NightlyDowntimeConfig,
): boolean {
  if (!config || !config.enabled) return false;
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  if (Number.isNaN(date.getTime())) return false;

  const offsetMs = (config.timezoneOffsetHours ?? 5.5) * 60 * 60 * 1000;
  const localDate = new Date(date.getTime() + offsetMs);
  const currentMinutes =
    localDate.getUTCHours() * 60 + localDate.getUTCMinutes();

  const startMinutes = config.startHour * 60 + (config.startMinute ?? 0);
  const endMinutes = config.endHour * 60 + (config.endMinute ?? 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

/* -------------------------------------------------------------------------- */
/*                     Standard Clean Latency Line Graph                     */
/* -------------------------------------------------------------------------- */
function StandardLatencyGraph({
  history,
  status,
  currentLatency,
  timeRange = "24h",
  nightlyDowntime,
  isModal = false,
}: {
  history: FleetSiteTelemetry["responseTimeHistory24h"];
  status: FleetSiteTelemetry["status"];
  currentLatency: number | null;
  timeRange?: "24h" | "7d" | "30d";
  nightlyDowntime?: FleetSiteTelemetry["nightlyDowntime"];
  isModal?: boolean;
}) {
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = useMemo(() => {
    const valid = (history || []).filter(
      (
        p,
      ): p is {
        timestamp: string;
        responseTimeMs: number | null;
        status: "up" | "down";
      } => p && typeof p.timestamp === "string",
    );

    if (valid.length >= 2) return valid;

    const base = currentLatency ?? 150;
    const now = Date.now();
    return Array.from({ length: 24 }, (_, i) => {
      const ts = new Date(now - (23 - i) * 60 * 60 * 1000).toISOString();
      const inNight = isTimestampInNightlyDowntime(ts, nightlyDowntime);
      if (inNight) {
        return {
          timestamp: ts,
          responseTimeMs: null,
          status: "down" as const,
        };
      }
      return {
        timestamp: ts,
        responseTimeMs:
          status === "down"
            ? null
            : Math.max(20, Math.round(base * (1 + Math.sin(i * 1.5) * 0.08))),
        status: (status === "down" ? "down" : "up") as "up" | "down",
      };
    });
  }, [history, currentLatency, status, nightlyDowntime]);

  const validLatencies = points
    .map((p) => p.responseTimeMs)
    .filter((v): v is number => typeof v === "number" && v > 0);

  const maxVal =
    validLatencies.length > 0 ? Math.max(...validLatencies, 100) : 250;
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

  const width = isModal ? 640 : 420;
  const height = isModal ? 130 : 88;
  const paddingLeft = 40;
  const paddingRight = 14;
  const paddingTop = 12;
  const paddingBottom = 20;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  const pointsCoordinates = points.map((p, idx) => {
    const x =
      points.length > 1
        ? paddingLeft + (idx / (points.length - 1)) * innerWidth
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

  const firstX = paddingLeft;
  const lastX = width - paddingRight;
  const bottomY = height - paddingBottom;
  const areaPolygonStr = `${firstX},${bottomY} ${pointsStr} ${lastX},${bottomY}`;

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
    <div className="w-full bg-[#0a0a0e] border border-zinc-800/80 rounded-lg p-3 space-y-2 font-mono">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] border-b border-zinc-850 pb-1.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                status === "up"
                  ? "bg-[#00ff66]"
                  : status === "degraded"
                    ? "bg-yellow-400"
                    : "bg-red-500"
              }`}
            />
            <span className="text-zinc-200 font-semibold text-xs">
              Response Time ({timeRange})
            </span>
          </div>
          {nightlyDowntime?.enabled && (
            <span className="px-1.5 py-0.2 rounded bg-zinc-850 text-zinc-400 text-[9px] border border-zinc-700/60">
              Nightly Maint: {nightlyDowntime.startHour}:
              {(nightlyDowntime.startMinute ?? 0).toString().padStart(2, "0")} -{" "}
              {nightlyDowntime.endHour}:
              {(nightlyDowntime.endMinute ?? 0).toString().padStart(2, "0")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <span>
            Min:{" "}
            <b className="text-zinc-300">
              {minLatency !== null ? `${minLatency}ms` : "--"}
            </b>
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            Avg:{" "}
            <b className="text-zinc-300">
              {avgLatency !== null ? `${avgLatency}ms` : "--"}
            </b>
          </span>
          <span className="text-zinc-600">|</span>
          <span>
            Peak:{" "}
            <b className="text-zinc-300">
              {peakLatency !== null ? `${peakLatency}ms` : "--"}
            </b>
          </span>
        </div>
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full">
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
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ff66" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#00ff66" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines & Y-Axis Labels */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={tick.y}
                x2={width - paddingRight}
                y2={tick.y}
                stroke="#1c1c22"
                strokeDasharray={i === yTicks.length - 1 ? "none" : "3,3"}
                strokeWidth="1"
              />
              <text
                x={paddingLeft - 6}
                y={tick.y + 3}
                fill="#71717a"
                fontSize="7.5"
                textAnchor="end"
                fontFamily="monospace"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Fill Area Under Curve */}
          <polygon points={areaPolygonStr} fill={`url(#${gradientId})`} />

          {/* Continuous Baseline Stroke */}
          <polyline
            fill="none"
            stroke="#00ff66"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsStr}
          />

          {/* Data Points */}
          {pointsCoordinates.map((c, i) => {
            const isDown = c.status === "down" || c.val === null;
            return (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={hoverIndex === i ? "3.5" : isDown ? "2.2" : "1.8"}
                fill={isDown ? "#ef4444" : "#00ff66"}
                stroke={isDown ? "#7f1d1d" : "#003814"}
                strokeWidth="0.8"
                className="transition-all"
              />
            );
          })}

          {/* Active Hover Crosshair Guideline */}
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
                r="4.5"
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

          {/* X-Axis Labels */}
          {xTicks.map((tick, i) => (
            <text
              key={i}
              x={tick.x}
              y={height - 4}
              fill="#71717a"
              fontSize="7.5"
              textAnchor={
                i === 0 ? "start" : i === xTicks.length - 1 ? "end" : "middle"
              }
              fontFamily="monospace"
            >
              {tick.label}
            </text>
          ))}
        </svg>

        {/* Hover Tooltip Overlay Card */}
        {hoveredPoint && (
          <div
            className="absolute z-20 pointer-events-none bg-[#121218] border border-zinc-700 text-white rounded px-2.5 py-1.5 text-[10px] font-mono shadow-xl flex flex-col gap-0.5"
            style={{
              left: `${Math.min(80, Math.max(12, (hoveredPoint.x / width) * 100))}%`,
              top: "-6px",
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="text-zinc-400 text-[9px]">
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
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  hoveredPoint.status === "down" || hoveredPoint.val === null
                    ? "bg-red-500"
                    : "bg-[#00ff66]"
                }`}
              />
              <span className="font-semibold text-zinc-100">
                {hoveredPoint.val !== null && hoveredPoint.status !== "down"
                  ? `${hoveredPoint.val} ms`
                  : isTimestampInNightlyDowntime(
                        hoveredPoint.timestamp,
                        nightlyDowntime,
                      )
                    ? "Nightly Offline Window"
                    : "Outage / Down"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Info */}
      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500 pt-0.5 border-t border-zinc-900">
        <span className="text-zinc-400">
          Current Live Probe:{" "}
          <b className="text-white">
            {currentLatency !== null
              ? `${currentLatency} ms`
              : status === "down"
                ? "Down"
                : "--"}
          </b>
        </span>
        <span className="text-zinc-500">
          Status:{" "}
          <b
            className={
              status === "up"
                ? "text-emerald-400"
                : status === "degraded"
                  ? "text-yellow-400"
                  : "text-red-400"
            }
          >
            {status.toUpperCase()}
          </b>
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
/*                     24-Hour Hour-by-Hour Matrix Component                  */
/* -------------------------------------------------------------------------- */
function HourlyUptimeMatrix({
  slots,
  onSelectSlot,
  selectedSlot,
}: {
  slots: HourlyUptimeSlot[];
  onSelectSlot?: (slot: HourlyUptimeSlot) => void;
  selectedSlot?: HourlyUptimeSlot | null;
}) {
  if (!slots || slots.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#00ff66]" />
          <span className="text-white font-semibold uppercase tracking-wider">
            24-Hour Hour-by-Hour Timeline Breakdown
          </span>
        </div>
        <span className="text-[11px] text-zinc-400">
          Click any hour to inspect
        </span>
      </div>

      {/* 24-Block Matrix Grid */}
      <div className="grid grid-cols-12 sm:grid-cols-24 gap-1.5 p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg">
        {slots.map((slot) => {
          const isSelected = selectedSlot?.hourIndex === slot.hourIndex;
          const bg =
            slot.status === "up"
              ? "bg-[#00ff66]/80 hover:bg-[#00ff66]"
              : slot.status === "degraded"
                ? "bg-yellow-400 hover:bg-yellow-300"
                : slot.status === "down"
                  ? "bg-red-500 hover:bg-red-400"
                  : "bg-zinc-800";

          return (
            <button
              key={slot.hourIndex}
              type="button"
              onClick={() => onSelectSlot?.(slot)}
              title={`${slot.timeLabel}: ${slot.uptimePercent}% uptime (${slot.avgLatencyMs ? `${slot.avgLatencyMs}ms` : "down"})`}
              className={`h-10 rounded flex flex-col items-center justify-between py-1 transition-all cursor-pointer ${bg} ${
                isSelected ? "ring-2 ring-white scale-110 z-10" : ""
              }`}
            >
              <span className="text-[8px] font-mono font-bold text-black opacity-80">
                {slot.timeLabel.split(":")[0]}h
              </span>
              <span className="text-[7px] font-mono text-black font-semibold">
                {slot.uptimePercent}%
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-[9px] font-mono text-zinc-500 px-1">
        <span>24h ago</span>
        <span>12h ago</span>
        <span>Current Hour</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                     Multi-Site Fleet Comparison Chart                      */
/* -------------------------------------------------------------------------- */
function FleetComparisonTimeline({
  sites,
  onSelectSite,
}: {
  sites: FleetSiteTelemetry[];
  onSelectSite?: (site: FleetSiteTelemetry) => void;
}) {
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

      <div className="flex flex-wrap gap-3 text-[11px] font-mono">
        {sites.map((site, i) => (
          <button
            key={site.slug}
            type="button"
            onClick={() => onSelectSite?.(site)}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left"
          >
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
          </button>
        ))}
      </div>

      <div className="space-y-2 pt-2">
        {sites.map((site, i) => {
          const lat = site.currentResponseTimeMs ?? 0;
          const pct = Math.min(100, Math.max(2, (lat / maxVal) * 100));
          const col = colors[i % colors.length];

          return (
            <button
              key={site.slug}
              type="button"
              onClick={() => onSelectSite?.(site)}
              className="w-full text-left space-y-1 font-mono text-xs cursor-pointer hover:bg-zinc-900/60 p-1.5 rounded transition-colors"
            >
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
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Site Deep-Dive Inspection Drawer                     */
/* -------------------------------------------------------------------------- */
function SiteDetailModal({
  site,
  onClose,
  onProbeSingle,
}: {
  site: FleetSiteTelemetry;
  onClose: () => void;
  onProbeSingle?: (site: FleetSiteTelemetry) => Promise<void>;
}) {
  const [selectedHourlySlot, setSelectedHourlySlot] =
    useState<HourlyUptimeSlot | null>(
      site.hourlySlots24h?.[site.hourlySlots24h.length - 1] ?? null,
    );
  const [probingThis, setProbingThis] = useState(false);

  const isUp = site.status === "up";
  const isDegraded = site.status === "degraded";
  const statusColor = isUp
    ? "text-[#00ff66] border-[#00ff66]/30 bg-[#00ff66]/10"
    : isDegraded
      ? "text-yellow-400 border-yellow-500/30 bg-yellow-950/20"
      : "text-red-400 border-red-500/30 bg-red-950/20";

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleProbe = async () => {
    if (!onProbeSingle) return;
    setProbingThis(true);
    try {
      await onProbeSingle(site);
    } finally {
      setProbingThis(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 font-mono overflow-y-auto"
    >
      {/* Clickable Backdrop Dismiss */}
      <button
        type="button"
        aria-label="Close inspection dialog"
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md cursor-pointer border-0 w-full h-full p-0 m-0"
      />

      <div className="bg-[#0b0b0f] border border-zinc-750 rounded-xl max-w-3xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto cursor-default relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 font-semibold border border-zinc-700">
                {site.category}
              </span>
              <div
                className={`px-2.5 py-0.5 rounded border text-[10px] font-semibold uppercase flex items-center gap-1.5 ${statusColor}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isUp
                      ? "bg-[#00ff66] animate-pulse"
                      : isDegraded
                        ? "bg-yellow-400"
                        : "bg-red-500 animate-ping"
                  }`}
                />
                <span>
                  {isUp ? "Operational" : isDegraded ? "Degraded" : "Outage"}
                </span>
              </div>
              {site.isLoginProtected && (
                <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-600/40 text-[10px] font-semibold flex items-center gap-1">
                  <KeyRound className="w-3 h-3" />
                  <span>{site.loginPortalType || "Auth Protected"}</span>
                </span>
              )}
              {site.nightlyDowntime?.enabled && (
                <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-600/40 text-[10px] font-semibold flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>
                    Nightly Maint: {site.nightlyDowntime.startHour}:
                    {(site.nightlyDowntime.startMinute ?? 0)
                      .toString()
                      .padStart(2, "0")}{" "}
                    - {site.nightlyDowntime.endHour}:
                    {(site.nightlyDowntime.endMinute ?? 0)
                      .toString()
                      .padStart(2, "0")}{" "}
                    IST
                  </span>
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {site.name}
            </h2>

            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#00ff66] transition-colors inline-flex items-center gap-1"
              >
                <span>{site.url}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {site.finalUrl && site.finalUrl !== site.url && (
                <span className="text-zinc-500 text-[11px] truncate max-w-sm">
                  &rarr; {site.finalUrl}
                </span>
              )}
            </div>
          </div>

          {/* Close & Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleProbe}
              disabled={probingThis}
              className="px-3 py-1.5 bg-[#00ff66] hover:bg-[#00ff66]/90 text-black text-xs font-semibold rounded flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${probingThis ? "animate-spin" : ""}`}
              />
              <span>{probingThis ? "Probing..." : "Ping Now"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Close (Esc)"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick KPI Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#111116] border border-zinc-800 rounded space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase">
              24h Uptime
            </div>
            <div className="text-lg font-bold text-white">
              {site.uptimePercentage24h}%
            </div>
            <div className="text-[9px] text-zinc-400">
              7d: {site.uptimePercentage7d}% | 30d: {site.uptimePercentage30d}%
            </div>
          </div>

          <div className="p-3 bg-[#111116] border border-zinc-800 rounded space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase">Latency</div>
            <div className="text-lg font-bold text-[#00ff66]">
              {site.currentResponseTimeMs !== null
                ? `${site.currentResponseTimeMs} ms`
                : "--"}
            </div>
            <div className="text-[9px] text-zinc-400">
              Avg: {site.avgResponseTimeMs24h ?? "--"} ms
            </div>
          </div>

          <div className="p-3 bg-[#111116] border border-zinc-800 rounded space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase">HTTP Code</div>
            <div className="text-lg font-bold text-zinc-200">
              {site.statusCode ?? "ERR"}
            </div>
            <div className="text-[9px] text-zinc-400">
              {site.statusCode === 200
                ? "200 OK"
                : site.statusCode === 403
                  ? "403 Forbidden"
                  : site.statusCode === 500
                    ? "500 Internal Error"
                    : `Status ${site.statusCode || "Timeout"}`}
            </div>
          </div>

          <div className="p-3 bg-[#111116] border border-zinc-800 rounded space-y-1">
            <div className="text-[10px] text-zinc-500 uppercase">
              SSL Certificate
            </div>
            <div
              className={`text-lg font-bold ${
                site.certWarning ? "text-yellow-400" : "text-emerald-400"
              }`}
            >
              {site.certDaysRemaining !== null
                ? `${site.certDaysRemaining} Days`
                : "Active"}
            </div>
            <div className="text-[9px] text-zinc-400 truncate">
              {site.certIssuer || "TLS Verified"}
            </div>
          </div>
        </div>

        {/* Deep Dive Normal Latency Chart */}
        <div className="space-y-2 pt-2 border-t border-zinc-800/80">
          <StandardLatencyGraph
            history={site.responseTimeHistory24h}
            status={site.status}
            currentLatency={site.currentResponseTimeMs}
            timeRange="24h"
            nightlyDowntime={site.nightlyDowntime}
            isModal={true}
          />
        </div>

        {/* 24-Hour Hour-by-Hour Timeline Matrix */}
        <div className="space-y-4 pt-2 border-t border-zinc-800/80">
          <HourlyUptimeMatrix
            slots={site.hourlySlots24h}
            onSelectSlot={setSelectedHourlySlot}
            selectedSlot={selectedHourlySlot}
          />

          {/* Selected Hour Inspector Box */}
          {selectedHourlySlot && (
            <div className="p-3.5 bg-[#121218] border border-zinc-700/70 rounded-lg space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#00ff66]" />
                  <span>Hour Slot: {selectedHourlySlot.timeLabel}</span>
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    selectedHourlySlot.status === "up"
                      ? "bg-[#00ff66]/20 text-[#00ff66]"
                      : selectedHourlySlot.status === "degraded"
                        ? "bg-yellow-950 text-yellow-400"
                        : "bg-red-950 text-red-400"
                  }`}
                >
                  {selectedHourlySlot.uptimePercent}% Uptime (
                  {selectedHourlySlot.status})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-400 pt-1">
                <div>
                  Checks:{" "}
                  <b className="text-white">{selectedHourlySlot.totalChecks}</b>
                </div>
                <div>
                  Passed:{" "}
                  <b className="text-emerald-400">
                    {selectedHourlySlot.successfulChecks}
                  </b>
                </div>
                <div>
                  Failed:{" "}
                  <b className="text-red-400">
                    {selectedHourlySlot.failedChecks}
                  </b>
                </div>
                <div>
                  Latency:{" "}
                  <b className="text-white">
                    {selectedHourlySlot.avgLatencyMs
                      ? `${selectedHourlySlot.avgLatencyMs} ms`
                      : "--"}
                  </b>
                </div>
              </div>

              {selectedHourlySlot.errorMessages &&
                selectedHourlySlot.errorMessages.length > 0 && (
                  <div className="pt-1.5 border-t border-zinc-800 text-red-400 text-[11px] flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Errors logged in this hour:{" "}
                      {selectedHourlySlot.errorMessages.join(", ")}
                    </span>
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Downtime & Incident Summary Log */}
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <AlertOctagon className="w-4 h-4 text-red-400" />
              <span>Downtime &amp; Incident History (Last 30 Days)</span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {site.incidentsHistory.length} incident(s) recorded
            </span>
          </div>

          {site.incidentsHistory.length === 0 ? (
            <div className="p-4 bg-[#0a0a0d] border border-zinc-800/80 rounded-lg text-xs text-zinc-400 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
              <span>
                Zero outages or disruptions recorded for this portal across the
                observed window.
              </span>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {site.incidentsHistory.map((inc) => (
                <div
                  key={inc.id}
                  className="p-3 bg-[#111116] border border-zinc-800 rounded-lg flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          inc.status === "ongoing"
                            ? "bg-red-950 text-red-400 border border-red-500/50 animate-pulse"
                            : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {inc.status === "ongoing"
                          ? "Active Outage"
                          : "Resolved"}
                      </span>
                      <span className="text-white font-semibold">
                        {inc.cause}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-500">
                      Started: {new Date(inc.startedAt).toLocaleString()}
                      {inc.endedAt && (
                        <>
                          {" "}
                          &bull; Resolved:{" "}
                          {new Date(inc.endedAt).toLocaleTimeString()}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-zinc-300 font-semibold">
                      {inc.durationMinutes
                        ? `${inc.durationMinutes} mins`
                        : "Ongoing"}
                    </span>
                    <div className="text-[9px] text-zinc-500">
                      Downtime Duration
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-500 font-mono">
            {site.slug} &bull; Monix Fleet Radar
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-semibold rounded transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close (Esc)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const LOCAL_STORAGE_CUSTOM_SITES_KEY = "monix_private_custom_sites";

interface StoredCustomSite {
  name: string;
  url: string;
  category: string;
  slug?: string;
  nightlyDowntime?: NightlyDowntimeConfig;
}

function getStoredCustomSites(): StoredCustomSite[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_SITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredCustomSites(sites: StoredCustomSite[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_SITES_KEY, JSON.stringify(sites));
  } catch {}
}

const FLEET_FETCH_TIMEOUT_MS = 60_000;

function fleetFetchErrorMessage(err: unknown): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return "request timed out after 60 seconds";
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "unknown error";
}

async function parseFleetApiError(res: Response): Promise<string> {
  let reason = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error?.trim()) {
      reason = body.error.trim();
    }
  } catch {
    // ignore non-JSON error bodies
  }
  return reason;
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
  const [viewMode, setViewMode] = useState<"cards" | "table" | "timeline">(
    "cards",
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [singleProbingSlug, setSingleProbingSlug] = useState<string | null>(
    null,
  );
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [countdown, setCountdown] = useState<number>(30);

  // Selected site for deep-dive drawer
  const [selectedSite, setSelectedSite] = useState<FleetSiteTelemetry | null>(
    null,
  );
  const selectedSiteRef = useRef<FleetSiteTelemetry | null>(null);
  selectedSiteRef.current = selectedSite;

  // Add Site Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSiteCategory, setNewSiteCategory] = useState("Custom Sites");
  const [addingSite, setAddingSite] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchFleetData = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    setError(null);
    const localCustom = getStoredCustomSites();
    try {
      const customHeaderVal =
        localCustom.length > 0
          ? encodeURIComponent(JSON.stringify(localCustom))
          : "";
      const res = await fetch(
        `/api/private-sites${customHeaderVal ? `?custom=${customHeaderVal}` : ""}`,
        {
          cache: "no-store",
          headers: customHeaderVal ? { "x-custom-sites": customHeaderVal } : {},
          signal: AbortSignal.timeout(FLEET_FETCH_TIMEOUT_MS),
        },
      );
      if (!res.ok) {
        throw new Error(await parseFleetApiError(res));
      }
      const json: FleetOverviewData = await res.json();
      setData(json);

      // Sync any custom sites discovered from server back into localStorage
      const serverCustom = json.sites
        .filter((s) => s.isCustom)
        .map((s) => ({
          name: s.name,
          url: s.url,
          category: s.category,
          slug: s.slug,
          nightlyDowntime: s.nightlyDowntime,
        }));
      const combinedCustom = [...localCustom];
      for (const sc of serverCustom) {
        if (
          !combinedCustom.some((c) => c.url === sc.url || c.slug === sc.slug)
        ) {
          combinedCustom.push(sc);
        }
      }
      saveStoredCustomSites(combinedCustom);

      // If a site is currently inspected in modal, update its live state
      if (selectedSiteRef.current) {
        const fresh = json.sites.find(
          (s) => s.slug === selectedSiteRef.current?.slug,
        );
        if (fresh) setSelectedSite(fresh);
      }
    } catch (err: unknown) {
      setError(
        `Failed to load fleet telemetry — ${fleetFetchErrorMessage(err)}`,
      );
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  const handleInstantProbe = async () => {
    setProbing(true);
    setError(null);
    const localCustom = getStoredCustomSites();
    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "probe_all", customSites: localCustom }),
      });
      if (!res.ok) {
        throw new Error(`Failed to run live probe (${res.status})`);
      }
      const json: FleetOverviewData = await res.json();
      setData(json);
      setCountdown(refreshInterval);
      setSuccessMessage("Live fleet health check complete for all targets.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error triggering probe");
    } finally {
      setProbing(false);
    }
  };

  const handleProbeSingleSite = async (siteToProbe: FleetSiteTelemetry) => {
    setSingleProbingSlug(siteToProbe.slug);
    const localCustom = getStoredCustomSites();
    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "probe_all", customSites: localCustom }),
      });
      if (!res.ok) throw new Error("Failed to probe site");
      const json: FleetOverviewData = await res.json();
      setData(json);
      const updatedSite = json.sites.find((s) => s.slug === siteToProbe.slug);
      if (updatedSite) setSelectedSite(updatedSite);
      setSuccessMessage(`Live probe refreshed for "${siteToProbe.name}".`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error probing target");
    } finally {
      setSingleProbingSlug(null);
    }
  };

  const handleCopyUrl = (url: string, slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteUrl.trim()) return;

    setAddingSite(true);
    setError(null);
    const targetUrl = newSiteUrl.trim();
    const targetName = newSiteName.trim();
    const targetCat = newSiteCategory.trim() || "Custom Sites";

    const localCustom = getStoredCustomSites();
    const newCustomItem: StoredCustomSite = {
      name: targetName || targetUrl.replace(/^https?:\/\//, "").split("/")[0],
      url: targetUrl,
      category: targetCat,
    };
    const updatedLocal = [
      ...localCustom.filter((s) => s.url !== targetUrl),
      newCustomItem,
    ];
    saveStoredCustomSites(updatedLocal);

    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_site",
          name: targetName || undefined,
          url: targetUrl,
          category: targetCat,
          customSites: updatedLocal,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to add site");
      }

      const updated: FleetOverviewData = await res.json();
      setData(updated);
      setActiveCategory("All");
      setShowAddModal(false);
      setNewSiteName("");
      setNewSiteUrl("");
      setSuccessMessage(
        `Added & probed "${targetName || targetUrl}" successfully!`,
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error adding new target");
    } finally {
      setAddingSite(false);
    }
  };

  const handleDeleteSite = async (
    e: React.MouseEvent,
    slug: string,
    url: string,
  ) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to remove ${url} from monitoring?`))
      return;

    const localCustom = getStoredCustomSites();
    const updatedLocal = localCustom.filter(
      (s) =>
        s.url !== url && s.slug !== slug && s.slug !== url && s.url !== slug,
    );
    saveStoredCustomSites(updatedLocal);

    try {
      const res = await fetch("/api/private-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_site",
          slug,
          url,
          customSites: updatedLocal,
        }),
      });

      if (!res.ok) throw new Error("Failed to delete target");
      const updated: FleetOverviewData = await res.json();
      setData(updated);
      if (selectedSite?.slug === slug) setSelectedSite(null);
      setSuccessMessage(`Site "${url}" removed from monitoring.`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error deleting site");
    }
  };

  useEffect(() => {
    fetchFleetData(true);
  }, [fetchFleetData]);

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
    let list = data.sites;
    if (activeCategory !== "All") {
      list = list.filter((s) => s.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.url.toLowerCase().includes(q) ||
          (s.pageTitle && s.pageTitle.toLowerCase().includes(q)) ||
          s.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [data, activeCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-[#060608] text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-24 pb-20 space-y-7">
        {/* Top Radar HUD Bar */}
        <header className="border border-zinc-800 bg-[#0d0d0f]/90 backdrop-blur-md rounded-2xl p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00ff66]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse shadow-[0_0_10px_#00ff66]" />
                <span className="font-mono text-xs text-[#00ff66] uppercase tracking-widest font-semibold">
                  MONIX FLEET RADAR :: LIVE TELEMETRY
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                Private Fleet Monitoring Radar
              </h1>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl font-mono">
                On-demand live HTTP probes for configured targets, login-portal
                detection, 24-hour timeline slots, SSL certificate checks, and
                incident history when Postgres is available.
              </p>
            </div>

            {/* Top Toolbar Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Add Site Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-white font-mono text-xs rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 text-[#00ff66]" />
                <span>Add Target</span>
              </button>

              {/* Auto Refresh Selector */}
              <div className="flex items-center gap-1.5 border border-zinc-800 bg-[#08080c] rounded-lg px-3 py-2 text-xs font-mono text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline text-zinc-400">Poll:</span>
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
                  <span className="text-zinc-500 text-[10px] pl-0.5">
                    ({countdown}s)
                  </span>
                )}
              </div>

              {/* Instant Health Check Button */}
              <button
                onClick={handleInstantProbe}
                disabled={probing}
                className="px-4 py-2 bg-[#00ff66] hover:bg-[#00ff66]/90 active:scale-95 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 rounded-lg cursor-pointer shadow-[0_0_15px_rgba(0,255,102,0.25)]"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${probing ? "animate-spin" : ""}`}
                />
                <span>{probing ? "Probing Fleet..." : "Probe Fleet Now"}</span>
              </button>
            </div>
          </div>
        </header>

        {successMessage && (
          <div className="p-3.5 border border-[#00ff66]/40 bg-[#00ff66]/10 text-[#00ff66] rounded-xl text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00ff66] shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-zinc-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 border border-red-500/30 bg-red-950/20 text-red-400 rounded-xl text-xs font-mono flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Fleet KPI Banner */}
        {data && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 sm:p-5 rounded-xl space-y-1.5 hover:border-zinc-700 transition-colors">
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

            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 sm:p-5 rounded-xl space-y-1.5 hover:border-zinc-700 transition-colors">
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

            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 sm:p-5 rounded-xl space-y-1.5 hover:border-zinc-700 transition-colors">
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

            <div className="border border-zinc-800 bg-[#0d0d0f] p-4 sm:p-5 rounded-xl space-y-1.5 hover:border-zinc-700 transition-colors">
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

        {/* Filter, Search & View Switcher Toolbar */}
        <section className="space-y-3.5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Realtime Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search targets by name, domain, title, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d0d0f] border border-zinc-800 focus:border-[#00ff66] rounded-xl pl-9 pr-8 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Time Range & View Mode Switcher */}
            <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
              <div className="flex items-center border border-zinc-800 bg-[#0d0d0f] rounded-xl p-1 text-xs font-mono">
                {(["24h", "7d", "30d"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimeRange(r)}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      timeRange === r
                        ? "bg-zinc-800 text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="flex items-center border border-zinc-800 bg-[#0d0d0f] rounded-xl p-1 text-xs font-mono">
                <button
                  onClick={() => setViewMode("cards")}
                  title="Cards Grid View"
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                    viewMode === "cards"
                      ? "bg-zinc-800 text-[#00ff66] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Cards</span>
                </button>

                <button
                  onClick={() => setViewMode("table")}
                  title="DevOps Table View"
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                    viewMode === "table"
                      ? "bg-zinc-800 text-[#00ff66] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Table</span>
                </button>

                <button
                  onClick={() => setViewMode("timeline")}
                  title="Latency Comparison Timeline"
                  className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                    viewMode === "timeline"
                      ? "bg-zinc-800 text-[#00ff66] font-semibold"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Timeline</span>
                </button>
              </div>
            </div>
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <Filter className="w-3.5 h-3.5 text-zinc-500 shrink-0 mr-1" />
            {data?.categories.map((cat) => {
              const count =
                cat === "All"
                  ? data.sites.length
                  : data.sites.filter((s) => s.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 text-xs font-mono rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeCategory === cat
                      ? "bg-[#00ff66] text-black font-semibold shadow-sm"
                      : "text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeCategory === cat
                        ? "bg-black/20 text-black font-bold"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Content Display */}
        {loading ? (
          <div className="py-24 text-center space-y-3 font-mono">
            <RefreshCw className="w-8 h-8 text-[#00ff66] animate-spin mx-auto" />
            <p className="text-zinc-400 text-xs">
              Probing fleet targets and loading telemetry (this can take up to a
              minute)...
            </p>
          </div>
        ) : error && !data ? (
          <div className="py-20 border border-red-500/30 bg-red-950/20 rounded-2xl text-center space-y-4 font-mono px-6">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
            <p className="text-red-300 text-sm font-semibold">{error}</p>
            <p className="text-zinc-500 text-xs max-w-md mx-auto">
              Check that DATABASE_URL is set in production and that
              /api/private-sites responds. You can retry without reloading the
              page.
            </p>
            <button
              onClick={() => fetchFleetData(true)}
              className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-xs text-[#00ff66] rounded hover:bg-zinc-800 cursor-pointer"
            >
              Retry Load
            </button>
          </div>
        ) : filteredSites.length === 0 ? (
          <div className="py-20 border border-dashed border-zinc-800 bg-[#0d0d0f]/50 rounded-2xl text-center space-y-3 font-mono">
            <Globe className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-zinc-300 text-sm font-semibold">
              No Monitored Sites Found
            </p>
            <p className="text-zinc-500 text-xs max-w-sm mx-auto">
              No targets match the filter criteria &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 text-xs text-[#00ff66] rounded hover:bg-zinc-800 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === "table" ? (
          /* High-Density DevOps Table View */
          <div className="overflow-x-auto border border-zinc-800 bg-[#0d0d0f] rounded-2xl font-mono text-xs shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-[10px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Target Portal &amp; Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Current Ping</th>
                  <th className="py-3.5 px-4">HTTP</th>
                  <th className="py-3.5 px-4">
                    {timeRange.toUpperCase()} Uptime
                  </th>
                  <th className="py-3.5 px-4">SSL Cert</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredSites.map((site) => {
                  const isUp = site.status === "up";
                  const isDegraded = site.status === "degraded";
                  const statusBadge = isUp ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/30 text-[10px] font-semibold uppercase">
                      <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                      Operational
                    </span>
                  ) : isDegraded ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-yellow-950/30 text-yellow-400 border border-yellow-500/30 text-[10px] font-semibold uppercase">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      Degraded
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-950/30 text-red-400 border border-red-500/30 text-[10px] font-semibold uppercase">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      Outage
                    </span>
                  );

                  const latencyColor =
                    site.currentResponseTimeMs === null
                      ? "text-zinc-500"
                      : site.currentResponseTimeMs < 250
                        ? "text-[#00ff66]"
                        : site.currentResponseTimeMs < 600
                          ? "text-yellow-400"
                          : "text-orange-400";

                  const uptimeVal =
                    timeRange === "24h"
                      ? site.uptimePercentage24h
                      : timeRange === "7d"
                        ? site.uptimePercentage7d
                        : site.uptimePercentage30d;

                  return (
                    <tr
                      key={site.slug}
                      onClick={() => setSelectedSite(site)}
                      className="hover:bg-zinc-850/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {statusBadge}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-white group-hover:text-[#00ff66] transition-colors truncate">
                          {site.name}
                        </div>
                        {site.pageTitle && (
                          <div className="text-[10px] text-zinc-400 truncate">
                            &ldquo;{site.pageTitle}&rdquo;
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1">
                          <span>{site.url}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-zinc-700">
                          {site.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`font-bold ${latencyColor}`}>
                          {site.currentResponseTimeMs !== null
                            ? `${site.currentResponseTimeMs} ms`
                            : "--"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-zinc-300">
                          {site.statusCode ?? "--"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            uptimeVal >= 99
                              ? "text-[#00ff66]"
                              : uptimeVal >= 80
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {uptimeVal}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] ${
                            site.certWarning
                              ? "text-yellow-400"
                              : "text-emerald-400"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>
                            {site.certDaysRemaining != null
                              ? `${site.certDaysRemaining}d`
                              : "OK"}
                          </span>
                        </span>
                      </td>
                      <td
                        className="py-3.5 px-4 whitespace-nowrap text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/status/${site.slug}`}
                            title="View Scoped Public Status Page"
                            className="p-1.5 text-zinc-400 hover:text-[#00ff66] bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProbeSingleSite(site);
                            }}
                            disabled={singleProbingSlug === site.slug}
                            title="Run Live Health Probe"
                            className="p-1.5 text-zinc-400 hover:text-[#00ff66] bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors cursor-pointer"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${
                                singleProbingSlug === site.slug
                                  ? "animate-spin text-[#00ff66]"
                                  : ""
                              }`}
                            />
                          </button>

                          {site.isCustom && (
                            <button
                              onClick={(e) =>
                                handleDeleteSite(e, site.slug, site.url)
                              }
                              title="Delete site"
                              className="p-1.5 text-zinc-500 hover:text-red-400 bg-zinc-900 border border-zinc-800 rounded hover:border-red-500/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : viewMode === "timeline" ? (
          <FleetComparisonTimeline
            sites={filteredSites}
            onSelectSite={setSelectedSite}
          />
        ) : (
          /* Cards Grid View */
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
                <article
                  key={site.slug}
                  className="border border-zinc-800/90 bg-[#0d0d0f] hover:border-[#00ff66]/60 transition-all rounded-2xl p-5 sm:p-6 space-y-4 flex flex-col justify-between group shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-md bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                            {site.category}
                          </span>

                          {site.isLoginProtected && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md bg-sky-950/60 text-sky-400 border border-sky-600/40 inline-flex items-center gap-1">
                              <KeyRound className="w-3 h-3 text-sky-400" />
                              <span>
                                {site.loginPortalType || "Auth / Login Portal"}
                              </span>
                            </span>
                          )}

                          {site.nightlyDowntime?.enabled && (
                            <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded-md bg-amber-950/60 text-amber-400 border border-amber-600/40 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>
                                Nightly Maint: {site.nightlyDowntime.startHour}:
                                {(site.nightlyDowntime.startMinute ?? 0)
                                  .toString()
                                  .padStart(2, "0")}{" "}
                                - {site.nightlyDowntime.endHour}:
                                {(site.nightlyDowntime.endMinute ?? 0)
                                  .toString()
                                  .padStart(2, "0")}
                              </span>
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedSite(site)}
                          className="text-left text-lg font-bold text-white tracking-tight flex items-center gap-2 hover:text-[#00ff66] transition-colors cursor-pointer"
                        >
                          <span>{site.name}</span>
                        </button>

                        {site.pageTitle && (
                          <div className="text-[11px] font-mono text-zinc-400 truncate max-w-sm">
                            &ldquo;{site.pageTitle}&rdquo;
                          </div>
                        )}

                        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                          <a
                            href={site.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-zinc-400 hover:text-[#00ff66] transition-colors inline-flex items-center gap-1"
                          >
                            <span>{site.url}</span>
                            <ExternalLink className="w-3 h-3 text-zinc-500" />
                          </a>

                          <button
                            onClick={(e) =>
                              handleCopyUrl(site.url, site.slug, e)
                            }
                            title="Copy target URL"
                            className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                          >
                            {copiedSlug === site.slug ? (
                              <Check className="w-3 h-3 text-[#00ff66]" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div
                          className={`px-3 py-1.5 rounded-lg border text-[11px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 ${statusColor}`}
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
                            onClick={(e) =>
                              handleDeleteSite(e, site.slug, site.url)
                            }
                            title="Remove site from monitoring"
                            className="text-zinc-600 hover:text-red-400 p-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {site.latestIncident && (
                      <div className="p-2.5 bg-red-950/30 border border-red-500/40 rounded-lg text-red-400 text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Incident: {site.latestIncident.cause}</span>
                      </div>
                    )}
                  </div>

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

                  <StandardLatencyGraph
                    history={site.responseTimeHistory24h}
                    status={site.status}
                    currentLatency={site.currentResponseTimeMs}
                    timeRange={timeRange}
                    nightlyDowntime={site.nightlyDowntime}
                  />

                  <AvailabilityHeatmap tiles={site.dailyAvailability30d} />

                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-850">
                    <div className="flex items-center gap-2">
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
                        className="text-zinc-500 hover:text-[#00ff66] transition-colors ml-2 hidden sm:inline-flex items-center gap-1 text-[10px]"
                        title="Open Scoped Public Status Page"
                      >
                        <span>Status Page</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleProbeSingleSite(site);
                        }}
                        disabled={singleProbingSlug === site.slug}
                        className="text-zinc-400 hover:text-[#00ff66] p-1 rounded transition-colors cursor-pointer"
                        title="Re-probe site"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            singleProbingSlug === site.slug
                              ? "animate-spin text-[#00ff66]"
                              : ""
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSite(site);
                        }}
                        className="inline-flex items-center gap-1 text-[#00ff66] hover:underline cursor-pointer"
                      >
                        <span>Deep Dive Matrix</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      {/* Selected Site Deep-Dive Modal */}
      {selectedSite && (
        <SiteDetailModal
          site={selectedSite}
          onClose={() => setSelectedSite(null)}
          onProbeSingle={handleProbeSingleSite}
        />
      )}

      {/* Add New Site Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 font-mono"
        >
          {/* Clickable Backdrop Dismiss */}
          <button
            type="button"
            aria-label="Close add site dialog"
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer border-0 w-full h-full p-0 m-0"
          />

          <div className="bg-[#0e0e12] border border-zinc-750 rounded-lg max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 cursor-default relative z-10">
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
