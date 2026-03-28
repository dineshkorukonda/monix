"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  ExternalLink,
  Globe,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type DashboardData,
  getDashboardData,
  getScans,
  getTargets,
  type ScanSummary,
  type Target,
} from "@/lib/api";

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-tight">
        Healthy
      </span>
    );
  }
  if (score >= 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-tight">
        Warning
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-tight">
      Critical
    </span>
  );
}

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<Target[]>([]);
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [targetsData, scansData, dashboardData] = await Promise.all([
          getTargets(),
          getScans(),
          getDashboardData().catch(() => null),
        ]);
        setProjects(targetsData);
        setScans(scansData.slice(0, 5)); // Only show last 5 in the summary table
        setStats(dashboardData);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const totalTargets = projects.length;
  const avgScore =
    projects.length > 0
      ? Math.round(
          projects.reduce((acc, p) => acc + (p.score || 0), 0) /
            projects.length,
        )
      : 0;
  const activeAlerts = stats?.alerts.length || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Workspace Overview
          </h2>
          <p className="text-white/50 mt-1">
            Real-time security telemetry and target monitoring.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            asChild
            variant="outline"
            className="border-white/10 hover:bg-white/5 h-11 px-6"
          >
            <Link href="/dashboard/scans">View All Logs</Link>
          </Button>
          <Button
            asChild
            className="bg-white text-black hover:bg-white/90 font-bold h-11 px-6 gap-2"
          >
            <Link href="/dashboard/new">
              <Plus className="h-4 w-4" />
              Add Target
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Monitored Targets
            </CardTitle>
            <Globe className="h-4 w-4 text-white/20" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalTargets}</div>
            <p className="text-[10px] text-white/30 mt-1">
              Across all environments
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Avg Security Score
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-white/20" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{avgScore}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-white/5 rounded-full h-1">
                <div
                  className="bg-white h-full rounded-full transition-all duration-1000"
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
              Active Alerts
            </CardTitle>
            <ShieldAlert className="h-4 w-4 text-rose-500/50" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeAlerts}</div>
            <p className="text-[10px] text-rose-500/50 mt-1 font-bold uppercase tracking-tighter">
              {activeAlerts > 0 ? "Action Required" : "System Secured"}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-widest">
              Network Traffic
            </CardTitle>
            <Activity className="h-4 w-4 text-white/20" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {stats?.traffic_summary.total_requests || 0}
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              Requests / 10m window
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Main Projects List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Active Projects</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.length === 0 && !loading && (
              <div className="col-span-full border border-dashed border-white/10 rounded-2xl p-12 text-center">
                <p className="text-white/30 text-sm">
                  No targets being monitored yet.
                </p>
                <Button asChild variant="link" className="text-white mt-2">
                  <Link href="/dashboard/new">Add your first target</Link>
                </Button>
              </div>
            )}
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/project/${project.id}?url=${encodeURIComponent(project.url)}`}
                className="group relative flex flex-col bg-card/40 border border-white/5 hover:border-white/20 transition-all rounded-2xl p-5 overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white font-bold text-sm border border-white/10 group-hover:bg-white group-hover:text-black transition-colors">
                    {project.name.charAt(0)}
                  </div>
                  <ScoreBadge score={project.score || 0} />
                </div>
                <div>
                  <h4 className="font-bold text-white group-hover:underline underline-offset-4 decoration-white/30">
                    {project.name}
                  </h4>
                  <p className="text-xs text-white/40 truncate font-mono mt-1">
                    {project.url}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider font-bold">
                    Last scan {project.lastScan}
                  </span>
                  <ArrowRight className="h-3 w-3 text-white/20 group-hover:text-white transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Scans / Logs Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Security Logs</h3>
            <Link
              href="/dashboard/scans"
              className="text-[10px] font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors"
            >
              View All
            </Link>
          </div>
          <div className="bg-card/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
            {scans.length === 0 && !loading && (
              <div className="p-8 text-center">
                <p className="text-white/20 text-xs italic">
                  No security logs recorded.
                </p>
              </div>
            )}
            {scans.map((scan, i) => (
              <Link
                key={scan.id}
                href={`/report/${scan.report_id}`}
                className={`flex flex-col p-4 hover:bg-white/5 transition-colors ${
                  i !== scans.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  <span className="text-xs font-bold text-white truncate max-w-[180px]">
                    {scan.target_name}
                  </span>
                  <span
                    className={`text-[10px] font-black ${
                      scan.score >= 80
                        ? "text-emerald-500"
                        : scan.score >= 50
                          ? "text-amber-500"
                          : "text-rose-500"
                    }`}
                  >
                    {scan.score}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30 truncate max-w-[200px] font-mono">
                    {scan.url.replace(/^https?:\/\//, "")}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {new Date(scan.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            ))}
            <div className="p-4 bg-white/[0.02] border-t border-white/5">
              <Button
                asChild
                variant="ghost"
                className="w-full text-xs text-white/40 hover:text-white hover:bg-white/5 h-9 font-bold"
              >
                <Link href="/dashboard/scans" className="gap-2">
                  <Activity className="h-3 w-3" />
                  Full Audit History
                </Link>
              </Button>
            </div>
          </div>

          {/* System Health Card */}
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-3 w-3 text-amber-500" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/50">CPU Usage</span>
                  <span className="text-white/80 font-bold">
                    {stats?.system_stats.cpu_percent || 0}%
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-500"
                    style={{
                      width: `${stats?.system_stats.cpu_percent || 0}%`,
                    }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/50">Memory</span>
                  <span className="text-white/80 font-bold">
                    {stats?.system_stats.memory_percent || 0}%
                  </span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all duration-500"
                    style={{
                      width: `${stats?.system_stats.memory_percent || 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
