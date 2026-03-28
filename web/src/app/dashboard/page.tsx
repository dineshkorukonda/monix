"use client";

import {
  Activity,
  ArrowRight,
  ChevronRight,
  Globe,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  type DashboardData,
  getDashboardData,
  getScans,
  getTargets,
  type ScanSummary,
  type Target,
} from "@/lib/api";

function scanScoreClass(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [projectCount, setProjectCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [recentScans, setRecentScans] = useState<ScanSummary[]>([]);
  const [projectsPreview, setProjectsPreview] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const logErr = (src: string, err: unknown) => {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          return;
        }
        console.error(`Overview load error (${src}):`, err);
      };

      try {
        const [dashR, targetsR, scansR] = await Promise.allSettled([
          getDashboardData(),
          getTargets(),
          getScans(),
        ]);
        if (dashR.status === "fulfilled") setStats(dashR.value);
        else {
          logErr("dashboard-api", dashR.reason);
          setStats(null);
        }
        if (targetsR.status === "fulfilled") {
          const targets = targetsR.value;
          setProjectCount(targets.length);
          setProjectsPreview(targets.slice(0, 8));
          setAvgScore(
            targets.length > 0
              ? Math.round(
                  targets.reduce((acc, p) => acc + (p.score ?? 0), 0) /
                    targets.length,
                )
              : 0,
          );
        } else {
          logErr("targets", targetsR.reason);
          setProjectCount(0);
          setAvgScore(0);
          setProjectsPreview([]);
        }
        if (scansR.status === "fulfilled") {
          const list = scansR.value;
          setScanCount(list.length);
          setRecentScans(list.slice(0, 12));
        } else {
          logErr("scans", scansR.reason);
          setScanCount(0);
          setRecentScans([]);
        }
      } catch (e) {
        logErr("overview", e);
        setStats(null);
        setProjectCount(0);
        setAvgScore(0);
        setScanCount(0);
        setRecentScans([]);
        setProjectsPreview([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeAlerts = stats?.alerts.length ?? 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Overview
          </h2>
          <p className="text-white/50 mt-1 text-sm max-w-lg">
            High-level stats for your workspace. Manage URLs and open reports
            from{" "}
            <Link
              href="/dashboard/projects"
              className="text-white/80 hover:text-white underline underline-offset-2"
            >
              Projects
            </Link>
            .
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            variant="outline"
            className="border-white/10 hover:bg-white/5"
          >
            <Link href="/dashboard/projects">Projects</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/10 hover:bg-white/5"
          >
            <Link href="/dashboard/scans">Scan history</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-white/40">Loading…</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
                  Projects
                </CardTitle>
                <Globe className="h-4 w-4 text-white/20" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {projectCount}
                </div>
                <p className="text-[10px] text-white/30 mt-1">Monitored URLs</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
                  Avg security score
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-white/20" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">{avgScore}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-white/5 rounded-full h-1">
                    <div
                      className="bg-white h-full rounded-full transition-all"
                      style={{ width: `${avgScore}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-white/30">/ 100</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
                  Active alerts
                </CardTitle>
                <ShieldAlert className="h-4 w-4 text-rose-500/50" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {activeAlerts}
                </div>
                <p className="text-[10px] text-rose-500/50 mt-1 font-bold uppercase tracking-tighter">
                  {activeAlerts > 0 ? "Review signals" : "All clear"}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
                  Network traffic
                </CardTitle>
                <Activity className="h-4 w-4 text-white/20" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {stats?.traffic_summary.total_requests ?? 0}
                </div>
                <p className="text-[10px] text-white/30 mt-1">
                  Requests / 10m window
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card/40 border-white/10 overflow-hidden">
              <CardHeader className="pb-2 border-b border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-white">
                    Recent scans
                  </CardTitle>
                  <Link
                    href="/dashboard/scans"
                    className="text-xs text-white/45 hover:text-white transition-colors"
                  >
                    All scans →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {recentScans.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-white/45">
                    No saved scans yet. Run one from a{" "}
                    <Link
                      href="/dashboard/projects"
                      className="text-white/70 hover:underline"
                    >
                      project
                    </Link>
                    .
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                        <TableHead className="text-white/45 text-xs w-[140px]">
                          When
                        </TableHead>
                        <TableHead className="text-white/45 text-xs">
                          Target
                        </TableHead>
                        <TableHead className="text-white/45 text-xs text-right w-16">
                          Score
                        </TableHead>
                        <TableHead className="text-white/45 text-xs text-right w-14">
                          Report
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentScans.map((scan) => (
                        <TableRow
                          key={scan.id}
                          className="border-white/10 hover:bg-white/[0.03]"
                        >
                          <TableCell className="text-white/50 text-[11px] whitespace-nowrap align-top pt-3">
                            {new Date(scan.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-white/75 max-w-[1px]">
                            <span className="block truncate" title={scan.url}>
                              {scan.target_name}
                            </span>
                            <span
                              className="block truncate text-[10px] text-white/35 font-mono mt-0.5"
                              title={scan.url}
                            >
                              {scan.url}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums text-sm align-top pt-3 ${scanScoreClass(scan.score)}`}
                          >
                            {scan.score}
                          </TableCell>
                          <TableCell className="text-right align-top pt-3">
                            <Link
                              href={`/dashboard/report/${scan.report_id}`}
                              className="inline-flex items-center gap-0.5 text-xs text-white/45 hover:text-white"
                              aria-label="Open report"
                            >
                              Open
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/40 border-white/10 overflow-hidden">
              <CardHeader className="pb-2 border-b border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-white">
                    Projects
                  </CardTitle>
                  <Link
                    href="/dashboard/projects"
                    className="text-xs text-white/45 hover:text-white transition-colors"
                  >
                    Manage →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {projectsPreview.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-white/45">
                    Add a URL on the Projects page to start monitoring.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                        <TableHead className="text-white/45 text-xs">
                          Name
                        </TableHead>
                        <TableHead className="text-white/45 text-xs text-right w-16">
                          Score
                        </TableHead>
                        <TableHead className="text-white/45 text-xs text-right w-14">
                          Open
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectsPreview.map((p) => (
                        <TableRow
                          key={p.id}
                          className="border-white/10 hover:bg-white/[0.03]"
                        >
                          <TableCell className="text-xs max-w-[1px]">
                            <span className="block font-medium text-white/90 truncate">
                              {p.name}
                            </span>
                            <span
                              className="block truncate text-[10px] text-white/35 font-mono mt-0.5"
                              title={p.url}
                            >
                              {p.url}
                            </span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums text-sm ${scanScoreClass(p.score ?? 0)}`}
                          >
                            {p.score ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/project/${p.id}`}
                              className="inline-flex text-xs text-white/45 hover:text-white"
                            >
                              Workspace
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/40 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white">
                At a glance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-white/60">
              <p>
                <span className="text-white font-medium">{scanCount}</span>{" "}
                saved scan{scanCount !== 1 ? "s" : ""} across your workspace.
              </p>
              <p>
                API engine:{" "}
                <span className="text-white/80">
                  {stats ? "connected" : "unavailable"}
                </span>
                {stats && (
                  <>
                    {" "}
                    · CPU{" "}
                    <span className="text-white">
                      {Math.round(stats.system_stats.cpu_percent ?? 0)}%
                    </span>
                    · Memory{" "}
                    <span className="text-white">
                      {Math.round(stats.system_stats.memory_percent ?? 0)}%
                    </span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/dashboard/projects"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:underline"
                >
                  View all projects
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/dashboard/scans"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white hover:underline"
                >
                  Browse scan log
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
