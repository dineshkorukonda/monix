"use client";

import type React from "react";
import {
  Activity,
  ArrowRight,
  ChevronRight,
  Clock,
  Globe,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  type DashboardData,
  getDashboardData,
  getScans,
  getTargets,
  type ScanSummary,
  type Target,
} from "@/lib/api";

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 80
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : score >= 50
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-rose-500/10 text-rose-400 border-rose-500/20";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border tabular-nums ${cls}`}
    >
      {score}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
          {label}
        </p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent ?? "bg-white/5"}`}>
          <Icon className="h-4 w-4 text-white/50" />
        </div>
      </div>
      <div className="text-3xl font-bold text-white tabular-nums">{value}</div>
      {sub && <p className="text-xs text-white/30">{sub}</p>}
    </div>
  );
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
        )
          return;
        console.error(`Overview load error (${src}):`, err);
      };

      try {
        const [dashR, targetsR, scansR] = await Promise.allSettled([
          getDashboardData(),
          getTargets(),
          getScans(),
        ]);
        if (dashR.status === "fulfilled") setStats(dashR.value);
        else logErr("dashboard-api", dashR.reason);

        if (targetsR.status === "fulfilled") {
          const targets = targetsR.value;
          setProjectCount(targets.length);
          setProjectsPreview(targets.slice(0, 6));
          const scored = targets.filter((p) => p.score != null);
          setAvgScore(
            scored.length > 0
              ? Math.round(
                  scored.reduce((acc, p) => acc + (p.score ?? 0), 0) /
                    scored.length,
                )
              : 0,
          );
        } else {
          logErr("targets", targetsR.reason);
        }

        if (scansR.status === "fulfilled") {
          const list = scansR.value;
          setScanCount(list.length);
          setRecentScans(list.slice(0, 8));
        } else {
          logErr("scans", scansR.reason);
        }
      } catch (e) {
        logErr("overview", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const activeAlerts = stats?.alerts.length ?? 0;

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-20">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
          <div className="h-72 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Overview</h2>
          <p className="text-sm text-white/40 mt-1">
            Your workspace at a glance.
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Projects"
          value={projectCount}
          sub="Monitored URLs"
          icon={Globe}
        />
        <StatCard
          label="Avg score"
          value={avgScore}
          sub="Across all projects"
          icon={ShieldCheck}
          accent={avgScore >= 80 ? "bg-emerald-500/10" : avgScore >= 50 ? "bg-amber-500/10" : "bg-rose-500/10"}
        />
        <StatCard
          label="Alerts"
          value={activeAlerts}
          sub={activeAlerts > 0 ? "Needs attention" : "All clear"}
          icon={ShieldAlert}
          accent={activeAlerts > 0 ? "bg-rose-500/10" : "bg-white/5"}
        />
        <StatCard
          label="Total scans"
          value={scanCount}
          sub="Saved in workspace"
          icon={Activity}
        />
      </div>

      {/* Recent scans + Projects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent scans */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Recent scans</h3>
            <Link
              href="/dashboard/scans"
              className="inline-flex items-center gap-0.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              All scans
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentScans.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-white/30">
              No scans yet.{" "}
              <Link
                href="/dashboard/projects"
                className="text-white/60 hover:text-white underline underline-offset-2"
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
                      <Clock className="h-2.5 w-2.5 text-white/25 shrink-0" />
                      <p className="text-[10px] text-white/30 truncate">
                        {new Date(scan.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <ScorePill score={scan.score} />
                  <Link
                    href={`/dashboard/report/${scan.report_id}`}
                    className="inline-flex items-center text-xs text-white/30 hover:text-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projects preview */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white">Projects</h3>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-0.5 text-xs text-white/40 hover:text-white transition-colors"
            >
              Manage
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {projectsPreview.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-white/30">
              No projects yet.{" "}
              <Link
                href="/dashboard/projects"
                className="text-white/60 hover:text-white underline underline-offset-2"
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
                    <p className="text-[10px] text-white/30 font-mono truncate mt-0.5">
                      {p.url}
                    </p>
                  </div>
                  {p.score != null ? (
                    <ScorePill score={p.score} />
                  ) : (
                    <span className="text-xs text-white/20">—</span>
                  )}
                  <Link
                    href={`/dashboard/project/${p.id}`}
                    className="inline-flex items-center text-xs text-white/30 hover:text-white transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/40">
        <div className="flex items-center gap-1.5">
          <div className={`h-1.5 w-1.5 rounded-full ${stats ? "bg-emerald-400" : "bg-rose-400"}`} />
          API engine{" "}
          <span className={stats ? "text-white/70" : "text-rose-400"}>
            {stats ? "connected" : "unavailable"}
          </span>
        </div>
        {stats && (
          <>
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              CPU{" "}
              <span className="text-white/70">
                {Math.round(stats.system_stats.cpu_percent ?? 0)}%
              </span>
            </div>
            <div>
              Memory{" "}
              <span className="text-white/70">
                {Math.round(stats.system_stats.memory_percent ?? 0)}%
              </span>
            </div>
            <div>
              Traffic{" "}
              <span className="text-white/70">
                {stats.traffic_summary.total_requests} req / 10m
              </span>
            </div>
          </>
        )}
        <div className="ml-auto flex gap-3">
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            Projects <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/scans"
            className="inline-flex items-center gap-1 text-white/50 hover:text-white transition-colors"
          >
            Scan log <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
