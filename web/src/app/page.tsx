"use client";

import { AlertCircle, ArrowRight, CheckCircle2, Terminal } from "lucide-react";
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
        setError("Report generated without a slug.");
        setLoading(false);
      }
    } catch {
      clearInterval(interval);
      setError("Network connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#E8E6E1] selection:text-foreground">
      <Navigation />

      <main className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full px-6 pt-28 pb-20">
        <div className="space-y-8">
          {/* Header & Tool Description */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 border border-border bg-secondary font-mono text-[11px] text-muted-foreground uppercase tracking-widest">
              <Terminal className="w-3.5 h-3.5 text-accent" />
              Website Diagnostic Inspector
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-foreground">
              Inspect any website.
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-mono leading-relaxed max-w-2xl">
              Instant evaluation across Security headers, TLS posture, SEO
              directives, and Core Web Vitals. Zero login required.
            </p>
          </div>

          {/* Core Input Utility Bar */}
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch border border-border bg-card focus-within:border-foreground transition-colors">
              <div className="flex items-center pl-4 text-muted-foreground font-mono text-xs select-none">
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
                placeholder="https://example.com"
                className="flex-1 px-3 py-3.5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm sm:text-base font-mono"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-6 py-3.5 bg-accent text-accent-foreground font-medium text-xs font-mono uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed border-t sm:border-t-0 sm:border-l border-border"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent-foreground animate-ping" />
                    Running
                  </span>
                ) : (
                  <>
                    Run Inspection <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 border border-destructive/30 bg-destructive/5 text-destructive font-mono text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Live Progress Terminal Indicator */}
            {loading && (
              <div className="border border-border bg-secondary/60 p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    {SCAN_STAGES[stageIndex]}
                  </span>
                  <span>
                    [{stageIndex + 1}/{SCAN_STAGES.length}]
                  </span>
                </div>
                <div className="h-1.5 w-full bg-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-500 ease-out"
                    style={{
                      width: `${((stageIndex + 1) / SCAN_STAGES.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </form>

          {/* Quick Technical Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span>Free public report output</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span>TLS &amp; HTTP security check</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
              <span>5 requests / hour / IP</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
