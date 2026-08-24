"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Gauge,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import {
  getReportBySlug,
  type ScanReport,
  type StoredReportResults,
} from "@/lib/api";

type CheckStatus = "pass" | "warn" | "fail";
interface CheckItem {
  name: string;
  status: CheckStatus;
  detail: string;
  value?: string;
}

export default function PublicReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  // Accordion state for the 3 panels (default open)
  const [expandedSecurity, setExpandedSecurity] = useState(true);
  const [expandedSeo, setExpandedSeo] = useState(true);
  const [expandedPerformance, setExpandedPerformance] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const data = await getReportBySlug(slug);
        if (isMounted) {
          setReport(data);
          setNotFound(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 500;
          if (status === 404) {
            setNotFound(true);
          } else {
            setNotFound(true);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-32 pb-20 space-y-6">
          <div className="h-6 w-32 bg-secondary animate-pulse rounded" />
          <div className="h-14 w-3/4 bg-secondary animate-pulse rounded" />
          <div className="h-32 w-full border border-border bg-card animate-pulse rounded" />
          <div className="space-y-4 pt-6">
            <div className="h-28 w-full border border-border bg-card animate-pulse rounded" />
            <div className="h-28 w-full border border-border bg-card animate-pulse rounded" />
            <div className="h-28 w-full border border-border bg-card animate-pulse rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
        <Navigation />
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-40 pb-20 text-center space-y-6">
          <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
            404 · Not Found
          </p>
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
            Report Not Found
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            The requested scan report does not exist or may have expired.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-4 h-4" /> Run a New Scan
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const results = (report.results || {}) as StoredReportResults;
  const overallScore = report.score ?? results.scores?.overall ?? 0;
  const secScore = results.scores?.security ?? results.security_score ?? 0;
  const seoScore = results.scores?.seo ?? results.seo_score ?? 0;
  const perfScore =
    results.scores?.performance ?? results.performance_score ?? null;

  // Build Security Checks
  const secChecks: CheckItem[] = [];
  const ssl = results.ssl;
  if (ssl) {
    secChecks.push({
      name: "TLS Certificate",
      status: ssl.valid ? "pass" : "fail",
      detail: ssl.valid
        ? `Valid cert issued by ${ssl.issuer || "trusted CA"}`
        : `Invalid SSL/TLS certificate: ${ssl.error || "failed"}`,
      value: ssl.expires
        ? `Expires ${new Date(ssl.expires).toLocaleDateString()}`
        : undefined,
    });
  }

  const headers = results.headers || {};
  const headerKeys = [
    {
      key: "strict-transport-security",
      name: "HSTS Header",
      desc: "Forces secure HTTPS connections",
    },
    {
      key: "content-security-policy",
      name: "Content-Security-Policy (CSP)",
      desc: "Mitigates XSS and injection attacks",
    },
    {
      key: "x-frame-options",
      name: "X-Frame-Options",
      desc: "Protects against clickjacking",
    },
    {
      key: "x-content-type-options",
      name: "X-Content-Type-Options",
      desc: "Prevents MIME-sniffing",
    },
  ];
  for (const h of headerKeys) {
    const val = headers[h.key];
    secChecks.push({
      name: h.name,
      status: val ? "pass" : "warn",
      detail: val ? String(val) : `Missing ${h.key} header (${h.desc})`,
    });
  }

  // Build SEO Checks
  const seoChecks: CheckItem[] = [];
  const seoData = results.seo || {};
  const title = (seoData.title || {}) as {
    present?: boolean;
    value?: string;
    length?: number;
  };
  seoChecks.push({
    name: "Page Title",
    status: title.present && (title.length || 0) >= 10 ? "pass" : "warn",
    detail: title.value
      ? `"${title.value}" (${title.length} chars)`
      : "Missing <title> tag",
  });

  const desc = (seoData.description || {}) as {
    present?: boolean;
    value?: string;
    length?: number;
  };
  seoChecks.push({
    name: "Meta Description",
    status: desc.present ? "pass" : "warn",
    detail: desc.value
      ? `"${desc.value}" (${desc.length} chars)`
      : "Missing meta description tag",
  });

  const robots = (seoData.robots_txt || {}) as {
    present?: boolean;
    accessible?: boolean;
  };
  seoChecks.push({
    name: "robots.txt",
    status: robots.present ? "pass" : "warn",
    detail: robots.present
      ? "robots.txt is present and accessible"
      : "No robots.txt detected",
  });

  const sitemap = (seoData.sitemap || {}) as {
    present?: boolean;
    accessible?: boolean;
  };
  seoChecks.push({
    name: "XML Sitemap",
    status: sitemap.present ? "pass" : "warn",
    detail: sitemap.present
      ? "XML Sitemap found"
      : "No XML sitemap found at standard paths",
  });

  // Build Performance Checks
  const perfChecks: CheckItem[] = [];
  const perfData = results.performance || {};
  const mobilePerf = (perfData.mobile || {}) as Record<string, unknown>;
  if (perfScore != null) {
    perfChecks.push({
      name: "Mobile Performance Score",
      status:
        Number(mobilePerf.performance_score ?? perfScore) >= 75
          ? "pass"
          : Number(mobilePerf.performance_score ?? perfScore) >= 50
            ? "warn"
            : "fail",
      detail: `Lighthouse performance score: ${mobilePerf.performance_score ?? perfScore}/100`,
    });
  } else {
    perfChecks.push({
      name: "Fast Scan Mode",
      status: "warn",
      detail:
        "Full PageSpeed Insights lab metrics were skipped on this fast pass.",
    });
  }

  const renderStatusIcon = (status: CheckStatus) => {
    if (status === "pass")
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (status === "warn")
      return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
    return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  };

  const formattedDate = report.created_at
    ? new Date(report.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#E8E6E1] selection:text-foreground">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-28 pb-20 space-y-10">
        {/* Top Breadcrumb / Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                Monix
              </Link>
              <span>/</span>
              <span>Report</span>
              <span>/</span>
              <span className="text-foreground">{slug}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl sm:text-2xl font-semibold tracking-tight text-foreground break-all">
                {report.url}
              </h1>
              <a
                href={
                  report.url.startsWith("http")
                    ? report.url
                    : `https://${report.url}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
            {formattedDate && (
              <p className="text-xs font-mono text-muted-foreground">
                Scanned on {formattedDate}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-border bg-card text-xs font-mono text-foreground hover:bg-secondary transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-accent" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? "Link Copied" : "Share Report"}
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-foreground text-xs font-mono hover:opacity-90 transition-opacity"
            >
              New Scan
            </Link>
          </div>
        </div>

        {/* Overall Score Highlight */}
        <div className="border border-border bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              Overall Evaluation
            </span>
            <h2 className="font-serif text-3xl font-medium">
              Diagnostic Summary
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Calculated across security compliance, search discoverability
              signals, and baseline performance metrics.
            </p>
          </div>
          <div className="flex items-baseline gap-2 bg-secondary px-6 py-4 border border-border">
            <span className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              {overallScore}
            </span>
            <span className="font-mono text-sm text-muted-foreground">
              / 100
            </span>
          </div>
        </div>

        {/* 3 Flat Scored Panels */}
        <div className="space-y-6">
          {/* 1. Security Panel */}
          <div className="border border-border bg-card">
            <button
              type="button"
              onClick={() => setExpandedSecurity(!expandedSecurity)}
              className="w-full p-6 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-serif text-xl font-medium">
                    Security Posture
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    TLS chain, security headers, host exposures
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-lg font-semibold">
                  {secScore}/100
                </span>
                {expandedSecurity ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedSecurity && (
              <div className="border-t border-border p-6 bg-background">
                <div className="divide-y divide-border">
                  {secChecks.map((c) => (
                    <div
                      key={c.name}
                      className="py-3 flex items-start justify-between gap-4 text-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        {renderStatusIcon(c.status)}
                        <div>
                          <p className="font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {c.detail}
                          </p>
                        </div>
                      </div>
                      {c.value && (
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {c.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. SEO Panel */}
          <div className="border border-border bg-card">
            <button
              type="button"
              onClick={() => setExpandedSeo(!expandedSeo)}
              className="w-full p-6 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-serif text-xl font-medium">
                    SEO & Discoverability
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Meta hygiene, structured directives, crawlability
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-lg font-semibold">
                  {seoScore}/100
                </span>
                {expandedSeo ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedSeo && (
              <div className="border-t border-border p-6 bg-background">
                <div className="divide-y divide-border">
                  {seoChecks.map((c) => (
                    <div
                      key={c.name}
                      className="py-3 flex items-start justify-between gap-4 text-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        {renderStatusIcon(c.status)}
                        <div>
                          <p className="font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {c.detail}
                          </p>
                        </div>
                      </div>
                      {c.value && (
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {c.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. Performance Panel */}
          <div className="border border-border bg-card">
            <button
              type="button"
              onClick={() => setExpandedPerformance(!expandedPerformance)}
              className="w-full p-6 flex items-center justify-between hover:bg-secondary/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Gauge className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="font-serif text-xl font-medium">
                    Performance Signals
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Core Web Vitals and speed indicators
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-mono text-lg font-semibold">
                  {perfScore != null ? `${perfScore}/100` : "Fast Scan"}
                </span>
                {expandedPerformance ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedPerformance && (
              <div className="border-t border-border p-6 bg-background">
                <div className="divide-y divide-border">
                  {perfChecks.map((c) => (
                    <div
                      key={c.name}
                      className="py-3 flex items-start justify-between gap-4 text-sm"
                    >
                      <div className="flex items-start gap-2.5">
                        {renderStatusIcon(c.status)}
                        <div>
                          <p className="font-medium text-foreground">
                            {c.name}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {c.detail}
                          </p>
                        </div>
                      </div>
                      {c.value && (
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {c.value}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Soft, Non-Blocking Sign-In Prompt */}
        <div className="border border-border bg-secondary/40 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-serif text-lg font-medium text-foreground">
              Track this site over time
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Sign in to save this URL to your dashboard, monitor recurring
              scans, and view historical trend graphs.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-4 py-2 border border-border bg-card text-xs font-mono font-medium text-foreground hover:bg-secondary transition-colors shrink-0"
          >
            Sign in <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
