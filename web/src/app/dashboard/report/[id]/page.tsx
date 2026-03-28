"use client";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ApiError,
  getReport,
  type PerformanceStrategyResult,
  type ScanReport,
  type SeoCheckResult,
  type StoredReportResults,
} from "@/lib/api";
import { cn } from "@/lib/utils";

type CheckStatus = "pass" | "warn" | "fail";
type CheckItem = { name: string; status: CheckStatus; detail: string; value?: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getScoreClasses(score: number) {
  if (score >= 80)
    return { text: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", ring: "ring-emerald-500/20" };
  if (score >= 50)
    return { text: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", ring: "ring-amber-500/20" };
  return { text: "text-rose-400", border: "border-rose-500/30", bg: "bg-rose-500/10", ring: "ring-rose-500/20" };
}

function getStatusClasses(status: CheckStatus) {
  if (status === "pass") return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  if (status === "warn") return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  return "border-rose-500/20 bg-rose-500/10 text-rose-300";
}

function getHeaderCoverageStatus(pct: number): CheckStatus {
  if (pct >= 70) return "pass";
  if (pct >= 30) return "warn";
  return "fail";
}

function getNumericScoreStatus(score: number | null | undefined): CheckStatus {
  if (score == null) return "fail";
  if (score >= 90) return "pass";
  if (score >= 50) return "warn";
  return "fail";
}

function getStatusWeight(s: CheckStatus) {
  return s === "pass" ? 1 : s === "warn" ? 0.5 : 0;
}

function deriveSecurityScore(r: StoredReportResults) {
  const ssl: CheckStatus = r.ssl_certificate?.valid ? "pass" : "fail";
  const hdr = getHeaderCoverageStatus(r.security_headers_analysis?.percentage ?? 0);
  const txt: CheckStatus = r.security_txt?.present ? "pass" : "fail";
  return Math.round(((getStatusWeight(ssl) * 50 + getStatusWeight(hdr) * 40 + getStatusWeight(txt) * 10) / 100) * 100);
}

function derivePerformanceScore(r: StoredReportResults) {
  const scores = [r.performance?.mobile?.performance_score, r.performance?.desktop?.performance_score].filter(
    (v): v is number => v != null,
  );
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function buildSecurityChecks(r: StoredReportResults): CheckItem[] {
  const pct = r.security_headers_analysis?.percentage ?? 0;
  const cookies = r.cookies?.cookies ?? [];
  const insecure = cookies.filter((c) => !c.secure || !c.httponly).length;
  const ports = r.port_scan?.open_ports ?? [];
  return [
    {
      name: "SSL Certificate",
      status: r.ssl_certificate?.valid ? "pass" : "fail",
      detail: r.ssl_certificate?.valid ? "TLS certificate is valid." : r.ssl_certificate?.error || "Certificate validation failed.",
    },
    {
      name: "Security Headers",
      status: getHeaderCoverageStatus(pct),
      detail: `${pct}% of recommended headers present.`,
      value: `${pct}/100`,
    },
    {
      name: "security.txt",
      status: r.security_txt?.present ? "pass" : "fail",
      detail: r.security_txt?.present ? "security.txt is published." : "No security.txt detected.",
    },
    {
      name: "HTTPS",
      status: r.summary?.https ? "pass" : "fail",
      detail: r.summary?.https ? "Scanned over HTTPS." : "Did not resolve to HTTPS.",
    },
    {
      name: "Cookie Hygiene",
      status: insecure === 0 ? "pass" : insecure <= 2 ? "warn" : "fail",
      detail:
        cookies.length === 0
          ? "No cookies observed."
          : `${insecure} of ${cookies.length} cookies missing Secure or HttpOnly.`,
    },
    {
      name: "Open Ports",
      status: ports.length === 0 ? "pass" : ports.length <= 2 ? "warn" : "fail",
      detail: ports.length === 0 ? "No open ports detected." : `Open ports: ${ports.join(", ")}.`,
    },
  ];
}

function buildSeoChecks(r: StoredReportResults): CheckItem[] {
  const entries = Object.entries(r.seo?.checks ?? {});
  if (entries.length === 0)
    return [{ name: "SEO Checks", status: "fail", detail: r.seo?.error || "SEO data unavailable." }];
  return entries.map(([name, v]: [string, SeoCheckResult]) => ({ name: formatLabel(name), status: v.status, detail: v.detail }));
}

function buildPerformanceChecks(r: StoredReportResults): CheckItem[] {
  const strategies = Object.entries(r.performance ?? {}) as Array<[string, PerformanceStrategyResult]>;
  if (strategies.length === 0)
    return [{ name: "Performance Checks", status: "fail", detail: "Performance data unavailable." }];
  return strategies.flatMap<CheckItem>(([name, v]) => {
    if (v.error) return [{ name: `${formatLabel(name)} Performance`, status: "fail", detail: v.error }];
    return [
      {
        name: `${formatLabel(name)} Performance`,
        status: getNumericScoreStatus(v.performance_score),
        detail: `Lighthouse performance score for ${name}.`,
        value: v.performance_score == null ? "N/A" : `${v.performance_score}/100`,
      },
      {
        name: `${formatLabel(name)} Accessibility`,
        status: getNumericScoreStatus(v.accessibility_score),
        detail: `Accessibility score for ${name}.`,
        value: v.accessibility_score == null ? "N/A" : `${v.accessibility_score}/100`,
      },
      {
        name: `${formatLabel(name)} Best Practices`,
        status: getNumericScoreStatus(v.best_practices_score),
        detail: `Best practices score for ${name}.`,
        value: v.best_practices_score == null ? "N/A" : `${v.best_practices_score}/100`,
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Phase 1: Hero overview components
// ---------------------------------------------------------------------------

function ScoreRing({ score, label, size = "md" }: { score: number; label: string; size?: "lg" | "md" }) {
  const tone = getScoreClasses(score);
  const isLg = size === "lg";
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "rounded-2xl border flex flex-col items-center justify-center",
          tone.border,
          tone.bg,
          isLg ? "h-32 w-32" : "h-20 w-20",
        )}
      >
        <span className={cn("font-black tabular-nums leading-none", tone.text, isLg ? "text-5xl" : "text-2xl")}>
          {score}
        </span>
        <span className="text-[10px] text-white/30 mt-1 uppercase tracking-wider">/ 100</span>
      </div>
      <span className="text-xs text-white/50 font-medium">{label}</span>
    </div>
  );
}

function QuickFact({ icon: Icon, label, value, status }: { icon: React.ElementType; label: string; value: string; status?: "pass" | "fail" | "neutral" }) {
  const iconColor =
    status === "pass" ? "text-emerald-400" : status === "fail" ? "text-rose-400" : "text-white/40";
  const StatusIcon = status === "pass" ? CheckCircle2 : status === "fail" ? XCircle : null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
      <Icon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">{label}</p>
        <p className="text-sm text-white/80 font-medium truncate mt-0.5">{value}</p>
      </div>
      {StatusIcon && <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", iconColor)} />}
    </div>
  );
}

function OverviewHero({ report, scores, onBack, fromProject, fromProjectId, copied, onCopy }: {
  report: ScanReport;
  scores: { overall: number; security: number; seo: number; performance: number };
  onBack: () => void;
  fromProject: boolean;
  fromProjectId: string | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const results = report.results;
  const tone = getScoreClasses(scores.overall);
  const overallLabel = scores.overall >= 80 ? "Strong" : scores.overall >= 50 ? "Needs attention" : "High risk";
  const loc = results.server_location;
  const ssl = results.ssl_certificate;
  const domain = report.url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <div className={cn("rounded-2xl border p-6 md:p-8 space-y-6", tone.border, tone.bg)}>
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={fromProject ? "Back to project" : "Back to scan history"}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-semibold">Scan report</p>
            <h1 className="text-lg font-bold text-white truncate mt-0.5">{domain}</h1>
            <p className="text-xs text-white/30 font-mono truncate">{report.url}</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            asChild
            size="sm"
            className="bg-white text-black hover:bg-white/90 font-semibold gap-1.5"
          >
            <Link
              href={
                fromProject && fromProjectId
                  ? `/dashboard/project/${fromProjectId}?autoscan=1`
                  : `/web?url=${encodeURIComponent(report.url)}`
              }
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Scan again
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            className="border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 gap-1.5"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy link"}
          </Button>
        </div>
      </div>

      {/* Scores */}
      <div className="flex flex-wrap items-start gap-6 justify-center sm:justify-start">
        <ScoreRing score={scores.overall} label="Overall" size="lg" />
        <div className="flex items-start gap-4 flex-wrap pt-2">
          <ScoreRing score={scores.security} label="Security" />
          <ScoreRing score={scores.seo} label="SEO" />
          <ScoreRing score={scores.performance} label="Performance" />
        </div>
        <div className="hidden sm:flex flex-col justify-center ml-auto text-right">
          <p className={cn("text-2xl font-bold", tone.text)}>{overallLabel}</p>
          <p className="text-xs text-white/30 mt-1">
            Scanned {formatDateTime(report.created_at)}
          </p>
          <p className="text-xs text-white/20 mt-0.5">
            Expires {formatDateTime(report.expires_at)}
          </p>
        </div>
      </div>

      {/* Quick facts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <QuickFact
          icon={Shield}
          label="SSL certificate"
          value={ssl?.valid ? `Valid · expires ${ssl.expires ? new Date(ssl.expires).toLocaleDateString() : "unknown"}` : "Invalid or missing"}
          status={ssl?.valid ? "pass" : "fail"}
        />
        <QuickFact
          icon={Globe}
          label="Protocol"
          value={results.summary?.https ? "HTTPS" : "HTTP (insecure)"}
          status={results.summary?.https ? "pass" : "fail"}
        />
        <QuickFact
          icon={Server}
          label="Server"
          value={
            results.technologies?.server ||
            results.http_headers?.headers?.["server"] ||
            results.http_headers?.headers?.["Server"] ||
            "Unknown"
          }
          status="neutral"
        />
        <QuickFact
          icon={Globe}
          label="IP address"
          value={results.ip_address || "—"}
          status="neutral"
        />
        <QuickFact
          icon={Globe}
          label="Location"
          value={loc ? [loc.city, loc.region, loc.country].filter(Boolean).join(", ") : "—"}
          status="neutral"
        />
        <QuickFact
          icon={ShieldAlert}
          label="Security headers"
          value={`${results.security_headers_analysis?.percentage ?? 0}% coverage`}
          status={getHeaderCoverageStatus(results.security_headers_analysis?.percentage ?? 0) as "pass" | "fail"}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Phase 2: Detailed report components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: CheckStatus }) {
  const Icon = status === "pass" ? ShieldCheck : status === "warn" ? ShieldAlert : ShieldX;
  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide", getStatusClasses(status))}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function CheckGroup({ title, score, checks }: { title: string; score: number; checks: CheckItem[] }) {
  const tone = getScoreClasses(score);
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <span className={cn("text-sm font-semibold text-white")}>{title}</span>
          <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", tone.border, tone.bg, tone.text)}>
            {score}/100
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-white/30 transition-transform", open ? "rotate-180" : "")} />
      </button>
      {open && (
        <div className="border-t border-white/[0.06] divide-y divide-white/[0.05]">
          {checks.map((check) => (
            <div key={`${title}-${check.name}`} className="flex items-start gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90">{check.name}</p>
                <p className="text-xs text-white/40 mt-1 leading-5">{check.detail}</p>
                {check.value && (
                  <p className="text-[10px] uppercase tracking-widest text-white/25 mt-1.5">{check.value}</p>
                )}
              </div>
              <StatusBadge status={check.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function ReportPageInner() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const fromProject = searchParams.get("from") === "project";
  const fromProjectId = searchParams.get("project");

  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleBack() {
    if (fromProject && fromProjectId) {
      router.push(`/dashboard/project/${fromProjectId}`);
    } else {
      router.push("/dashboard/scans");
    }
  }

  useEffect(() => {
    if (!id) { setLoading(false); setNotFound(true); return; }
    let active = true;
    (async () => {
      setLoading(true); setError(null); setNotFound(false);
      try {
        const data = await getReport(id);
        if (active) setReport(data);
      } catch (err) {
        if (!active) return;
        if (err instanceof ApiError && err.status === 404) { setNotFound(true); setReport(null); }
        else setError(err instanceof Error ? err.message : "Unable to load this report right now.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copy failed. Please copy the URL from your browser address bar.");
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-pulse">
        <div className="h-64 rounded-2xl bg-white/[0.03] border border-white/10" />
        <div className="h-48 rounded-xl bg-white/[0.03] border border-white/10" />
        <div className="h-48 rounded-xl bg-white/[0.03] border border-white/10" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <p className="text-xs uppercase tracking-widest text-white/30">Not found</p>
        <h1 className="text-2xl font-bold text-white">Report not found or expired</h1>
        <p className="text-sm text-white/40">This scan may have expired or the link is invalid.</p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button asChild><Link href="/dashboard/scans">Scan history</Link></Button>
          <Button asChild variant="outline"><Link href="/web">Public scanner</Link></Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-bold text-white">Report unavailable</h1>
        <p className="text-sm text-white/40">{error || "Unable to load this report right now."}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/scans">Back to scan history</Link>
        </Button>
      </div>
    );
  }

  const results = report.results;
  const scores = results.scores ?? {
    overall: report.score,
    security: deriveSecurityScore(results),
    seo: results.seo?.seo_score ?? 0,
    performance: derivePerformanceScore(results),
  };

  const securityChecks = buildSecurityChecks(results);
  const seoChecks = buildSeoChecks(results);
  const performanceChecks = buildPerformanceChecks(results);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">

      {/* ── Phase 1: Overview hero ─────────────────────────────── */}
      <OverviewHero
        report={report}
        scores={scores}
        onBack={handleBack}
        fromProject={fromProject}
        fromProjectId={fromProjectId}
        copied={copied}
        onCopy={handleCopy}
      />

      {/* ── Phase 2: Detailed report ───────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <p className="text-xs uppercase tracking-widest text-white/30 font-semibold">Detailed report</p>
          <div className="flex-1 h-px bg-white/[0.06]" />
          <ChevronRight className="h-3.5 w-3.5 text-white/20" />
        </div>

        <CheckGroup title="Security checks" score={scores.security} checks={securityChecks} />
        <CheckGroup title="SEO checks" score={scores.seo} checks={seoChecks} />
        <CheckGroup title="Performance checks" score={scores.performance} checks={performanceChecks} />

        {(results.findings?.length || results.recommendations?.length) ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {results.findings?.length ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white">Findings</p>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {results.findings.map((f) => (
                    <div key={`${f.title}-${f.detail}`} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            f.severity === "high"
                              ? "border-rose-500/20 bg-rose-500/10 text-rose-400"
                              : f.severity === "medium"
                                ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
                                : "border-white/10 bg-white/5 text-white/40",
                          )}
                        >
                          {f.severity}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-white/90">{f.title}</p>
                          <p className="text-xs text-white/40 mt-1 leading-5">{f.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {results.recommendations?.length ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <p className="text-sm font-semibold text-white">Recommendations</p>
                </div>
                <div className="divide-y divide-white/[0.05]">
                  {results.recommendations.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-4">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                      <p className="text-sm text-white/50 leading-6">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-amber-400">{error}</p> : null}
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-40 text-white/20 text-sm gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      }
    >
      <ReportPageInner />
    </Suspense>
  );
}
