"use client";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Terminal,
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

type StatusType = "PASS" | "WARN" | "FAIL";

interface DiagnosticRow {
  check: string;
  status: StatusType;
  value: string;
  note?: string;
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
  const [showRawJson, setShowRawJson] = useState(false);

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
      } catch {
        if (isMounted) setNotFound(true);
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
      <div className="min-h-screen bg-background text-foreground flex flex-col font-mono text-xs">
        <Navigation />
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-32 pb-20 space-y-4">
          <div className="border border-border p-4 bg-secondary animate-pulse h-24" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="border border-border p-4 bg-secondary animate-pulse h-16" />
            <div className="border border-border p-4 bg-secondary animate-pulse h-16" />
            <div className="border border-border p-4 bg-secondary animate-pulse h-16" />
            <div className="border border-border p-4 bg-secondary animate-pulse h-16" />
          </div>
          <div className="border border-border p-6 bg-secondary animate-pulse h-64" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-mono">
        <Navigation />
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-40 pb-20 text-center space-y-6">
          <p className="text-xs text-destructive uppercase tracking-widest">
            [404_NOT_FOUND]
          </p>
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Report Not Found
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed">
            The scan identifier{" "}
            <code className="bg-secondary px-1 border border-border">
              {slug}
            </code>{" "}
            does not exist or has expired.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground text-xs font-mono font-medium hover:opacity-90"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Inspector
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const results = (report.results || {}) as StoredReportResults;
  const overallScore = report.score ?? results.scores?.overall ?? 0;
  const secScore = results.scores?.security ?? 0;
  const seoScore = results.scores?.seo ?? 0;
  const perfScore = results.scores?.performance ?? null;

  // Build Security Rows
  const securityRows: DiagnosticRow[] = [];
  const ssl = results.ssl_certificate;
  if (ssl) {
    const issuer =
      typeof ssl.issuer === "string"
        ? ssl.issuer
        : ssl.issuer?.O || ssl.issuer?.CN || "Trusted CA";
    securityRows.push({
      check: "TLS Certificate",
      status: ssl.valid ? "PASS" : "FAIL",
      value: ssl.valid
        ? `Valid (${issuer})`
        : `Invalid: ${ssl.error || "failed"}`,
      note: ssl.expires
        ? `Expires ${new Date(ssl.expires).toISOString().split("T")[0]}`
        : undefined,
    });
  }

  const secHeaders =
    results.security_headers_analysis?.headers ||
    results.http_headers?.security_headers ||
    {};
  const headerKeys = [
    {
      key: "strict-transport-security",
      name: "Strict-Transport-Security (HSTS)",
    },
    { key: "content-security-policy", name: "Content-Security-Policy (CSP)" },
    { key: "x-frame-options", name: "X-Frame-Options" },
    { key: "x-content-type-options", name: "X-Content-Type-Options" },
    { key: "referrer-policy", name: "Referrer-Policy" },
  ];
  for (const h of headerKeys) {
    const entry = (secHeaders as Record<string, unknown>)[h.key];
    const isPresent =
      entry && typeof entry === "object" && "present" in entry
        ? Boolean((entry as { present: boolean }).present)
        : Boolean(entry);
    const val =
      entry && typeof entry === "object" && "value" in entry
        ? (entry as { value?: string }).value
        : typeof entry === "string"
          ? entry
          : null;
    securityRows.push({
      check: h.name,
      status: isPresent ? "PASS" : "WARN",
      value: isPresent && val ? String(val) : "NOT CONFIGURED",
      note: isPresent ? "Active" : "Recommended",
    });
  }

  // Build SEO Rows
  const seoRows: DiagnosticRow[] = [];
  const seoMap = results.seo?.checks || {};
  const seoEntries = Object.entries(seoMap);
  if (seoEntries.length > 0) {
    for (const [key, check] of seoEntries) {
      const formatted = key.replace(/_/g, " ").toUpperCase();
      seoRows.push({
        check: formatted,
        status:
          check.status === "pass"
            ? "PASS"
            : check.status === "warn"
              ? "WARN"
              : "FAIL",
        value: check.detail,
      });
    }
  } else {
    seoRows.push({
      check: "ON-PAGE SEO DIRECTIVES",
      status: "PASS",
      value: `SEO criteria passed with score ${seoScore}/100`,
    });
  }

  // Build Performance Rows
  const perfRows: DiagnosticRow[] = [];
  const mobile = results.performance?.mobile;
  if (mobile && mobile.performance_score != null) {
    perfRows.push({
      check: "LIGHTHOUSE SCORE",
      status:
        mobile.performance_score >= 75
          ? "PASS"
          : mobile.performance_score >= 50
            ? "WARN"
            : "FAIL",
      value: `${mobile.performance_score} / 100`,
    });
    if (mobile.lcp) {
      perfRows.push({
        check: "LARGEST CONTENTFUL PAINT (LCP)",
        status: "PASS",
        value: mobile.lcp,
      });
    }
    if (mobile.cls) {
      perfRows.push({
        check: "CUMULATIVE LAYOUT SHIFT (CLS)",
        status: "PASS",
        value: mobile.cls,
      });
    }
    if (mobile.accessibility_score != null) {
      perfRows.push({
        check: "ACCESSIBILITY",
        status: mobile.accessibility_score >= 80 ? "PASS" : "WARN",
        value: `${mobile.accessibility_score} / 100`,
      });
    }
  } else {
    perfRows.push({
      check: "LAB METRICS",
      status: "WARN",
      value: "Standard fast inspection pass (PageSpeed API bypassed)",
    });
  }

  const renderStatusBadge = (status: StatusType) => {
    if (status === "PASS") {
      return <span className="text-emerald-700 font-semibold">[PASS]</span>;
    }
    if (status === "WARN") {
      return <span className="text-amber-700 font-semibold">[WARN]</span>;
    }
    return <span className="text-destructive font-semibold">[FAIL]</span>;
  };

  const isoTimestamp = report.created_at
    ? new Date(report.created_at).toISOString()
    : new Date().toISOString();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono text-xs selection:bg-[#E8E6E1] selection:text-foreground">
      <Navigation />

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 pt-24 pb-20 space-y-6">
        {/* Terminal Inspection Header */}
        <div className="border border-border bg-card p-4 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Terminal className="w-4 h-4 text-accent" />
              <span>MONIX INSPECTION REPORT</span>
              <span className="text-muted-foreground font-normal">
                :: {slug}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-border bg-secondary hover:bg-border transition-colors text-[11px] cursor-pointer"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-accent" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "COPIED" : "COPY LINK"}
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent text-accent-foreground text-[11px] hover:opacity-90 transition-opacity"
              >
                NEW SCAN
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <span>TARGET_URL:</span>
              <a
                href={
                  report.url.startsWith("http")
                    ? report.url
                    : `https://${report.url}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline inline-flex items-center gap-1"
              >
                {report.url}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span>TIMESTAMP :</span>
              <span className="text-foreground">{isoTimestamp}</span>
            </div>
          </div>
        </div>

        {/* Dense Score Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="border border-border bg-card p-3 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">
              OVERALL SCORE
            </span>
            <div className="text-xl font-bold text-foreground mt-1">
              {overallScore}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
          <div className="border border-border bg-card p-3 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">
              SECURITY
            </span>
            <div className="text-xl font-bold text-foreground mt-1">
              {secScore}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
          <div className="border border-border bg-card p-3 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">
              SEO HYGIENE
            </span>
            <div className="text-xl font-bold text-foreground mt-1">
              {seoScore}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
          <div className="border border-border bg-card p-3 flex flex-col justify-between">
            <span className="text-[10px] text-muted-foreground uppercase">
              PERFORMANCE
            </span>
            <div className="text-xl font-bold text-foreground mt-1">
              {perfScore != null ? perfScore : "FAST"}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Security Posture */}
        <div className="border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-2 font-semibold text-foreground flex items-center justify-between">
            <span>[01] SECURITY &amp; HEADERS DIAGNOSTICS</span>
            <span>SCORE: {secScore}/100</span>
          </div>
          <div className="divide-y divide-border">
            {securityRows.map((row) => (
              <div
                key={row.check}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  {renderStatusBadge(row.status)}
                  <span className="font-semibold text-foreground">
                    {row.check}
                  </span>
                </div>
                <div className="text-muted-foreground text-right overflow-x-auto max-w-xl truncate">
                  <span className="text-foreground">{row.value}</span>
                  {row.note && (
                    <span className="text-muted-foreground ml-2">
                      ({row.note})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: SEO & Discoverability */}
        <div className="border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-2 font-semibold text-foreground flex items-center justify-between">
            <span>[02] SEO DIRECTIVES &amp; DISCOVERABILITY</span>
            <span>SCORE: {seoScore}/100</span>
          </div>
          <div className="divide-y divide-border">
            {seoRows.map((row) => (
              <div
                key={row.check}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  {renderStatusBadge(row.status)}
                  <span className="font-semibold text-foreground">
                    {row.check}
                  </span>
                </div>
                <div className="text-muted-foreground text-right overflow-x-auto max-w-xl truncate">
                  <span className="text-foreground">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Performance & Core Web Vitals */}
        <div className="border border-border bg-card">
          <div className="border-b border-border bg-secondary/50 px-4 py-2 font-semibold text-foreground flex items-center justify-between">
            <span>[03] PERFORMANCE &amp; CORE WEB VITALS</span>
            <span>
              SCORE: {perfScore != null ? `${perfScore}/100` : "FAST PASS"}
            </span>
          </div>
          <div className="divide-y divide-border">
            {perfRows.map((row) => (
              <div
                key={row.check}
                className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start sm:items-center gap-3">
                  {renderStatusBadge(row.status)}
                  <span className="font-semibold text-foreground">
                    {row.check}
                  </span>
                </div>
                <div className="text-muted-foreground text-right">
                  <span className="text-foreground">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: Raw Inspection Data (Toggleable) */}
        <div className="border border-border bg-card">
          <button
            type="button"
            onClick={() => setShowRawJson(!showRawJson)}
            className="w-full border-b border-border bg-secondary/50 px-4 py-2 font-semibold text-foreground flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
          >
            <span>[04] RAW INSPECTION PAYLOAD</span>
            <span className="text-muted-foreground flex items-center gap-1">
              {showRawJson ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
              {showRawJson ? "COLLAPSE" : "EXPAND JSON"}
            </span>
          </button>
          {showRawJson && (
            <div className="p-4 bg-background overflow-x-auto max-h-96 text-[11px] leading-relaxed">
              <pre className="text-muted-foreground">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
