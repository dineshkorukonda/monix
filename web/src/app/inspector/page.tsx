"use client";

import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
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

export default function InspectorPage() {
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
        <header className="border-b border-border pb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Website Inspector
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enter any public website URL to run an immediate security header
            audit, TLS verification, SEO check, and Core Web Vitals diagnostic.
          </p>
        </header>

        {/* Inspection Form */}
        <section className="space-y-4">
          <form onSubmit={handleScan} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch border border-border bg-[#0d0d0f] rounded focus-within:border-[#00ff66] transition-colors">
              <div className="flex items-center pl-4 pr-1 text-muted-foreground font-mono text-xs select-none">
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
                className="flex-1 px-3 py-3.5 bg-transparent text-white placeholder:text-muted-foreground focus:outline-none text-sm font-mono"
              />
              <button
                type="submit"
                disabled={loading || !url.trim()}
                className="px-7 py-3.5 bg-[#00ff66] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed rounded-r"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-black animate-ping" />
                    Scanning...
                  </span>
                ) : (
                  <>
                    Inspect <ArrowRight className="w-4 h-4" />
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
      </main>

      <Footer />
    </div>
  );
}
