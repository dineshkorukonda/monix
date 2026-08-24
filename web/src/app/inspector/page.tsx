"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const SCAN_STAGES = [
  "Resolving DNS records & host infrastructure...",
  "Querying CT logs & enumerating subdomains (via subchk)...",
  "Validating TLS certificate chain & security headers...",
  "Inspecting SEO metadata, robots.txt & XML sitemap...",
  "Calculating Core Web Vitals & performance signals...",
  "Compiling comprehensive inspection report...",
];

const EXAMPLE_DOMAINS = [
  "dineshkorukonda.in",
  "github.com",
  "klaf.in",
  "stripe.com",
];

export default function InspectorPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (e?: React.FormEvent, targetUrl?: string) => {
    if (e) e.preventDefault();
    const cleanUrl = (targetUrl || url).trim();
    if (!cleanUrl) return;

    if (targetUrl) {
      setUrl(targetUrl);
    }

    setLoading(true);
    setError(null);
    setStageIndex(0);

    const interval = setInterval(() => {
      setStageIndex((prev) =>
        prev < SCAN_STAGES.length - 1 ? prev + 1 : prev,
      );
    }, 900);

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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-20 space-y-10">
        {/* Header */}
        <header className="border-b border-border pb-6 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse" />
            <span className="font-mono text-xs text-[#00ff66] uppercase tracking-widest">
              MONIX :: ALL-IN-ONE WEBSITE INSPECTOR
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Comprehensive Website Diagnostic Engine
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            Type any public domain or URL to run an instant full-spectrum
            diagnostic: security headers, TLS certificate validation, subdomains
            discovery, SEO hygiene, and live uptime telemetry.
          </p>
        </header>

        {/* Inspection Form */}
        <section className="space-y-4">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch border border-border bg-[#0d0d0f] rounded focus-within:border-[#00ff66] transition-colors">
              <div className="flex items-center pl-4 pr-1 text-muted-foreground font-mono text-xs select-none">
                <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                URL:
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                disabled={loading}
                placeholder="https://example.com or example.com"
                className="flex-1 px-3 py-4 bg-transparent text-white placeholder:text-muted-foreground focus:outline-none text-sm font-mono"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-8 py-4 bg-[#00ff66] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed rounded-r"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                    Inspecting...
                  </span>
                ) : (
                  <>
                    Inspect Now <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Quick Example Chips */}
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs text-muted-foreground">
              <span>Quick inspect:</span>
              {EXAMPLE_DOMAINS.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => handleScan(undefined, domain)}
                  disabled={loading}
                  className="px-2.5 py-1 border border-border bg-[#18181b] hover:border-[#00ff66] hover:text-[#00ff66] rounded transition-colors text-[11px]"
                >
                  {domain}
                </button>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 border border-destructive/40 bg-destructive/10 text-destructive font-mono text-xs rounded">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="border border-border bg-[#0d0d0f] p-5 space-y-3 font-mono text-xs rounded">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[#00ff66] font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
                    {SCAN_STAGES[stageIndex]}
                  </span>
                  <span>
                    [{stageIndex + 1}/{SCAN_STAGES.length}]
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[#18181b] overflow-hidden rounded">
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

        {/* Quick Badges */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
            <span>Zero login required</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
            <span>Permanent shareable report</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
            <span>5 scans / hour / IP</span>
          </div>
        </section>

        {/* Feature 1: Subdomain Reconnaissance (Powered by subchk) */}
        <section className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Globe className="w-4 h-4 text-[#00ff66]" />
              <span>Subdomain Reconnaissance (Powered by subchk)</span>
            </div>
            <a
              href="https://subchk.dineshkorukonda.online/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00ff66] hover:underline font-mono inline-flex items-center gap-1"
            >
              subchk CLI Project <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">
            Every scan uses a native TypeScript port of{" "}
            <strong className="text-white">subchk</strong>. It aggregates
            Certificate Transparency logs across{" "}
            <code className="text-[#00ff66]">crt.sh</code>,{" "}
            <code className="text-[#00ff66]">HackerTarget</code>, and{" "}
            <code className="text-[#00ff66]">AlienVault OTX</code>, filters
            wildcard DNS false-positives, resolves IPv4s, and probes HTTP
            liveness.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
            <div className="border border-border bg-[#18181b] p-3 rounded space-y-1">
              <span className="text-muted-foreground uppercase text-[10px]">
                PASSIVE CT FEEDS
              </span>
              <p className="text-white font-bold">
                crt.sh + OTX + HackerTarget
              </p>
            </div>
            <div className="border border-border bg-[#18181b] p-3 rounded space-y-1">
              <span className="text-muted-foreground uppercase text-[10px]">
                WILDCARD FILTERING
              </span>
              <p className="text-[#00ff66] font-bold">Active DNS Bypass</p>
            </div>
            <div className="border border-border bg-[#18181b] p-3 rounded space-y-1">
              <span className="text-muted-foreground uppercase text-[10px]">
                LIVENESS PROBING
              </span>
              <p className="text-white font-bold">HTTP / HTTPS Status Codes</p>
            </div>
          </div>
        </section>

        {/* Feature 2: Uptime & Live Health Status */}
        <section className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Activity className="w-4 h-4 text-[#00ff66]" />
              <span>Live Operational Status &amp; Uptime</span>
            </div>
            <Link
              href="/status"
              className="text-xs text-[#00ff66] hover:underline font-mono inline-flex items-center gap-1"
            >
              Open Status Directory <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">
            Instantly view real-time latency, HTTP status, and TLS certificate
            expiration for any host. Monitored targets receive 5-minute
            automated heartbeats, 2-failure incident detection, and webhook
            notifications.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <Link
              href="/status"
              className="border border-border bg-[#18181b] hover:border-[#00ff66] p-3.5 rounded flex items-center justify-between transition-colors group"
            >
              <div>
                <span className="text-white font-semibold group-hover:text-[#00ff66] transition-colors block">
                  Search Any Status Page
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Check uptime &amp; 30-day incident histories at /status
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00ff66] transition-colors" />
            </Link>

            <Link
              href="/docs/webhooks"
              className="border border-border bg-[#18181b] hover:border-[#00ff66] p-3.5 rounded flex items-center justify-between transition-colors group"
            >
              <div>
                <span className="text-white font-semibold group-hover:text-[#00ff66] transition-colors block">
                  Webhook Alert Reference
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Event schemas for incident.started &amp; cert warnings
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00ff66] transition-colors" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
