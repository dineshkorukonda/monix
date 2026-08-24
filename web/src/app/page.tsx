"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const SCAN_STAGES = [
  "Resolving DNS records & host infrastructure...",
  "Validating TLS certificate chain & security headers...",
  "Inspecting SEO metadata, robots.txt & XML sitemap...",
  "Calculating Core Web Vitals & performance signals...",
  "Compiling inspection report...",
];

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copiedCli, setCopiedCli] = useState(false);

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
    }, 1000);

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
          data.error || "Inspection failed. Check the URL and try again.",
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
      setError("Network connection error. Please try again.");
      setLoading(false);
    }
  };

  const cliCommand =
    'curl -s -X POST https://monix.dineshkorukonda.in/api/scan -H "Content-Type: application/json" -d \'{"url":"https://example.com"}\'';

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard.writeText(cliCommand);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-20 space-y-12">
        {/* Terminal Header */}
        <header className="border-b border-border pb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[#00ff66] font-mono text-xl font-bold">
              &gt;
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-sans">
              monix
            </h1>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Fast, zero-auth website reconnaissance, security header auditor
            &amp; SEO directive inspector.
          </p>
        </header>

        {/* What is it? Section */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            What is it?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong className="text-white">monix</strong> is an open website
            intelligence inspector. It analyzes any public URL across three
            diagnostic lenses in parallel: TLS certificate chain &amp; security
            headers (HSTS, CSP, X-Frame-Options), SEO directives (robots.txt,
            XML sitemap, Open Graph), and Core Web Vitals performance signals.
          </p>
        </section>

        {/* Live Web Inspector Input */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Run Web Inspection
          </h2>

          <form onSubmit={handleScan} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch border border-border bg-[#0d0d0f] rounded focus-within:border-[#00ff66] transition-colors">
              <div className="flex items-center pl-3.5 pr-1 text-[#00ff66] font-mono text-sm select-none">
                &gt; inspect
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                placeholder="https://example.com"
                className="flex-1 px-3 py-3 bg-transparent text-white placeholder:text-muted-foreground focus:outline-none text-sm font-mono"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-6 py-3 bg-[#00ff66] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed rounded-r"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                    Scanning...
                  </span>
                ) : (
                  <>
                    Run <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 border border-destructive/40 bg-destructive/10 text-destructive font-mono text-xs rounded">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="border border-border bg-[#0d0d0f] p-4 space-y-2.5 font-mono text-xs rounded">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[#00ff66] font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff66] animate-pulse" />
                    {SCAN_STAGES[stageIndex]}
                  </span>
                  <span>
                    [{stageIndex + 1}/{SCAN_STAGES.length}]
                  </span>
                </div>
                <div className="h-1 w-full bg-border overflow-hidden rounded">
                  <div
                    className="h-full bg-[#00ff66] transition-all duration-500 ease-out"
                    style={{
                      width: `${((stageIndex + 1) / SCAN_STAGES.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </form>
        </section>

        {/* CLI / API Direct Access */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            cURL / API Pipeline Integration
          </h2>
          <div className="relative bg-[#0d0d0f] border border-border p-4 pr-20 rounded font-mono text-xs text-[#00ff66] overflow-x-auto">
            <pre className="whitespace-pre-wrap break-all">{cliCommand}</pre>
            <button
              type="button"
              onClick={handleCopyCli}
              className="absolute top-3 right-3 bg-[#18181b] border border-border text-muted-foreground hover:text-[#00ff66] hover:border-[#00ff66] text-[11px] px-2.5 py-1 rounded cursor-pointer transition-colors"
            >
              {copiedCli ? "Copied!" : "Copy"}
            </button>
          </div>
        </section>

        {/* Features List */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Diagnostic Features
          </h2>
          <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
            <li>
              <strong className="text-white">TLS Security Posture</strong> —
              Certificate chain verification, expiration alerts, and issuer
              telemetry.
            </li>
            <li>
              <strong className="text-white">Strict Security Headers</strong> —
              HSTS, Content-Security-Policy (CSP), X-Frame-Options,
              X-Content-Type-Options.
            </li>
            <li>
              <strong className="text-white">SEO Directives</strong> — Meta
              title/description analysis, Open Graph preview tags, robots.txt,
              XML sitemaps.
            </li>
            <li>
              <strong className="text-white">Core Web Vitals</strong> — Largest
              Contentful Paint (LCP), Cumulative Layout Shift (CLS), Total
              Blocking Time.
            </li>
            <li>
              <strong className="text-white">
                Shareable Inspection Artifacts
              </strong>{" "}
              — Permanent reports generated at{" "}
              <code className="text-[#00ff66] font-mono text-xs">
                /r/[slug]
              </code>{" "}
              with zero login wall.
            </li>
            <li>
              <strong className="text-white">Rate-Limited &amp; Free</strong> —
              Sliding window rate limiter (5 scans/hour/IP) prevents API abuse.
            </li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
}
