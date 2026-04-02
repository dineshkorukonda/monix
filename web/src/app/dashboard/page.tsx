"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  Globe,
  MousePointerClick,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ScoreBadge } from "@/components/dashboard/status-badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { Button } from "@/components/ui/button";
import {
  aggregateGscFromTargets,
  formatCompactNumber,
  formatPct,
  formatPosition,
} from "@/components/gsc-metrics";
import { formatCfBytes } from "@/components/cf-metrics";
import {
  buildCfEdgeIssues,
  loadCloudflareWorkspaceMetrics,
  type CfEdgeIssue,
  type CfWorkspaceResult,
} from "@/lib/cf-workspace";
import {
  ApiError,
  getDashboardData,
  getScans,
  getTargets,
  type DashboardData,
  type ScanSummary,
  type Target,
} from "@/lib/api";

const ScansWorldMap = dynamic(() => import("@/components/ScansWorldMap"), {
  ssr: false,
});

// ── Theme-aware chart colours ────────────────────────────────────────────────

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return {
    grid:    dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    axis:    dark ? "rgba(255,255,255,0.3)"  : "rgba(0,0,0,0.4)",
    indigo:  dark ? "#818cf8" : "#6366f1",
    emerald: dark ? "#34d399" : "#059669",
    amber:   dark ? "#fbbf24" : "#d97706",
    rose:    dark ? "#f87171" : "#e11d48",
  };
}

// ── Score trend area chart ────────────────────────────────────────────────────

function ScoreTrendChart({ scans }: { scans: ScanSummary[] }) {
  const c = useChartTheme();
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
      }));
  }, [scans]);

  if (data.length < 2) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Not enough scans yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={1}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={c.indigo} stopOpacity={0.25} />
            <stop offset="95%" stopColor={c.indigo} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="t" tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          itemStyle={{ color: "var(--popover-foreground)" }}
        />
        <Area type="monotone" dataKey="score" stroke={c.indigo} strokeWidth={2} fill="url(#scoreGrad)" dot={false} name="Score" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Status distribution bar chart ─────────────────────────────────────────────

function StatusDistributionChart({ projects }: { projects: Target[] }) {
  const c = useChartTheme();
  const data = useMemo(() => {
    let healthy = 0, warning = 0, critical = 0;
    for (const p of projects) {
      if (p.score == null) continue;
      if (p.score >= 80) healthy++;
      else if (p.score >= 50) warning++;
      else critical++;
    }
    return [
      { name: "Healthy",  value: healthy,  fill: c.emerald },
      { name: "Warning",  value: warning,  fill: c.amber },
      { name: "Critical", value: critical, fill: c.rose },
    ].filter((d) => d.value > 0);
  }, [projects, c]);

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        No scans yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%" debounce={1}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: c.axis }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Sites">
          {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Recent scans table ────────────────────────────────────────────────────────

function RecentScansTable({ scans }: { scans: ScanSummary[] }) {
  if (scans.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No scans yet"
        description="Add a site to run your first scan."
        action={
          <Button asChild size="sm" className="bg-foreground hover:bg-foreground/90 text-background border-0">
            <Link href="/dashboard/sites"><Plus className="h-3.5 w-3.5 mr-1.5" />Add site</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">Site</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden sm:table-cell">Date</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Score</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {scans.slice(0, 8).map((scan) => (
            <tr key={scan.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
              <td className="px-5 py-3">
                <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{scan.target_name}</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px] mt-0.5">{scan.url}</p>
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden sm:table-cell tabular-nums">
                <span className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(scan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </td>
              <td className="px-4 py-3 text-right"><ScoreBadge score={scan.score} /></td>
              <td className="px-4 py-3 text-right">
                <Link href={`/dashboard/report/${scan.report_id}`} className="text-muted-foreground hover:text-foreground">
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Recent issues list ────────────────────────────────────────────────────────

function RecentIssuesList({
  projects,
  alerts,
  cfEdgeIssues = [],
}: {
  projects: Target[];
  alerts: string[];
  cfEdgeIssues?: CfEdgeIssue[];
}) {
  const issues = useMemo(() => {
    const list: { severity: "critical" | "warning" | "info"; site: string; text: string }[] = [];
    for (const p of projects) {
      if (p.score == null) continue;
      if (p.score < 50) list.push({ severity: "critical", site: p.name, text: `Score ${p.score}/100 — immediate attention required` });
      else if (p.score < 70) list.push({ severity: "warning", site: p.name, text: `Score ${p.score}/100 — issues need review` });
    }
    for (const c of cfEdgeIssues.slice(0, 4)) {
      list.push({ severity: c.severity, site: c.site, text: c.title });
    }
    for (const a of alerts.slice(0, 3)) {
      list.push({ severity: "warning", site: "Network", text: a });
    }
    const rank: Record<"critical" | "warning" | "info", number> = {
      critical: 3,
      warning: 2,
      info: 1,
    };
    return list
      .sort((a, b) => rank[b.severity] - rank[a.severity])
      .slice(0, 8);
  }, [projects, alerts, cfEdgeIssues]);

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 px-5 py-6">
        <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
        <p className="text-sm text-muted-foreground">No issues detected. Everything looks good.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-3 px-5 py-3.5">
          <div
            className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${
              issue.severity === "critical"
                ? "bg-rose-500/10"
                : issue.severity === "info"
                  ? "bg-blue-500/10"
                  : "bg-amber-500/10"
            }`}
          >
            <AlertTriangle
              className={`h-3 w-3 ${
                issue.severity === "critical"
                  ? "text-rose-500"
                  : issue.severity === "info"
                    ? "text-blue-500"
                    : "text-amber-500"
              }`}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{issue.site}</p>
            <p className="text-sm text-foreground truncate">{issue.text}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border uppercase ${issue.severity === "critical" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : issue.severity === "info" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
            {issue.severity}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function DataCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Overview page ─────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const [stats, setStats]             = useState<DashboardData | null>(null);
  const [projects, setProjects]       = useState<Target[]>([]);
  const [scans, setScans]             = useState<ScanSummary[]>([]);
  const [cfWs, setCfWs]               = useState<CfWorkspaceResult | null>(null);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const logErr = (src: string, err: unknown) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return;
      console.error(`Overview (${src}):`, err);
    };

    Promise.allSettled([getDashboardData(), getTargets(), getScans()])
      .then(async ([dashR, targR, scansR]) => {
        if (dashR.status  === "fulfilled") setStats(dashR.value);
        else logErr("dashboard", dashR.reason);
        if (targR.status  === "fulfilled") setProjects(targR.value);
        else logErr("targets", targR.reason);
        if (scansR.status === "fulfilled") setScans(scansR.value);
        else logErr("scans", scansR.reason);
        if (targR.status === "fulfilled") {
          try {
            const ws = await loadCloudflareWorkspaceMetrics(targR.value);
            setCfWs(ws);
          } catch {
            setCfWs(null);
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const avgScore = useMemo(() => {
    const scored = projects.filter((p) => p.score != null);
    return scored.length > 0
      ? Math.round(scored.reduce((a, p) => a + (p.score ?? 0), 0) / scored.length)
      : 0;
  }, [projects]);

  const openIssues = useMemo(
    () => projects.filter((p) => p.score != null && p.score < 80).length,
    [projects],
  );

  const gsc = useMemo(() => aggregateGscFromTargets(projects), [projects]);

  const cfEdgeIssues = useMemo(
    () => (cfWs ? buildCfEdgeIssues(projects, cfWs) : []),
    [projects, cfWs],
  );

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-52 bg-muted/40 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted/30 border border-border" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[1,2].map((i) => <div key={i} className="h-60 rounded-xl bg-muted/30 border border-border" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Section 1: Page header */}
      <SectionHeader
        title="Workspace Overview"
        description="Monitor all your sites and catch issues early."
        action={
          <Button asChild size="sm" className="bg-foreground hover:bg-foreground/90 text-background border-0 gap-1.5">
            <Link href="/dashboard/sites">
              <Plus className="h-3.5 w-3.5" />
              Run Scan
            </Link>
          </Button>
        }
      />

      {/* Section 2: Workspace metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Sites"   value={projects.length} sub="Monitored domains" icon={Globe}          variant="indigo" />
        <MetricCard label="Total Scans"   value={scans.length}    sub="All time"           icon={Activity}       variant="indigo" />
        <MetricCard label="Avg Health"    value={avgScore || "—"} sub="Across all sites"   icon={ShieldCheck}    variant={avgScore >= 70 ? "emerald" : avgScore > 0 ? "amber" : "default"} />
        <MetricCard label="Open Issues"   value={openIssues}      sub={openIssues > 0 ? "Sites below 80" : "All sites healthy"} icon={AlertTriangle} variant={openIssues > 0 ? "rose" : "emerald"} />
      </div>

      {/* Section 3: Search (GSC) */}
      {gsc.hasData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Clicks"
            value={formatCompactNumber(gsc.totalClicks)}
            sub={gsc.dateLabel ?? "Search Console"}
            icon={MousePointerClick}
            variant="emerald"
          />
          <MetricCard
            label="Impressions"
            value={formatCompactNumber(gsc.totalImpressions)}
            sub="Google Search Console"
            icon={Search}
            variant="indigo"
          />
          <MetricCard
            label="Avg CTR"
            value={formatPct(gsc.ctr)}
            sub="Across all sites"
            icon={Activity}
            variant="indigo"
          />
          <MetricCard
            label="Avg Position"
            value={formatPosition(gsc.avgPosition)}
            sub="Google Search ranking"
            icon={TrendingUp}
            variant={
              gsc.avgPosition != null && gsc.avgPosition <= 10
                ? "emerald"
                : gsc.avgPosition != null && gsc.avgPosition <= 20
                  ? "amber"
                  : "default"
            }
          />
        </div>
      )}

      {/* Section 3b: Cloudflare edge (matched zones) */}
      {cfWs?.connected && cfWs.aggregate.hasData && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Edge requests"
            value={formatCompactNumber(cfWs.aggregate.totalRequests)}
            sub={`Last ${cfWs.aggregate.periodDays} days · Cloudflare`}
            icon={Zap}
            variant="amber"
          />
          <MetricCard
            label="Threats (edge)"
            value={formatCompactNumber(cfWs.aggregate.totalThreats)}
            sub="Security events recorded"
            icon={AlertTriangle}
            variant={cfWs.aggregate.totalThreats > 0 ? "rose" : "emerald"}
          />
          <MetricCard
            label="Cache hit rate"
            value={
              cfWs.aggregate.cacheRatio != null
                ? `${(cfWs.aggregate.cacheRatio * 100).toFixed(1)}%`
                : "—"
            }
            sub="Cached ÷ all requests"
            icon={Activity}
            variant="indigo"
          />
          <MetricCard
            label="Edge bandwidth"
            value={formatCfBytes(cfWs.aggregate.bandwidthBytes)}
            sub={`${cfWs.aggregate.matchedProjectCount} site${cfWs.aggregate.matchedProjectCount !== 1 ? "s" : ""} matched`}
            icon={Globe}
            variant="default"
          />
        </div>
      )}
      {cfWs?.connected && !cfWs.aggregate.hasData && projects.length > 0 && (
        <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/20 px-4 py-3">
          Cloudflare is connected — edge totals appear when a monitored site&apos;s hostname matches a zone on your token (
          <Link href="/dashboard/integrations/cloudflare" className="underline underline-offset-2 hover:text-foreground">
            integration
          </Link>
          ).
        </p>
      )}

      {/* Section 5: Health score distribution */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Health Score Trend" subtitle="Average score across last 20 scans">
          <ScoreTrendChart scans={scans} />
        </ChartCard>
        <ChartCard title="Sites by Status" subtitle="Current health distribution">
          <StatusDistributionChart projects={projects} />
        </ChartCard>
      </div>

      {/* Section 6: Recent scans */}
      <DataCard
        title="Recent Scans"
        action={
          <Link href="/dashboard/scans" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <RecentScansTable scans={scans} />
      </DataCard>

      {/* Section 7: Recent issues */}
      <DataCard
        title="Recent Issues"
        action={
          <Link href="/dashboard/issues" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            All issues <ArrowRight className="h-3 w-3" />
          </Link>
        }
      >
        <RecentIssuesList
          projects={projects}
          alerts={stats?.alerts ?? []}
          cfEdgeIssues={cfEdgeIssues}
        />
      </DataCard>

      {/* World map */}
      <DataCard title="Scanned Server Locations">
        <div className="h-72">
          <ScansWorldMap />
        </div>
      </DataCard>
    </div>
  );
}
