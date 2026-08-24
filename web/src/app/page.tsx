"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Gauge,
  Search,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const pillars = [
  {
    icon: Shield,
    title: "Security",
    description:
      "TLS certificate chain validation, strict security headers (HSTS, CSP, framing), DNS intelligence, and technology exposure checks.",
    checks: [
      "Certificates & TLS posture",
      "HSTS, CSP & Cookie security",
      "DNS records & host intelligence",
    ],
  },
  {
    icon: Search,
    title: "SEO",
    description:
      "On-page discoverability signals: title tags, meta descriptions, Open Graph preview integrity, robots.txt directives, and sitemap accessibility.",
    checks: [
      "Title & Open Graph metadata",
      "robots.txt & XML sitemap",
      "Heading hierarchy & hygiene",
    ],
  },
  {
    icon: Gauge,
    title: "Performance",
    description:
      "Core Web Vitals, lab metrics, and web performance indicators to evaluate speed, responsiveness, and layout stability.",
    checks: [
      "Largest Contentful Paint (LCP)",
      "Cumulative Layout Shift (CLS)",
      "Speed Index & Total Blocking Time",
    ],
  },
] as const;

const steps = [
  {
    num: "01",
    title: "Input any public URL",
    body: "Enter any domain or URL into the scanner. No sign-up, session, or account required.",
  },
  {
    num: "02",
    title: "Multidimensional evaluation",
    body: "Monix evaluates security configurations, SEO hygiene, and performance signals in parallel.",
  },
  {
    num: "03",
    title: "Permanent, shareable report",
    body: "Receive a permanent report at a dedicated public link. Revisit or share it anytime.",
  },
] as const;

const SCAN_STAGES = [
  "Resolving DNS & infrastructure...",
  "Validating TLS certificates & security headers...",
  "Analyzing SEO metadata & crawl directives...",
  "Evaluating performance signals...",
  "Compiling report...",
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    if (!cleanUrl) return;

    setLoading(true);
    setError(null);
    setStageIndex(0);

    const interval = setInterval(() => {
      setStageIndex((prev) =>
        prev < SCAN_STAGES.length - 1 ? prev + 1 : prev,
      );
    }, 1200);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await res.json();
      clearInterval(interval);

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to analyze URL. Please check the URL and try again.",
        );
        setLoading(false);
        return;
      }

      const slug = data.slug || data.public_slug;
      if (slug) {
        router.push(`/r/${slug}`);
      } else {
        setError("Report generated without an identifier.");
        setLoading(false);
      }
    } catch {
      clearInterval(interval);
      setError("An unexpected network error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#E8E6E1] selection:text-foreground">
      <Navigation />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-32 pb-20 md:pt-40 md:pb-28 px-6 max-w-5xl mx-auto">
          <div className="max-w-3xl space-y-6">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.25em]">
              Instant Website Intelligence
            </p>
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-medium tracking-tight text-foreground leading-[1.08]">
              One URL. Three lenses. Zero guesswork.
            </h1>
            <p className="text-muted-foreground text-lg sm:text-xl font-normal leading-relaxed max-w-2xl">
              Comprehensive security, SEO, and performance evaluation in a
              single instant scan.
            </p>

            {/* URL Input Hero Form */}
            <form onSubmit={handleScan} className="pt-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-0 border border-border bg-card p-1.5 sm:p-2 focus-within:border-foreground/40 transition-colors">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  placeholder="Enter a website URL, e.g. github.com"
                  className="flex-1 px-4 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-base font-sans"
                />
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="px-8 py-3 bg-accent text-accent-foreground font-medium text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      Analyzing
                    </span>
                  ) : (
                    <>
                      Analyze <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-destructive font-mono pt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Calm Progress State */}
              {loading && (
                <div className="border border-border bg-secondary/50 p-4 space-y-2.5 transition-all">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                      {SCAN_STAGES[stageIndex]}
                    </span>
                    <span>
                      {stageIndex + 1} / {SCAN_STAGES.length}
                    </span>
                  </div>
                  <div className="h-1 w-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-700 ease-out"
                      style={{
                        width: `${((stageIndex + 1) / SCAN_STAGES.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-mono text-muted-foreground">
              <span>✓ No sign-up required</span>
              <span>✓ Free public reports</span>
              <span>✓ 5 scans/hour per IP</span>
            </div>
          </div>
        </section>

        {/* Evaluation Pillars Section */}
        <section className="border-t border-border bg-card py-20 px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="max-w-xl space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Coverage
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
                What we evaluate
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                Three independent lenses deliver structured diagnostic scores
                and actionable insights.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="border border-border p-6 sm:p-8 space-y-5 bg-background flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Icon className="w-5 h-5 text-accent" />
                        <span className="font-mono text-xs text-muted-foreground uppercase">
                          Lens
                        </span>
                      </div>
                      <h3 className="font-serif text-2xl font-medium">
                        {pillar.title}
                      </h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {pillar.description}
                      </p>
                    </div>

                    <ul className="space-y-2.5 border-t border-border pt-5 text-xs text-muted-foreground font-mono">
                      {pillar.checks.map((check) => (
                        <li key={check} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span>{check}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="border-t border-border py-20 px-6">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="max-w-xl space-y-3">
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Process
              </p>
              <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight">
                How it works
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                From domain lookup to shareable diagnostic metrics in seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step) => (
                <div
                  key={step.num}
                  className="space-y-4 border-l border-border pl-6"
                >
                  <span className="font-mono text-xs text-accent font-semibold">
                    {step.num}
                  </span>
                  <h3 className="font-serif text-xl font-medium">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Documentation & Workspace Callout */}
        <section className="border-t border-border bg-secondary/30 py-16 px-6">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <h3 className="font-serif text-2xl font-medium">
                Looking for ongoing monitoring?
              </h3>
              <p className="text-sm text-muted-foreground">
                Sign in to save sites, track historical trend lines, and
                configure Search Console or Cloudflare integrations.
              </p>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <Link
                href="/docs"
                className="text-sm font-medium underline decoration-border hover:decoration-foreground transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/login"
                className="px-5 py-2.5 border border-border bg-card text-foreground text-sm font-medium hover:bg-secondary transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
