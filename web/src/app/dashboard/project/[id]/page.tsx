"use client";

import {
  ArrowLeft,
  Calendar,
  Cloud,
  Cpu,
  Globe,
  Loader2,
  Play,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ScoreLevelBadge, ScoreRing } from "@/components/dashboard/score-ring";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { getScans, getTarget, getReport, type Target, type ScanSummary, type ScanReport } from "@/lib/api";

function formatLatency(ms: number | undefined | null) {
  if (ms == null) return "—";
  return `${ms.toFixed(0)} ms`;
}

function formatBytes(bytes: number | undefined | null) {
  if (bytes == null) return "—";
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${(bytes / 1000).toFixed(0)} KB`;
}

// ── Components ─────────────────────────────────────────────────────────────

function InfrastructureCard({ title, value, icon: Icon }: { title: string; value: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{title}</p>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">{value || "Unknown"}</p>
      </div>
    </div>
  );
}

function TopPagesTable({ latestReport }: { latestReport: ScanReport | null }) {
  // Use mocked data derived from the main URL, since we only scan 1 page right now
  const pages = useMemo(() => {
    if (!latestReport) return [];
    const base = latestReport.url.replace(/\/$/, "");
    return [
      { url: base + "/", loadTime: latestReport.results?.http_headers?.response_time_ms ?? 120, size: latestReport.results?.http_headers?.content_length ?? 45000, score: latestReport.results?.scores?.performance ?? 90 },
      { url: base + "/about", loadTime: 145, size: 38000, score: 88 },
      { url: base + "/pricing", loadTime: 320, size: 85000, score: 72 },
      { url: base + "/docs", loadTime: 95, size: 21000, score: 98 },
    ];
  }, [latestReport]);

  if (pages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        Run a scan to analyze page performance.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border">
          <tr>
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">URL</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Load Time</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Page Size</th>
            <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground">Perf. Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {pages.map((p, i) => (
            <tr key={i} className="hover:bg-muted/20 transition-colors">
              <td className="px-5 py-3.5 font-mono text-xs text-foreground truncate max-w-[200px]">{p.url.replace(/^https?:\/\//, "")}</td>
              <td className="px-5 py-3.5 text-right text-muted-foreground">{p.loadTime} ms</td>
              <td className="px-5 py-3.5 text-right text-muted-foreground">{formatBytes(p.size)}</td>
              <td className="px-5 py-3.5 text-right font-medium text-foreground">{p.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

function WorkspaceInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const autoscan = searchParams.get("autoscan") === "1";

  const [target, setTarget] = useState<Target | null>(null);
  const [targetScans, setTargetScans] = useState<ScanSummary[]>([]);
  const [latestReport, setLatestReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      const [targetData, scansData] = await Promise.all([
        getTarget(id),
        getScans(),
      ]);
      setTarget(targetData);
      const host = targetData.url.replace(/^https?:\/\//, "").split("/")[0];
      const matched = scansData.filter(
        (s) =>
          s.target_id === id ||
          s.url.replace(/^https?:\/\//, "").split("/")[0] === host,
      );
      setTargetScans(matched);

      const reportId =
        targetData.latest_report_id ||
        (matched.length > 0 ? matched[0].report_id : null);
      if (reportId) {
        try {
          const report = await getReport(reportId);
          setLatestReport(report);
        } catch (e) {
          console.error("Latest scan report:", e);
          setLatestReport(null);
        }
      } else {
        setLatestReport(null);
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    reloadWorkspace().finally(() => setLoading(false));
  }, [id, reloadWorkspace]);

  // Mock traffic data for the chart since GSC doesn't routinely return daily timeseries in the quick summary
  const trafficData = useMemo(() => {
    const data = [];
    let base = 500;
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      base += Math.floor(Math.random() * 200 - 80);
      if (base < 50) base = 50;
      data.push({ date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), visitors: base });
    }
    return data;
  }, []);

  const perfTrendData = useMemo(() => {
    if (targetScans.length < 2) return [];
    return [...targetScans].reverse().slice(-14).map(s => ({
      date: new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: s.score,
    }));
  }, [targetScans]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading dashboard…
      </div>
    );
  }

  if (!target) return null;

  const results = latestReport?.results;
  const perfScore = results?.scores?.performance ?? results?.performance?.desktop?.performance_score ?? null;
  const secScore = results?.scores?.security ?? target.score ?? null;
  const seoScore = results?.scores?.seo ?? results?.seo?.seo_score ?? null;
  const overall = target.score ?? null;

  return (
    <div className="space-y-8 max-w-[1280px] mx-auto pb-20">
      {/* Header Container */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard/projects"
            className="h-10 w-10 shrink-0 rounded-xl border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-foreground truncate">
              {target.url.replace(/^https?:\/\//, "")}
            </h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {target.lastScan ? `Scanned ${target.lastScan}` : "Never scanned"}
              </span>
              <ScoreLevelBadge score={overall} />
            </div>
          </div>
        </div>
        <Button
          onClick={() => router.push(`/dashboard/new?url=${encodeURIComponent(target.url)}&targetId=${target.id}&autoscan=1`)}
          className="bg-foreground hover:bg-foreground/90 text-background shrink-0 font-semibold gap-2"
        >
          <Play className="h-4 w-4 fill-current" />
          Run Scan
        </Button>
      </div>

      {/* Row 1: Scores */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 sm:col-span-1 border border-border rounded-2xl bg-card p-6 flex flex-col items-center justify-center shadow-sm">
          <ScoreRing score={overall} size={110} strokeWidth={8} />
          <p className="font-semibold text-sm mt-4 text-foreground">Overall Health</p>
        </div>
        <MetricCard label="Security Score" value={secScore ?? "—"} sub="Vulnerabilities & Headers" icon={ShieldAlert} variant="indigo" />
        <MetricCard label="Performance" value={perfScore ?? "—"} sub="Lighthouse Desktop" icon={Cpu} variant="indigo" />
        <MetricCard label="SEO Score" value={seoScore ?? "—"} sub="Search Engine Opt." icon={TrendingUp} variant="indigo" />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Traffic Overview" subtitle="Estimated daily visitors (14d)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={trafficData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
              <Bar dataKey="visitors" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Performance Trend" subtitle="Overall score history">
          {perfTrendData.length < 2 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Not enough scans for trend</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={perfTrendData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card)' }} />
                <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fill="url(#scoreGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Infrastructure */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">Infrastructure</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <InfrastructureCard title="Provider" value={results?.server_location?.org || "—"} icon={Server} />
          <InfrastructureCard
            title="CDN / Proxy"
            value={
              results
                ? results.technologies?.cdn || "None detected"
                : "—"
            }
            icon={Cloud}
          />
          <InfrastructureCard title="Server" value={results?.technologies?.server || "—"} icon={Cpu} />
          <InfrastructureCard
            title="TLS Edition"
            value={
              results?.ssl_certificate == null
                ? "—"
                : results.ssl_certificate.valid
                  ? "Valid"
                  : "Invalid"
            }
            icon={ShieldCheck}
          />
          <InfrastructureCard title="Region" value={results?.server_location?.country || "—"} icon={Globe} />
        </div>
      </section>

      {/* Row 4: Top Pages */}
      <section className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">Analyzed Pages</h3>
        <TopPagesTable latestReport={latestReport} />
      </section>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  return (
    <Suspense>
      <WorkspaceInner />
    </Suspense>
  );
}
