"use client";

import {
  AlertCircle,
  BarChart3,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import {
  aggregateGscFromTargets,
  formatCompactNumber,
  formatPct,
  formatPosition,
} from "@/components/gsc-metrics";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  getGscStatus,
  getTargets,
  syncGscTargets,
  type Target,
} from "@/lib/api";

// ── Chart theme ──────────────────────────────────────────────────────────────

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return {
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    axis: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.45)",
    emerald: dark ? "rgba(52,211,153,0.85)" : "rgba(16,185,129,0.9)",
    blue: dark ? "rgba(96,165,250,0.85)" : "rgba(37,99,235,0.85)",
    amber: dark ? "rgba(251,191,36,0.85)" : "rgba(217,119,6,0.85)",
    rose: dark ? "rgba(248,113,113,0.85)" : "rgba(225,29,72,0.8)",
    indigo: dark ? "rgba(129,140,248,0.85)" : "rgba(79,70,229,0.85)",
  };
}

// ── Derived data helpers ─────────────────────────────────────────────────────

interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  project: string;
}

function allQueries(targets: Target[]): QueryRow[] {
  return targets.flatMap((t) =>
    (t.gsc_analytics?.top_queries ?? []).map((q) => ({
      query: q.query ?? "",
      clicks: q.clicks ?? 0,
      impressions: q.impressions ?? 0,
      position: q.position ?? 0,
      project: t.name,
    })),
  );
}

function buildPositionDistribution(queries: QueryRow[]) {
  const buckets = [
    { range: "Top 3", min: 0, max: 3, count: 0 },
    { range: "4–10", min: 3, max: 10, count: 0 },
    { range: "11–20", min: 10, max: 20, count: 0 },
    { range: "21+", min: 20, max: Infinity, count: 0 },
  ];
  for (const q of queries) {
    const b = buckets.find((b) => q.position > b.min && q.position <= b.max);
    if (b) b.count++;
  }
  return buckets.map((b) => ({ range: b.range, queries: b.count }));
}

function buildCtrByProject(targets: Target[]) {
  return targets
    .map((t) => ({
      name: t.name.length > 18 ? `${t.name.slice(0, 16)}…` : t.name,
      ctr: t.gsc_analytics?.summary?.ctr
        ? Math.round((t.gsc_analytics.summary.ctr ?? 0) * 1000) / 10
        : null,
    }))
    .filter((x) => x.ctr !== null) as { name: string; ctr: number }[];
}

function buildOpportunities(queries: QueryRow[]) {
  return queries
    .filter((q) => q.position > 3 && q.position <= 15 && q.impressions > 0)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);
}

function buildScatterData(queries: QueryRow[]) {
  return queries
    .filter((q) => q.impressions > 0 && q.position > 0)
    .slice(0, 100)
    .map((q) => ({
      position: Math.round(q.position * 10) / 10,
      impressions: q.impressions,
      clicks: q.clicks,
      query: q.query,
    }));
}

// ── Shared components ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums mt-1">
        {value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      )}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Charts ───────────────────────────────────────────────────────────────────

function ClicksByProjectChart({ rows }: { rows: { name: string; clicks: number }[] }) {
  const c = useChartColors();
  const data = useMemo(
    () =>
      rows.map((r) => ({
        name: r.name.length > 18 ? `${r.name.slice(0, 16)}…` : r.name,
        clicks: r.clicks,
      })),
    [rows],
  );

  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
        No click data yet.
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
          barSize={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          />
          <Bar dataKey="clicks" radius={[0, 4, 4, 0]} name="Clicks">
            {data.map((d, idx) => (
              <Cell key={`${d.name}-${idx}`} fill={c.emerald} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PositionDistributionChart({
  data,
}: {
  data: { range: string; queries: number }[];
}) {
  const c = useChartColors();
  const colors = [c.emerald, c.blue, c.amber, c.rose];

  return (
    <div className="h-[200px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barSize={32}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 11, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          />
          <Bar dataKey="queries" name="Queries" radius={[4, 4, 0, 0]}>
            {data.map((d, idx) => (
              <Cell key={d.range} fill={colors[idx % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CtrByProjectChart({ data }: { data: { name: string; ctr: number }[] }) {
  const c = useChartColors();

  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
        No CTR data.
      </div>
    );
  }

  return (
    <div className="h-[200px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
          barSize={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
          <XAxis
            type="number"
            unit="%"
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => [typeof v === "number" ? `${v.toFixed(2)}%` : v, "CTR"]}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            cursor={{ fill: "var(--muted)", opacity: 0.3 }}
          />
          <Bar dataKey="ctr" radius={[0, 4, 4, 0]} name="CTR">
            {data.map((d, idx) => (
              <Cell key={`${d.name}-${idx}`} fill={c.indigo} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ImprVsPositionScatter({
  data,
}: {
  data: { position: number; impressions: number; clicks: number; query: string }[];
}) {
  const c = useChartColors();

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-muted-foreground">
        No query data.
      </div>
    );
  }

  return (
    <div className="h-[220px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} />
          <XAxis
            dataKey="position"
            name="Position"
            type="number"
            domain={[1, "dataMax"]}
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Avg Position",
              position: "insideBottom",
              offset: -2,
              fontSize: 10,
              fill: c.axis,
            }}
          />
          <YAxis
            dataKey="impressions"
            name="Impressions"
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
            }
          />
          <ZAxis dataKey="clicks" range={[30, 200]} name="Clicks" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 11,
              color: "var(--popover-foreground)",
            }}
            formatter={(value, name) => [
              typeof value === "number"
                ? (name === "Impressions" || name === "Clicks"
                    ? value.toLocaleString()
                    : value.toFixed(1))
                : value,
              name,
            ]}
          />
          <Scatter data={data} fill={c.blue} fillOpacity={0.6} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const agg = useMemo(() => aggregateGscFromTargets(targets), [targets]);
  const queries = useMemo(() => allQueries(targets), [targets]);
  const positionDist = useMemo(() => buildPositionDistribution(queries), [queries]);
  const ctrByProject = useMemo(() => buildCtrByProject(targets), [targets]);
  const opportunities = useMemo(() => buildOpportunities(queries), [queries]);
  const scatterData = useMemo(() => buildScatterData(queries), [queries]);
  const projectsWithQueries = useMemo(
    () => targets.filter((t) => (t.gsc_analytics?.top_queries?.length ?? 0) > 0),
    [targets],
  );

  const load = useCallback(async (runSync: boolean) => {
    setError("");
    try {
      const s = await getGscStatus();
      setConnected(s.connected);
      if (!s.connected) {
        setTargets(await getTargets());
        return;
      }
      if (runSync) {
        setSyncing(true);
        await syncGscTargets();
      }
      setTargets(await getTargets());
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403))
        return;
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial render should stay read-only and fast.
    // We only sync on explicit "Refresh data".
    void load(false);
  }, [load]);

  const handleRefresh = () => {
    setLoading(true);
    void load(true);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Search analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Google Search Console metrics for your Monix sites.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading || syncing || connected === false}
            onClick={handleRefresh}
          >
            {syncing || loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh data
              </>
            )}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard/sites">Sites & GSC setup</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Not connected */}
      {connected === false && (
        <>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <AlertCircle className="h-8 w-8 text-amber-400/80 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Search Console not connected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect Google Search Console from the Projects page, then
                return here and click Refresh data.
              </p>
            </div>
            <Button asChild className="shrink-0 bg-foreground text-background hover:bg-foreground/90 border-0">
              <Link href="/dashboard/sites">Go to Sites</Link>
            </Button>
          </div>
          {targets.length > 0 && !loading && (
            <SectionCard title="Your projects" subtitle="Search metrics appear after connecting Search Console.">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/20">
                    <TableHead className="text-muted-foreground text-xs">Project</TableHead>
                    <TableHead className="text-muted-foreground text-xs">URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((t) => (
                    <TableRow key={t.id} className="border-border hover:bg-muted/20">
                      <TableCell className="text-foreground/90 text-sm">{t.name}</TableCell>
                      <TableCell className="text-muted-foreground text-xs font-mono">{t.url}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </>
      )}

      {/* Loading skeletons */}
      {loading && connected !== false && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/20 border border-border animate-pulse" />
            ))}
          </div>
          <div className="h-56 rounded-xl bg-muted/20 border border-border animate-pulse" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-48 rounded-xl bg-muted/20 border border-border animate-pulse" />
            <div className="h-48 rounded-xl bg-muted/20 border border-border animate-pulse" />
          </div>
        </div>
      )}

      {/* Connected — full dashboard */}
      {!loading && connected && (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total clicks"
              value={formatCompactNumber(agg.totalClicks)}
              sub={agg.dateLabel ? `Period ${agg.dateLabel}` : "Across projects"}
              icon={MousePointerClick}
            />
            <StatCard
              label="Impressions"
              value={formatCompactNumber(agg.totalImpressions)}
              sub="Sum across projects"
              icon={Search}
            />
            <StatCard
              label="Avg position"
              value={formatPosition(agg.avgPosition)}
              sub="Weighted by impressions"
              icon={TrendingUp}
            />
            <StatCard
              label="CTR"
              value={formatPct(agg.ctr)}
              sub="Clicks ÷ impressions"
              icon={BarChart3}
            />
          </div>

          {/* Row 2: Clicks by project + CTR comparison */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard
              title="Clicks by project"
              subtitle="Projects with synced Search Console data"
              icon={MousePointerClick}
            >
              <div className="px-2 py-4">
                <ClicksByProjectChart rows={agg.byProject} />
              </div>
            </SectionCard>

            <SectionCard
              title="CTR by project"
              subtitle="Click-through rate comparison"
              icon={BarChart3}
            >
              <div className="px-2 py-4">
                <CtrByProjectChart data={ctrByProject} />
              </div>
            </SectionCard>
          </div>

          {/* Row 3: Position distribution + Impr vs Position scatter */}
          {queries.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard
                title="Position distribution"
                subtitle="How your queries rank across position bands"
                icon={TrendingUp}
              >
                <div className="px-2 py-4">
                  <PositionDistributionChart data={positionDist} />
                </div>
                <div className="px-5 pb-4 flex flex-wrap gap-3">
                  {[
                    { label: "Top 3", color: "bg-emerald-500" },
                    { label: "4–10", color: "bg-blue-400" },
                    { label: "11–20", color: "bg-amber-400" },
                    { label: "21+", color: "bg-rose-500" },
                  ].map((b) => (
                    <span key={b.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${b.color}`} />
                      {b.label}
                    </span>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Impressions vs position"
                subtitle="Bubble size = clicks. Lower position = higher rank"
                icon={Search}
              >
                <div className="px-2 py-4">
                  <ImprVsPositionScatter data={scatterData} />
                </div>
              </SectionCard>
            </div>
          )}

          {/* Keyword opportunities */}
          {opportunities.length > 0 && (
            <SectionCard
              title="Keyword opportunities"
              subtitle="Queries ranked 4–15 with high impressions — prime candidates for a ranking boost"
              icon={TrendingUp}
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent bg-muted/20">
                    <TableHead className="text-muted-foreground text-xs">Query</TableHead>
                    <TableHead className="text-muted-foreground text-xs hidden md:table-cell">Project</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-right">Pos.</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-right">Impr.</TableHead>
                    <TableHead className="text-muted-foreground text-xs text-right hidden sm:table-cell">Clicks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((q, i) => (
                    <TableRow
                      key={`opp-${i}`}
                      className="border-border hover:bg-muted/20"
                    >
                      <TableCell className="text-foreground/90 text-xs max-w-[220px]">
                        <span className="truncate block">{q.query || "—"}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                        {q.project}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-foreground/80">
                        {q.position.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-foreground/80">
                        {formatCompactNumber(q.impressions)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-foreground/80 hidden sm:table-cell">
                        {formatCompactNumber(q.clicks)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </SectionCard>
          )}

          {/* All projects table */}
          <SectionCard
            title="All projects"
            subtitle="Security scans + Search performance"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent bg-muted/20">
                  <TableHead className="text-muted-foreground text-xs">Project</TableHead>
                  <TableHead className="text-muted-foreground text-xs">URL</TableHead>
                  <TableHead className="text-muted-foreground text-xs hidden lg:table-cell">GSC property</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right">Clicks</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right hidden sm:table-cell">Impr.</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right hidden md:table-cell">CTR</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right hidden md:table-cell">Pos.</TableHead>
                  <TableHead className="text-muted-foreground text-xs hidden xl:table-cell">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.length === 0 ? (
                  <TableRow className="border-border">
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-10 text-sm">
                      No sites yet.{" "}
                      <Link href="/dashboard/sites" className="underline underline-offset-2 hover:text-foreground">
                        Add a URL
                      </Link>
                    </TableCell>
                  </TableRow>
                ) : (
                  targets.map((t) => {
                    const sum = t.gsc_analytics?.summary;
                    const hasNum =
                      sum &&
                      (sum.clicks != null ||
                        sum.impressions != null ||
                        sum.ctr != null ||
                        sum.position != null);
                    const err = t.gsc_sync_error?.trim();
                    return (
                      <TableRow key={t.id} className="border-border hover:bg-muted/20">
                        <TableCell className="text-foreground/90 text-sm font-medium">{t.name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono max-w-[200px]">
                          <span className="truncate block">{t.url}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs hidden lg:table-cell max-w-[180px]">
                          <span className="truncate block">{t.gsc_property_url || "—"}</span>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-foreground/80">
                          {hasNum ? formatCompactNumber(sum?.clicks) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-foreground/80 hidden sm:table-cell">
                          {hasNum ? formatCompactNumber(sum?.impressions) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-foreground/80 hidden md:table-cell">
                          {hasNum ? formatPct(sum?.ctr) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-foreground/80 hidden md:table-cell">
                          {hasNum ? formatPosition(sum?.position) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-amber-500 hidden xl:table-cell max-w-[220px]">
                          {err || (hasNum ? "" : connected ? "No match / no data" : "")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </SectionCard>

          {/* Top queries per project */}
          {projectsWithQueries.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">
                Top queries by project
              </h3>
              <div className="grid gap-4 lg:grid-cols-2">
                {projectsWithQueries.map((t) => {
                  const q = t.gsc_analytics?.top_queries ?? [];
                  if (q.length === 0) return null;
                  return (
                    <div key={t.id} className="rounded-xl border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{t.url}</p>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-border hover:bg-transparent bg-muted/20">
                            <TableHead className="text-muted-foreground text-[10px]">Query</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] text-right w-14">Clicks</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] text-right w-14 hidden sm:table-cell">Impr.</TableHead>
                            <TableHead className="text-muted-foreground text-[10px] text-right w-12 hidden sm:table-cell">Pos.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {q.slice(0, 8).map((row, idx) => (
                            <TableRow
                              key={`${t.id}-q-${idx}`}
                              className="border-border hover:bg-muted/20"
                            >
                              <TableCell className="text-foreground/80 text-xs max-w-[200px]">
                                <span className="truncate block">{row.query || "—"}</span>
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums text-foreground/70">
                                {formatCompactNumber(row.clicks)}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums text-foreground/70 hidden sm:table-cell">
                                {formatCompactNumber(row.impressions)}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums text-foreground/70 hidden sm:table-cell">
                                {formatPosition(row.position)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {connected === null && !loading && (
        <p className="text-sm text-muted-foreground">
          Could not determine Search Console status.
        </p>
      )}
    </div>
  );
}
