"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

type CheckItem = {
  name: string;
  status: CheckStatus;
  detail: string;
  value?: string;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getScoreClasses(score: number) {
  if (score > 75) {
    return {
      text: "text-emerald-300",
      border: "border-emerald-400/20",
      background: "bg-emerald-400/10",
    };
  }

  if (score >= 50) {
    return {
      text: "text-amber-300",
      border: "border-amber-400/20",
      background: "bg-amber-400/10",
    };
  }

  return {
    text: "text-rose-300",
    border: "border-rose-400/20",
    background: "bg-rose-400/10",
  };
}

function getStatusClasses(status: CheckStatus) {
  if (status === "pass") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "warn") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-rose-400/20 bg-rose-400/10 text-rose-200";
}

function getHeaderCoverageStatus(percentage: number): CheckStatus {
  if (percentage >= 70) {
    return "pass";
  }
  if (percentage >= 30) {
    return "warn";
  }
  return "fail";
}

function getNumericScoreStatus(score: number | null | undefined): CheckStatus {
  if (score == null) {
    return "fail";
  }
  if (score >= 90) {
    return "pass";
  }
  if (score >= 50) {
    return "warn";
  }
  return "fail";
}

function getStatusWeight(status: CheckStatus) {
  return status === "pass" ? 1 : status === "warn" ? 0.5 : 0;
}

function deriveSecurityScore(results: StoredReportResults) {
  const sslStatus: CheckStatus = results.ssl_certificate?.valid
    ? "pass"
    : "fail";
  const headerStatus = getHeaderCoverageStatus(
    results.security_headers_analysis?.percentage ?? 0,
  );
  const securityTxtStatus: CheckStatus = results.security_txt?.present
    ? "pass"
    : "fail";

  return Math.round(
    ((getStatusWeight(sslStatus) * 50 +
      getStatusWeight(headerStatus) * 40 +
      getStatusWeight(securityTxtStatus) * 10) /
      100) *
      100,
  );
}

function derivePerformanceScore(results: StoredReportResults) {
  const candidateScores = [
    results.performance?.mobile?.performance_score,
    results.performance?.desktop?.performance_score,
  ].filter((value): value is number => value != null);

  if (candidateScores.length === 0) {
    return 0;
  }

  return Math.round(
    candidateScores.reduce((sum, value) => sum + value, 0) /
      candidateScores.length,
  );
}

function buildSecurityChecks(results: StoredReportResults): CheckItem[] {
  const headerPercentage = results.security_headers_analysis?.percentage ?? 0;
  const cookieList = results.cookies?.cookies ?? [];
  const insecureCookies = cookieList.filter(
    (cookie) => !cookie.secure || !cookie.httponly,
  ).length;
  const openPorts = results.port_scan?.open_ports ?? [];

  return [
    {
      name: "SSL Certificate",
      status: results.ssl_certificate?.valid ? "pass" : "fail",
      detail: results.ssl_certificate?.valid
        ? "TLS certificate is valid."
        : results.ssl_certificate?.error || "Certificate validation failed.",
    },
    {
      name: "Security Headers",
      status: getHeaderCoverageStatus(headerPercentage),
      detail: `${headerPercentage}% of recommended security headers are present.`,
      value: `${headerPercentage}/100`,
    },
    {
      name: "security.txt",
      status: results.security_txt?.present ? "pass" : "fail",
      detail: results.security_txt?.present
        ? "security.txt is published."
        : "No security.txt file was detected.",
    },
    {
      name: "HTTPS",
      status: results.summary?.https ? "pass" : "fail",
      detail: results.summary?.https
        ? "The target was scanned over HTTPS."
        : "The target did not resolve to HTTPS.",
    },
    {
      name: "Cookie Hygiene",
      status:
        insecureCookies === 0 ? "pass" : insecureCookies <= 2 ? "warn" : "fail",
      detail:
        cookieList.length === 0
          ? "No cookies were observed during the scan."
          : `${insecureCookies} of ${cookieList.length} cookies are missing Secure or HttpOnly.`,
    },
    {
      name: "Open Ports",
      status:
        openPorts.length === 0
          ? "pass"
          : openPorts.length <= 2
            ? "warn"
            : "fail",
      detail:
        openPorts.length === 0
          ? "No open ports were detected in the requested scan."
          : `Open ports detected: ${openPorts.join(", ")}.`,
    },
  ];
}

function buildSeoChecks(results: StoredReportResults): CheckItem[] {
  const entries = Object.entries(results.seo?.checks ?? {});
  if (entries.length === 0) {
    return [
      {
        name: "SEO Checks",
        status: "fail",
        detail:
          results.seo?.error || "SEO checks were not available for this scan.",
      },
    ];
  }

  return entries.map(([name, value]: [string, SeoCheckResult]) => ({
    name: formatLabel(name),
    status: value.status,
    detail: value.detail,
  }));
}

function buildPerformanceChecks(results: StoredReportResults): CheckItem[] {
  const strategies = Object.entries(results.performance ?? {}) as Array<
    [string, PerformanceStrategyResult]
  >;

  if (strategies.length === 0) {
    return [
      {
        name: "Performance Checks",
        status: "fail",
        detail: "Performance data was not available for this scan.",
      },
    ];
  }

  return strategies.flatMap<CheckItem>(([name, value]) => {
    if (value.error) {
      return [
        {
          name: `${formatLabel(name)} Performance`,
          status: "fail" as const,
          detail: value.error,
        },
      ];
    }

    return [
      {
        name: `${formatLabel(name)} Performance`,
        status: getNumericScoreStatus(value.performance_score),
        detail: `Lighthouse performance score for ${name}.`,
        value:
          value.performance_score == null
            ? "N/A"
            : `${value.performance_score}/100`,
      },
      {
        name: `${formatLabel(name)} Accessibility`,
        status: getNumericScoreStatus(value.accessibility_score),
        detail: `Accessibility score for ${name}.`,
        value:
          value.accessibility_score == null
            ? "N/A"
            : `${value.accessibility_score}/100`,
      },
      {
        name: `${formatLabel(name)} Best Practices`,
        status: getNumericScoreStatus(value.best_practices_score),
        detail: `Best-practices score for ${name}.`,
        value:
          value.best_practices_score == null
            ? "N/A"
            : `${value.best_practices_score}/100`,
      },
    ];
  });
}

function ScorePanel({
  label,
  score,
  emphasis = false,
}: {
  label: string;
  score: number;
  emphasis?: boolean;
}) {
  const tone = getScoreClasses(score);

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 md:p-6 backdrop-blur-sm",
        tone.border,
        tone.background,
        emphasis ? "min-h-[200px] flex flex-col justify-between" : "h-full",
      )}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "font-semibold tabular-nums",
          tone.text,
          emphasis ? "text-6xl md:text-7xl" : "text-3xl md:text-4xl",
        )}
      >
        {score}
      </div>
      <p className="text-sm text-muted-foreground">
        {score > 75 ? "Strong" : score >= 50 ? "Needs attention" : "High risk"}
      </p>
    </div>
  );
}

function CheckGroup({
  title,
  score,
  checks,
}: {
  title: string;
  score: number;
  checks: CheckItem[];
}) {
  const tone = getScoreClasses(score);

  return (
    <Card className="h-full border-border/80 bg-card/50">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">{title}</CardTitle>
          <div
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium",
              tone.border,
              tone.background,
              tone.text,
            )}
          >
            {score}/100
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-6">
        {checks.map((check) => (
          <div
            key={`${title}-${check.name}`}
            className="rounded-xl border border-border/60 bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {check.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {check.detail}
                </p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
                  getStatusClasses(check.status),
                )}
              >
                {check.status}
              </span>
            </div>
            {check.value ? (
              <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground/80">
                {check.value}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [report, setReport] = useState<ScanReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let active = true;

    async function loadReport() {
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const data = await getReport(id);
        if (!active) {
          return;
        }
        setReport(data);
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          setReport(null);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this report right now.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [id]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError(
        "Copy failed. Please copy the URL from your browser address bar.",
      );
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
        <div className="h-9 w-40 rounded-md bg-muted" />
        <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="h-10 w-2/3 max-w-md bg-muted rounded" />
          <div className="h-20 bg-muted/50 rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Not found
        </p>
        <h1 className="text-2xl font-semibold text-foreground">
          Report not found or expired
        </h1>
        <p className="text-sm text-muted-foreground">
          This scan may have expired, or the link is invalid.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <Button asChild>
            <Link href="/dashboard/scans">Scan history</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/web">Public scanner</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-lg space-y-4">
        <h1 className="text-xl font-semibold text-foreground">
          Report unavailable
        </h1>
        <p className="text-sm text-muted-foreground">
          {error || "Unable to load this report right now."}
        </p>
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
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Link
            href="/dashboard/scans"
            className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Back to scan history"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Scan report
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Full results
            </h1>
            <p className="mt-2 break-all font-mono text-sm text-muted-foreground">
              {report.url}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          <Button asChild size="sm">
            <Link href={`/web?url=${encodeURIComponent(report.url)}`}>
              Scan again
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card/40 p-6 md:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border/80 bg-background/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Scan date
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-foreground">
              {formatDateTime(report.created_at)}
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-background/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Report expires
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-foreground">
              {formatDateTime(report.expires_at)}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.25fr_repeat(3,0.75fr)]">
        <ScorePanel label="Overall score" score={scores.overall} emphasis />
        <ScorePanel label="Security" score={scores.security} />
        <ScorePanel label="SEO" score={scores.seo} />
        <ScorePanel label="Performance" score={scores.performance} />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <CheckGroup
          title="Security checks"
          score={scores.security}
          checks={securityChecks}
        />
        <CheckGroup title="SEO checks" score={scores.seo} checks={seoChecks} />
        <CheckGroup
          title="Performance checks"
          score={scores.performance}
          checks={performanceChecks}
        />
      </section>

      {(results.findings?.length || results.recommendations?.length) && (
        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Findings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {(results.findings ?? []).map((finding) => (
                <div
                  key={`${finding.title}-${finding.detail}`}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {finding.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {finding.detail}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              {(results.recommendations ?? []).map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-6 text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {error ? (
        <p className="text-sm text-amber-600 dark:text-amber-300">{error}</p>
      ) : null}
    </div>
  );
}
