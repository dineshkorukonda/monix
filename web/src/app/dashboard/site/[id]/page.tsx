"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Cloud,
  Cpu,
  Globe,
  Loader2,
  Play,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { GscProjectWorkspaceSection } from "@/components/gsc-metrics";
import {
  analyzeUrl,
  getScans,
  getTarget,
  getReport,
  type StoredReportResults,
  type Target,
  type ScanSummary,
  type ScanReport,
} from "@/lib/api";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────────────────────────────

const PORT_SERVICES: Record<number, string> = {
  21: "FTP", 22: "SSH", 25: "SMTP", 53: "DNS", 80: "HTTP", 110: "POP3",
  143: "IMAP", 443: "HTTPS", 465: "SMTPS", 587: "SMTP/TLS", 993: "IMAPS",
  995: "POP3S", 3306: "MySQL", 5432: "PostgreSQL", 6379: "Redis",
  8080: "HTTP-Alt", 8443: "HTTPS-Alt", 8888: "HTTP-Dev", 9200: "Elasticsearch",
  27017: "MongoDB",
};

// ── Shared sub-components ───────────────────────────────────────────────────

function InfrastructureCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card shadow-sm">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {title}
        </p>
        <p className="text-sm font-medium text-foreground truncate mt-0.5">
          {value || "Unknown"}
        </p>
      </div>
    </div>
  );
}

// ── Collapsible section wrapper ─────────────────────────────────────────────

function ScanSection({
  title,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          {badge}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform shrink-0",
            open ? "rotate-180" : "",
          )}
        />
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

// ── Port scan section ───────────────────────────────────────────────────────

function PortsSection({ r }: { r: StoredReportResults }) {
  const scan = r.port_scan;
  if (!scan || ("error" in scan && scan.error === "No IP address resolved")) return null;

  const openPorts = [...(scan.open_ports ?? [])].sort((a, b) => a - b);
  const filteredPorts = [...(scan.filtered_ports ?? [])].sort((a, b) => a - b);

  const badge =
    openPorts.length > 0 ? (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
        {openPorts.length} open
      </span>
    ) : (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
        Clean
      </span>
    );

  return (
    <ScanSection title="Network — Open Ports" badge={badge}>
      {openPorts.length === 0 && filteredPorts.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          No open ports detected from the scanned set.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Port</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Service</th>
              <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {openPorts.map((port) => (
              <tr key={port} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3 font-mono text-foreground">{port}</td>
                <td className="px-5 py-3 text-muted-foreground">{PORT_SERVICES[port] ?? "Unknown"}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Open
                  </span>
                </td>
              </tr>
            ))}
            {filteredPorts.map((port) => (
              <tr key={port} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-3 font-mono text-muted-foreground/60">{port}</td>
                <td className="px-5 py-3 text-muted-foreground/60">{PORT_SERVICES[port] ?? "Unknown"}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                    Filtered
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ScanSection>
  );
}

// ── SSL certificate section ─────────────────────────────────────────────────

function SslSection({ r }: { r: StoredReportResults }) {
  const ssl = r.ssl_certificate;
  if (!ssl) return null;

  const subject =
    typeof ssl.subject === "object" && ssl.subject !== null ? ssl.subject : {};
  const issuer =
    typeof ssl.issuer === "object" && ssl.issuer !== null ? ssl.issuer : {};

  const rows: [string, string, boolean?][] = [
    [
      "Status",
      ssl.valid ? "Valid" : ssl.error ?? "Invalid",
      ssl.valid,
    ],
    [
      "Subject",
      (subject as Record<string, string>).commonName ||
        (subject as Record<string, string>).CN ||
        (typeof ssl.subject === "string" ? ssl.subject : "") ||
        "—",
    ],
    [
      "Issuer",
      (issuer as Record<string, string>).organizationName ||
        (issuer as Record<string, string>).O ||
        (typeof ssl.issuer === "string" ? ssl.issuer : "") ||
        "—",
    ],
    [
      "Issued",
      ssl.renewed
        ? new Date(ssl.renewed).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—",
    ],
    [
      "Expires",
      ssl.expires
        ? new Date(ssl.expires).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "—",
    ],
  ];

  const badge = ssl.valid ? (
    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
      Valid
    </span>
  ) : (
    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
      Invalid
    </span>
  );

  return (
    <ScanSection title="SSL / TLS Certificate" badge={badge}>
      <dl className="divide-y divide-border">
        {rows.map(([label, value, isPass]) => (
          <div key={label} className="flex items-center gap-4 px-5 py-3">
            <dt className="w-20 shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </dt>
            <dd
              className={cn(
                "text-sm break-all",
                label === "Status"
                  ? isPass
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-rose-600 dark:text-rose-400 font-semibold"
                  : "text-foreground",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </ScanSection>
  );
}

// ── DNS records section ─────────────────────────────────────────────────────

function DnsSection({ r }: { r: StoredReportResults }) {
  const dns = r.dns_records;
  if (!dns || dns.error) return null;

  const sections: [string, string[]][] = (
    [
      ["A", dns.a ?? []],
      ["AAAA", dns.aaaa ?? []],
      ["MX", dns.mx ?? []],
      ["NS", dns.ns ?? []],
      ["TXT", dns.txt ?? []],
    ] as [string, string[]][]
  ).filter(([, v]) => v.length > 0);

  if (sections.length === 0) return null;

  const badge = (
    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
      {sections.reduce((acc, [, v]) => acc + v.length, 0)} records
    </span>
  );

  return (
    <ScanSection title="DNS Records" badge={badge} defaultOpen={false}>
      <div className="divide-y divide-border">
        {sections.map(([type, values]) => (
          <div key={type} className="flex items-start gap-4 px-5 py-3">
            <span className="w-12 shrink-0 font-mono text-xs font-bold text-muted-foreground pt-0.5">
              {type}
            </span>
            <div className="space-y-1">
              {values.map((v, i) => (
                <p key={i} className="font-mono text-xs text-foreground break-all">
                  {v}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScanSection>
  );
}

// ── Security headers section ────────────────────────────────────────────────

function HeadersSection({ r }: { r: StoredReportResults }) {
  const analysis = r.security_headers_analysis;
  if (!analysis?.headers) return null;

  const entries = Object.entries(analysis.headers);
  if (entries.length === 0) return null;

  const present = entries.filter(([, v]) => v.present).length;
  const pct = analysis.percentage ?? 0;

  const badge = (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
        pct >= 70
          ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
          : pct >= 30
            ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
            : "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
      )}
    >
      {present}/{entries.length} present
    </span>
  );

  return (
    <ScanSection title="Security Headers" badge={badge} defaultOpen={false}>
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border">
          <tr>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Header</th>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Status</th>
            <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {entries.map(([header, info]) => (
            <tr key={header} className="hover:bg-muted/20 transition-colors">
              <td className="px-5 py-3 font-mono text-xs text-foreground">{header}</td>
              <td className="px-5 py-3">
                {info.present ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Present
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                    <XCircle className="h-3 w-3" /> Missing
                  </span>
                )}
              </td>
              <td
                className="px-5 py-3 font-mono text-xs text-muted-foreground max-w-xs truncate"
                title={info.value ?? ""}
              >
                {info.value ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScanSection>
  );
}

// ── Findings & recommendations section ─────────────────────────────────────

function FindingsSection({ r }: { r: StoredReportResults }) {
  const findings = r.findings ?? [];
  const recs = r.recommendations ?? [];
  if (findings.length === 0 && recs.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {findings.length > 0 && (
        <ScanSection title="Findings" defaultOpen>
          <div className="divide-y divide-border">
            {findings.map((f) => (
              <div key={`${f.title}`} className="flex items-start gap-3 px-5 py-4">
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase",
                    f.severity === "high"
                      ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
                      : f.severity === "medium"
                        ? "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
                        : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {f.severity}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-5">{f.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </ScanSection>
      )}

      {recs.length > 0 && (
        <ScanSection title="Recommendations" defaultOpen>
          <div className="divide-y divide-border">
            {recs.map((item, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-4">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                <p className="text-sm text-muted-foreground leading-6">{item}</p>
              </div>
            ))}
          </div>
        </ScanSection>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

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
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const autoscanFired = useRef(false);

  const reloadWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      const targetData = await getTarget(id);
      setTarget(targetData);

      const scansPromise = getScans();
      const latestReportPromise = targetData.latest_report_id
        ? getReport(targetData.latest_report_id)
        : Promise.resolve(null);
      const [scansData, prefetchedLatestReport] = await Promise.all([
        scansPromise,
        latestReportPromise,
      ]);

      const host = targetData.url.replace(/^https?:\/\//, "").split("/")[0];
      const matched = scansData.filter(
        (s) =>
          s.target_id === id ||
          s.url.replace(/^https?:\/\//, "").split("/")[0] === host,
      );
      setTargetScans(matched);

      if (prefetchedLatestReport) {
        setLatestReport(prefetchedLatestReport);
        return;
      }

      const reportId =
        matched.length > 0 ? matched[0].report_id : null;
      if (reportId) {
        try {
          const report = await getReport(reportId);
          setLatestReport(report);
        } catch {
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

  const handleRunScan = useCallback(async (t?: Target) => {
    const tgt = t ?? target;
    if (!tgt || scanning) return;
    setScanning(true);
    setScanError(null);
    try {
      await analyzeUrl(tgt.url, { targetId: tgt.id, includePortScan: true });
      await reloadWorkspace();
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Scan failed. Please try again.");
    } finally {
      setScanning(false);
    }
  }, [target, scanning, reloadWorkspace]);

  // Trigger scan automatically when autoscan=1
  useEffect(() => {
    if (!autoscan || !target || loading || autoscanFired.current) return;
    autoscanFired.current = true;
    router.replace(`/dashboard/site/${id}`);
    handleRunScan(target);
  }, [autoscan, target, loading, id, router, handleRunScan]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const results = latestReport?.results;

  // Scores — prefer persisted scores from latest report
  const overall = results?.scores?.overall ?? target?.score ?? null;
  const secScore = results?.scores?.security ?? null;
  const perfScore =
    results?.scores?.performance ??
    results?.performance?.desktop?.performance_score ??
    null;
  const seoScore =
    results?.scores?.seo ?? results?.seo?.seo_score ?? null;

  const trafficData = useMemo(() => {
    const queries = target?.gsc_analytics?.top_queries ?? [];
    return queries.slice(0, 14).map((q) => ({
      query: q.query.length > 20 ? q.query.slice(0, 20) + "…" : q.query,
      clicks: q.clicks,
    }));
  }, [target]);

  const perfTrendData = useMemo(() => {
    if (targetScans.length < 2) return [];
    return [...targetScans]
      .reverse()
      .slice(-14)
      .map((s) => ({
        date: new Date(s.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        score: s.score,
      }));
  }, [targetScans]);

  const hasGsc = trafficData.length > 0;

  // ── Loading / empty states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading dashboard…
      </div>
    );
  }

  if (!target) return null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-[1280px] mx-auto pb-20">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard/sites"
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
          onClick={() => handleRunScan()}
          disabled={scanning}
          className="bg-foreground hover:bg-foreground/90 text-background shrink-0 font-semibold gap-2"
        >
          {scanning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-current" />
              Run Scan
            </>
          )}
        </Button>
      </div>

      {/* Scan error banner */}
      {scanError && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Scan failed</p>
            <p className="mt-0.5 opacity-80">{scanError}</p>
          </div>
        </div>
      )}

      {/* Scanning progress banner */}
      {scanning && (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <p>Scanning <span className="font-mono font-semibold">{target.url}</span> — this takes 10–30 seconds…</p>
        </div>
      )}

      {/* ── Scores row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 sm:col-span-1 border border-border rounded-2xl bg-card p-6 flex flex-col items-center justify-center shadow-sm">
          <ScoreRing score={overall} size={110} strokeWidth={8} />
          <p className="font-semibold text-sm mt-4 text-foreground">Overall Health</p>
        </div>
        <MetricCard
          label="Security Score"
          value={secScore ?? "—"}
          sub="SSL · Headers · Posture"
          icon={ShieldAlert}
          variant="indigo"
        />
        <MetricCard
          label="Performance"
          value={perfScore ?? "—"}
          sub="Lighthouse Desktop"
          icon={Cpu}
          variant="indigo"
        />
        <MetricCard
          label="SEO Score"
          value={seoScore ?? "—"}
          sub="Search Engine Opt."
          icon={TrendingUp}
          variant="indigo"
        />
      </div>

      {/* ── No scan yet call-to-action ──────────────────────────────────── */}
      {!latestReport && !scanning && (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 flex flex-col items-center text-center gap-4">
          <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="font-semibold text-foreground">No scan data yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Run a scan to see ports, SSL, DNS, security headers, and more.
            </p>
          </div>
          <Button
            onClick={() => handleRunScan()}
            className="bg-foreground text-background hover:bg-foreground/90 gap-2"
          >
            <Play className="h-4 w-4 fill-current" />
            Run first scan
          </Button>
        </div>
      )}

      {/* ── Scan detail sections (only when report exists) ──────────────── */}
      {results && (
        <>
          {/* Infrastructure row */}
          <section className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
              Infrastructure
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <InfrastructureCard
                title="Provider"
                value={results.server_location?.org || "—"}
                icon={Server}
              />
              <InfrastructureCard
                title="CDN / Proxy"
                value={results.technologies?.cdn || "None detected"}
                icon={Cloud}
              />
              <InfrastructureCard
                title="Server"
                value={results.technologies?.server || "—"}
                icon={Cpu}
              />
              <InfrastructureCard
                title="TLS"
                value={
                  results.ssl_certificate?.valid
                    ? `Valid · ${results.ssl_certificate.expires ? new Date(results.ssl_certificate.expires).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : ""}`
                    : results.ssl_certificate
                      ? (results.ssl_certificate.error ?? "Invalid")
                      : "—"
                }
                icon={ShieldCheck}
              />
              <InfrastructureCard
                title="Region"
                value={
                  results.server_location
                    ? [results.server_location.city, results.server_location.country]
                        .filter(Boolean)
                        .join(", ")
                    : "—"
                }
                icon={Globe}
              />
            </div>
          </section>

          {/* Deep-dive sections */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
              Scan Details
            </h3>
            <PortsSection r={results} />
            <SslSection r={results} />
            <DnsSection r={results} />
            <HeadersSection r={results} />
          </section>

          {/* Findings & recommendations */}
          {(results.findings?.length || results.recommendations?.length) ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Analysis
              </h3>
              <FindingsSection r={results} />
            </section>
          ) : null}

          {/* Charts (performance trend always; GSC only if data exists) */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground px-1">
              Trends
            </h3>
            <div className={cn("grid gap-4", hasGsc ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-xl")}>
              {hasGsc && (
                <ChartCard
                  title="Top Search Queries"
                  subtitle="Clicks by query · Google Search Console"
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={trafficData}
                      layout="vertical"
                      margin={{ top: 10, right: 16, bottom: 0, left: 8 }}
                      barSize={10}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="query" width={130} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                      <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} name="Clicks" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              <ChartCard title="Score Trend" subtitle="Overall health score over time">
                {perfTrendData.length < 2 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Run more scans to see your trend.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart
                      data={perfTrendData}
                      margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
                    >
                      <defs>
                        <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis domain={["auto", 100]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card)" }} />
                      <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} fill="url(#scoreGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          </section>
        </>
      )}

      {/* ── Google Search Console section (always last) ──────────────── */}
      <GscProjectWorkspaceSection target={target} />
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
