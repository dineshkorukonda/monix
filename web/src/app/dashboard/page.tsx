"use client";

import {
  Activity,
  ArrowRight,
  ChevronRight,
  Clock,
  Globe,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  aggregateGscFromTargets,
  formatCompactNumber,
  formatPct,
  formatPosition,
} from "@/components/gsc-metrics";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  type DashboardData,
  getDashboardData,
  getGscStatus,
  getScans,
  getTargets,
  type ScanSummary,
  type Target,
} from "@/lib/api";

const ScansWorldMap = dynamic(() => import("@/components/ScansWorldMap"), {
  ssr: false,
});

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
const C_GREEN = "#34d399";
const C_AMBER = "#fbbf24";
const C_ROSE = "#f87171";
const C_GRID = "rgba(255,255,255,0.06)";
const C_AXIS = "rgba(255,255,255,0.25)";

function scoreColor(s: number) {
  return s >= 80 ? C_GREEN : s >= 50 ? C_AMBER : C_ROSE;
}

function scoreBg(s: number) {
  return s >= 80
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : s >= 50
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-rose-500/10 text-rose-400 border-rose-500/20";
}

// ---------------------------------------------------------------------------
// Shared chart tooltip
// ---------------------------------------------------------------------------
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {label && <p className="text-white/40 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: p.color }}
          />
          <span
            style={{ color: p.color }}
            className="font-semibold tabular-nums"
          >
            {p.value}
          </span>
          {p.name && <span className="text-white/30 ml-0.5">{p.name}</span>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = "bg-white/5",
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color?: string;
  trend?: "up" | "down" | null;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {label}
        </p>
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}
        >
          <Icon className="h-4 w-4 text-white/60" />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="text-3xl font-bold text-white tabular-nums">
          {value}
        </div>
        {trend && (
          <TrendIcon
            className={`h-4 w-4 mb-1 ${trend === "up" ? "text-emerald-400" : "text-rose-400"}`}
          />
        )}
      </div>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score pill
// ---------------------------------------------------------------------------
function ScorePill({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${scoreBg(score)}`}
    >
      {score}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------
function SectionHeader({
  title,
  href,
  label = "View all",
}: {
  title: string;
  href: string;
  label?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 text-xs text-white/35 hover:text-white transition-colors"
      >
        {label}
        <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart: Score trend
// ---------------------------------------------------------------------------
function ScoreTrendChart({ scans }: { scans: ScanSummary[] }) {
  const data = useMemo(() => {
    return [...scans]
      .reverse()
      .slice(-20)
      .map((s) => ({
        t: new Date(s.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: s.score,
        fill: scoreColor(s.score),
      }));
  }, [scans]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-white/20">
        Not enough scans yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={1}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
      >
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C_GREEN} stopOpacity={0.25} />
            <stop offset="95%" stopColor={C_GREEN} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} vertical={false} />
        <XAxis
          dataKey="t"
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ stroke: "rgba(255,255,255,0.1)" }}
        />
        <Area
          type="monotone"
          dataKey="score"
          stroke={C_GREEN}
          strokeWidth={2}
          fill="url(#scoreGrad)"
          dot={false}
          activeDot={{ r: 4, fill: C_GREEN, stroke: "black" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Chart: Distribution donut
// ---------------------------------------------------------------------------
function DistributionChart({ scans }: { scans: ScanSummary[] }) {
  const data = useMemo(() => {
    const healthy = scans.filter((s) => s.score >= 80).length;
    const warning = scans.filter((s) => s.score >= 50 && s.score < 80).length;
    const critical = scans.filter((s) => s.score < 50).length;
    return [
      { name: "Healthy", value: healthy, color: C_GREEN },
      { name: "Warning", value: warning, color: C_AMBER },
      { name: "Critical", value: critical, color: C_ROSE },
    ].filter((d) => d.value > 0);
  }, [scans]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-white/20">
        No scans yet
      </div>
    );
  }

  const total = data.reduce((a, d) => a + d.value, 0);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="relative">
        <ResponsiveContainer width={140} height={140} debounce={1}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={62}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-black text-white tabular-nums">
            {total}
          </span>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">
            scans
          </span>
        </div>
      </div>
      <div className="flex gap-4">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-[11px] text-white/50">{d.name}</span>
            <span
              className="text-[11px] font-semibold tabular-nums"
              style={{ color: d.color }}
            >
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart: Project health bands (latest score per project — not per scan)
// ---------------------------------------------------------------------------
function ProjectHealthBandsChart({ projects }: { projects: Target[] }) {
  const data = useMemo(() => {
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    for (const p of projects) {
      if (p.score == null) continue;
      if (p.score >= 80) healthy++;
      else if (p.score >= 50) warning++;
      else critical++;
    }
    return [
      { name: "Healthy", value: healthy, fill: C_GREEN },
      { name: "Warning", value: warning, fill: C_AMBER },
      { name: "Critical", value: critical, fill: C_ROSE },
    ].filter((d) => d.value > 0);
  }, [projects]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-white/20">
        No scored projects yet
      </div>
    );
  }

  const maxV = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="h-full w-full min-h-[160px] min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, bottom: 4, left: 4 }}
          barSize={12}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C_GRID}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, maxV]}
            allowDecimals={false}
            tick={{ fontSize: 10, fill: C_AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={52}
            tick={{ fontSize: 10, fill: C_AXIS }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart: Daily scan activity
// ---------------------------------------------------------------------------
function DailyActivityChart({ scans }: { scans: ScanSummary[] }) {
  const data = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d.toDateString(),
        count: 0,
      };
    });
    for (const s of scans) {
      const day = new Date(s.created_at).toDateString();
      const match = days.find((d) => d.date === day);
      if (match) match.count++;
    }
    return days;
  }, [scans]);

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={1}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
        barSize={16}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={C_GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="count" name="scans" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.count > 0 ? "rgba(52,211,153,0.7)" : "rgba(255,255,255,0.06)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Chart: Project scores horizontal bars
// ---------------------------------------------------------------------------
function ProjectScoresChart({ projects }: { projects: Target[] }) {
  const data = useMemo(
    () =>
      [...projects]
        .filter((p) => p.score != null)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 6)
        .map((p) => ({
          name: p.url
            .replace(/^https?:\/\//, "")
            .split("/")[0]
            .replace(/^www\./, ""),
          score: p.score ?? 0,
        })),
    [projects],
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-white/20">
        No scored projects yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={1}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
        barSize={8}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={C_GRID}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="score" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={scoreColor(d.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Chart: GSC clicks by project (horizontal bars)
// ---------------------------------------------------------------------------
function GscClicksByProjectChart({
  rows,
}: {
  rows: { name: string; id: string; clicks: number }[];
}) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        name: r.name.length > 16 ? `${r.name.slice(0, 14)}…` : r.name,
        clicks: r.clicks,
      })),
    [rows],
  );

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-white/20">
        No click data
      </div>
    );
  }

  const maxC = Math.max(...data.map((d) => d.clicks), 1);

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={1}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
        barSize={10}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={C_GRID}
          horizontal={false}
        />
        <XAxis
          type="number"
          domain={[0, maxC]}
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 10, fill: C_AXIS }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip />}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="clicks" radius={[0, 4, 4, 0]}>
          {data.map((d) => (
            <Cell
              key={`${d.name}-${d.clicks}`}
              fill="rgba(52,211,153,0.75)"
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------------------
// Chart card wrapper
// ---------------------------------------------------------------------------
function ChartCard({
  title,
  subtitle,
  height = 180,
  children,
}: {
  title: string;
  subtitle?: string;
  height?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <p className="text-sm font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-white/30 mt-0.5">{subtitle}</p>}
      </div>
      <div style={{ height }} className="px-2 py-4 min-h-0 min-w-0">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanSummary[]>([]);
  const [allScans, setAllScans] = useState<ScanSummary[]>([]);
  const [projectsPreview, setProjectsPreview] = useState<Target[]>([]);
  const [allProjects, setAllProjects] = useState<Target[]>([]);
  const [gscConnected, setGscConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const logErr = (src: string, err: unknown) => {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        )
          return;
        console.error(`Overview (${src}):`, err);
      };

      try {
        const [dashR, targetsR, scansR, gscR] = await Promise.allSettled([
          getDashboardData(),
          getTargets(),
          getScans(),
          getGscStatus(),
        ]);

        if (dashR.status === "fulfilled") setStats(dashR.value);
        else logErr("dashboard", dashR.reason);

        if (targetsR.status === "fulfilled") {
          const t = targetsR.value;
          setProjectCount(t.length);
          setAllProjects(t);
          setProjectsPreview(t.slice(0, 6));
          const scored = t.filter((p) => p.score != null);
          setAvgScore(
            scored.length > 0
              ? Math.round(
                  scored.reduce((a, p) => a + (p.score ?? 0), 0) /
                    scored.length,
                )
              : 0,
          );
        } else logErr("targets", targetsR.reason);

        if (scansR.status === "fulfilled") {
          const list = scansR.value;
          setScanCount(list.length);
          setRecentScans(list.slice(0, 8));
          setAllScans(list);
        } else logErr("scans", scansR.reason);

        if (gscR.status === "fulfilled") setGscConnected(gscR.value.connected);
        else logErr("gsc", gscR.reason);
      } catch (e) {
        logErr("overview", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const gscAgg = useMemo(
    () => aggregateGscFromTargets(allProjects),
    [allProjects],
  );

  const activeAlerts = stats?.alerts.length ?? 0;
  const showSearchSection = gscAgg.hasData || gscConnected;

  // ── loading skeleton ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 pb-20">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-52 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
          <div className="h-52 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  // ── main render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Overview
          </h2>
          <p className="text-sm text-white/35 mt-0.5">
            Your security workspace at a glance
          </p>
        </div>
        <Button
          asChild
          className="bg-white text-black hover:bg-white/90 font-semibold shrink-0"
        >
          <Link href="/dashboard/projects">
            <Plus className="h-4 w-4 mr-2" />
            New scan
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={projectCount}
          sub="Monitored URLs"
          icon={Globe}
          trend={projectCount > 0 ? "up" : null}
        />
        <StatCard
          label="Avg score"
          value={avgScore || "—"}
          sub="Across all projects"
          icon={ShieldCheck}
          color={
            avgScore >= 80
              ? "bg-emerald-500/10"
              : avgScore >= 50
                ? "bg-amber-500/10"
                : "bg-rose-500/10"
          }
          trend={avgScore >= 80 ? "up" : avgScore > 0 ? "down" : null}
        />
        <StatCard
          label="Alerts"
          value={activeAlerts}
          sub={activeAlerts > 0 ? "Needs attention" : "All clear"}
          icon={ShieldAlert}
          color={activeAlerts > 0 ? "bg-rose-500/10" : "bg-emerald-500/10"}
          trend={activeAlerts > 0 ? "down" : null}
        />
        <StatCard
          label="Total scans"
          value={scanCount}
          sub="Saved in workspace"
          icon={Activity}
          trend={scanCount > 0 ? "up" : null}
        />
      </div>

      {/* Search Console (GSC) */}
      {showSearchSection && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-white tracking-tight">
                Search performance
              </h3>
              <p className="text-xs text-white/35 mt-0.5">
                From Google Search Console
                {gscAgg.dateLabel ? ` · ${gscAgg.dateLabel}` : ""}
              </p>
            </div>
            <Link
              href="/dashboard/projects"
              className="text-xs text-white/35 hover:text-white/70 transition-colors shrink-0"
            >
              Manage connection
            </Link>
          </div>

          {gscAgg.hasData ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Search clicks"
                  value={formatCompactNumber(gscAgg.totalClicks)}
                  sub="Sum across projects"
                  icon={Search}
                  color="bg-emerald-500/10"
                  trend={gscAgg.totalClicks > 0 ? "up" : null}
                />
                <StatCard
                  label="Impressions"
                  value={formatCompactNumber(gscAgg.totalImpressions)}
                  sub="Sum across projects"
                  icon={Globe}
                  color="bg-sky-500/10"
                  trend={gscAgg.totalImpressions > 0 ? "up" : null}
                />
                <StatCard
                  label="Avg position"
                  value={formatPosition(gscAgg.avgPosition)}
                  sub="Weighted by impressions"
                  icon={Activity}
                  color="bg-violet-500/10"
                />
                <StatCard
                  label="CTR"
                  value={formatPct(gscAgg.ctr)}
                  sub="Clicks ÷ impressions"
                  icon={Zap}
                  color="bg-amber-500/10"
                />
              </div>
              <ChartCard
                title="Clicks by project"
                subtitle="Projects with synced Search Console data"
                height={200}
              >
                <GscClicksByProjectChart rows={gscAgg.byProject} />
              </ChartCard>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-8 text-center">
              <p className="text-sm text-white/40 max-w-md mx-auto leading-relaxed">
                Search Console is connected, but no project has synced metrics
                yet. Add a project whose domain matches a verified property.
              </p>
              <Link
                href="/dashboard/projects"
                className="inline-flex mt-3 text-xs text-white/50 hover:text-white underline underline-offset-2"
              >
                Open projects
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Charts row 1: score trend, scan distribution, project health mix */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Score trend" subtitle="Last 20 scans" height={200}>
          <ScoreTrendChart scans={allScans} />
        </ChartCard>
        <ChartCard title="Score distribution" subtitle="All scans" height={200}>
          <DistributionChart scans={allScans} />
        </ChartCard>
        <ChartCard
          title="Project health mix"
          subtitle="Latest score per project"
          height={200}
        >
          <ProjectHealthBandsChart projects={allProjects} />
        </ChartCard>
      </div>

      {/* Charts row 2: daily activity + project health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Daily scan activity"
          subtitle="Last 7 days"
          height={180}
        >
          <DailyActivityChart scans={allScans} />
        </ChartCard>
        <ChartCard
          title="Project health"
          subtitle="Score by project"
          height={180}
        >
          <ProjectScoresChart projects={allProjects} />
        </ChartCard>
      </div>

      {/* Recent scans + Projects lists */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent scans */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <SectionHeader
            title="Recent scans"
            href="/dashboard/scans"
            label="All scans"
          />
          {recentScans.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-white/25">
              No scans yet.{" "}
              <Link
                href="/dashboard/projects"
                className="text-white/50 hover:text-white underline underline-offset-2"
              >
                Add a project
              </Link>{" "}
              to start.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">
                      {scan.target_name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-2.5 w-2.5 text-white/20 shrink-0" />
                      <p className="text-[10px] text-white/25 truncate">
                        {new Date(scan.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <ScorePill score={scan.score} />
                  <Link
                    href={`/dashboard/report/${scan.report_id}`}
                    className="text-white/25 hover:text-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <SectionHeader
            title="Projects"
            href="/dashboard/projects"
            label="Manage"
          />
          {projectsPreview.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-white/25">
              No projects yet.{" "}
              <Link
                href="/dashboard/projects"
                className="text-white/50 hover:text-white underline underline-offset-2"
              >
                Add one
              </Link>{" "}
              to start monitoring.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {projectsPreview.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-white/25 font-mono truncate mt-0.5">
                      {p.url}
                    </p>
                    {p.gsc_analytics?.summary &&
                      (p.gsc_analytics.summary.clicks != null ||
                        p.gsc_analytics.summary.impressions != null) && (
                        <p className="text-[10px] text-emerald-400/85 tabular-nums mt-0.5">
                          {formatCompactNumber(p.gsc_analytics.summary.clicks)}{" "}
                          clicks ·{" "}
                          {formatCompactNumber(
                            p.gsc_analytics.summary.impressions,
                          )}{" "}
                          impr.
                        </p>
                      )}
                  </div>
                  {p.score != null ? (
                    <ScorePill score={p.score} />
                  ) : (
                    <span className="text-xs text-white/15">—</span>
                  )}
                  <Link
                    href={`/dashboard/project/${p.id}`}
                    className="text-white/25 hover:text-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* World map */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Scanned locations
            </h3>
            <p className="text-xs text-white/30 mt-0.5">
              Server locations of all scanned targets · click pins for details
            </p>
          </div>
          <Globe className="h-4 w-4 text-white/20" />
        </div>
        <div className="h-72 relative">
          <ScansWorldMap />
        </div>
      </div>

      {/* Status bar */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/35">
        <div className="flex items-center gap-1.5">
          <div
            className={`h-1.5 w-1.5 rounded-full ${stats ? "bg-emerald-400" : "bg-rose-400"}`}
          />
          API engine{" "}
          <span className={stats ? "text-white/60" : "text-rose-400"}>
            {stats ? "online" : "unavailable"}
          </span>
        </div>
        {stats && (
          <>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              CPU{" "}
              <span className="text-white/60">
                {Math.round(stats.system_stats.cpu_percent ?? 0)}%
              </span>
            </div>
            <div>
              Memory{" "}
              <span className="text-white/60">
                {Math.round(stats.system_stats.memory_percent ?? 0)}%
              </span>
            </div>
            <div>
              Traffic{" "}
              <span className="text-white/60">
                {stats.traffic_summary.total_requests} req/10m
              </span>
            </div>
          </>
        )}
        <div className="ml-auto flex gap-4">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            Projects <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/scans"
            className="inline-flex items-center gap-1 hover:text-white transition-colors"
          >
            Scan log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
