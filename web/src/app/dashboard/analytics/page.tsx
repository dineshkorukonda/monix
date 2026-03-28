"use client";

import { AlertCircle, BarChart3, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const C_GRID = "rgba(255,255,255,0.06)";
const C_AXIS = "rgba(255,255,255,0.25)";
const C_BAR = "rgba(52,211,153,0.75)";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <span className="font-semibold tabular-nums text-emerald-400">
        {p.value}
      </span>
      <span className="text-white/40 ml-1">clicks</span>
    </div>
  );
}

function ClicksByProjectChart({
  rows,
}: {
  rows: { name: string; clicks: number }[];
}) {
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
      <div className="flex h-[200px] items-center justify-center text-xs text-white/25">
        No click data yet — sync after verifying properties in Search Console.
      </div>
    );
  }

  const maxC = Math.max(...data.map((d) => d.clicks), 1);

  return (
    <div className="h-[220px] w-full min-h-[200px] min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
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
            width={110}
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
              <Cell key={`${d.name}-${d.clicks}`} fill={C_BAR} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatMini({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
        {label}
      </p>
      <p className="text-2xl font-bold text-white tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[11px] text-white/30 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const agg = useMemo(() => aggregateGscFromTargets(targets), [targets]);

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
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        return;
      }
      setError(e instanceof Error ? e.message : "Failed to load analytics");
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  const handleRefresh = () => {
    setLoading(true);
    void load(true);
  };

  const projectsWithQueries = targets.filter(
    (t) => (t.gsc_analytics?.top_queries?.length ?? 0) > 0,
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Search analytics
          </h2>
          <p className="text-sm text-white/35 mt-0.5">
            Google Search Console metrics for your Monix projects (verified
            properties only).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            disabled={loading || syncing || connected === false}
            onClick={() => handleRefresh()}
            className="border-white/15 hover:bg-white/5 text-white"
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
          <Button
            asChild
            variant="secondary"
            className="bg-white/10 hover:bg-white/15 text-white border border-white/10"
          >
            <Link href="/dashboard/projects">Projects &amp; GSC setup</Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200/90">
          {error}
        </div>
      )}

      {connected === false && (
        <>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <AlertCircle className="h-8 w-8 text-amber-400/80 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white">
                Search Console not connected
              </p>
              <p className="text-xs text-white/45 mt-1">
                Connect Google Search Console from the Projects page, then
                return here and click Refresh data.
              </p>
            </div>
            <Button
              asChild
              className="bg-white text-black hover:bg-white/90 shrink-0"
            >
              <Link href="/dashboard/projects">Go to Projects</Link>
            </Button>
          </div>
          {targets.length > 0 && !loading && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <p className="text-sm font-semibold text-white">
                  Your projects
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  Search metrics appear after you connect Search Console and
                  refresh.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                    <TableHead className="text-white/45 text-xs">
                      Project
                    </TableHead>
                    <TableHead className="text-white/45 text-xs">URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targets.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-white/10 hover:bg-white/[0.03]"
                    >
                      <TableCell className="text-white/90 text-sm">
                        {t.name}
                      </TableCell>
                      <TableCell className="text-white/45 text-xs font-mono">
                        {t.url}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      {loading && connected !== false ? (
        <div className="space-y-4">
          <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse"
              />
            ))}
          </div>
          <div className="h-56 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
        </div>
      ) : (
        <>
          {connected && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatMini
                  label="Total clicks"
                  value={formatCompactNumber(agg.totalClicks)}
                  sub={
                    agg.dateLabel
                      ? `Period ${agg.dateLabel}`
                      : "Across projects with data"
                  }
                />
                <StatMini
                  label="Impressions"
                  value={formatCompactNumber(agg.totalImpressions)}
                  sub="Sum across projects"
                />
                <StatMini
                  label="Avg position"
                  value={formatPosition(agg.avgPosition)}
                  sub="Weighted by impressions"
                />
                <StatMini
                  label="CTR"
                  value={formatPct(agg.ctr)}
                  sub="Clicks ÷ impressions"
                />
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-white/40" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Clicks by project
                    </p>
                    <p className="text-xs text-white/30 mt-0.5">
                      Projects with synced Search Console data
                    </p>
                  </div>
                </div>
                <div className="px-2 py-4">
                  <ClicksByProjectChart rows={agg.byProject} />
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white">
                    All projects
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">
                    Security scans + Search performance when the domain matches
                    a verified GSC property
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                      <TableHead className="text-white/45 text-xs">
                        Project
                      </TableHead>
                      <TableHead className="text-white/45 text-xs">
                        URL
                      </TableHead>
                      <TableHead className="text-white/45 text-xs hidden lg:table-cell">
                        GSC property
                      </TableHead>
                      <TableHead className="text-white/45 text-xs text-right">
                        Clicks
                      </TableHead>
                      <TableHead className="text-white/45 text-xs text-right hidden sm:table-cell">
                        Impr.
                      </TableHead>
                      <TableHead className="text-white/45 text-xs text-right hidden md:table-cell">
                        CTR
                      </TableHead>
                      <TableHead className="text-white/45 text-xs text-right hidden md:table-cell">
                        Pos.
                      </TableHead>
                      <TableHead className="text-white/45 text-xs hidden xl:table-cell">
                        Note
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {targets.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell
                          colSpan={8}
                          className="text-center text-white/35 py-10 text-sm"
                        >
                          No projects yet.{" "}
                          <Link
                            href="/dashboard/projects"
                            className="text-white/55 hover:text-white underline underline-offset-2"
                          >
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
                          <TableRow
                            key={t.id}
                            className="border-white/10 hover:bg-white/[0.03]"
                          >
                            <TableCell className="text-white/90 text-sm font-medium">
                              {t.name}
                            </TableCell>
                            <TableCell className="text-white/45 text-xs font-mono max-w-[200px]">
                              <span className="truncate block">{t.url}</span>
                            </TableCell>
                            <TableCell className="text-white/40 text-xs hidden lg:table-cell max-w-[180px]">
                              <span className="truncate block">
                                {t.gsc_property_url || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-white/80">
                              {hasNum ? formatCompactNumber(sum?.clicks) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-white/80 hidden sm:table-cell">
                              {hasNum
                                ? formatCompactNumber(sum?.impressions)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-white/80 hidden md:table-cell">
                              {hasNum ? formatPct(sum?.ctr) : "—"}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-white/80 hidden md:table-cell">
                              {hasNum ? formatPosition(sum?.position) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-amber-400/90 hidden xl:table-cell max-w-[220px]">
                              {err ||
                                (hasNum
                                  ? ""
                                  : connected
                                    ? "No match / no data"
                                    : "")}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {projectsWithQueries.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-white">
                    Top queries
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {projectsWithQueries.map((t) => {
                      const q = t.gsc_analytics?.top_queries ?? [];
                      if (q.length === 0) return null;
                      return (
                        <div
                          key={t.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                        >
                          <div className="px-4 py-3 border-b border-white/[0.06]">
                            <p className="text-sm font-medium text-white">
                              {t.name}
                            </p>
                            <p className="text-[10px] text-white/35 font-mono truncate mt-0.5">
                              {t.url}
                            </p>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                                <TableHead className="text-white/45 text-[10px]">
                                  Query
                                </TableHead>
                                <TableHead className="text-white/45 text-[10px] text-right w-14">
                                  Clicks
                                </TableHead>
                                <TableHead className="text-white/45 text-[10px] text-right w-14 hidden sm:table-cell">
                                  Impr.
                                </TableHead>
                                <TableHead className="text-white/45 text-[10px] text-right w-12 hidden sm:table-cell">
                                  Pos.
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {q.slice(0, 8).map((row, idx) => (
                                <TableRow
                                  key={`${t.id}-q-${idx}`}
                                  className="border-white/10 hover:bg-white/[0.03]"
                                >
                                  <TableCell className="text-white/80 text-xs max-w-[200px]">
                                    <span className="truncate block">
                                      {row.query || "—"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums text-white/70">
                                    {formatCompactNumber(row.clicks)}
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums text-white/70 hidden sm:table-cell">
                                    {formatCompactNumber(row.impressions)}
                                  </TableCell>
                                  <TableCell className="text-right text-xs tabular-nums text-white/70 hidden sm:table-cell">
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
            <p className="text-sm text-white/35">
              Could not determine Search Console status.
            </p>
          )}
        </>
      )}
    </div>
  );
}
