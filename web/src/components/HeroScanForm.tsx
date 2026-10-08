"use client";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  Globe,
  Loader2,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SCAN_STAGES = [
  "Resolving DNS records & host infrastructure...",
  "Querying CT logs & discovering subdomains...",
  "Validating TLS certificate chain & security headers...",
  "Inspecting SEO metadata, robots.txt & XML sitemap...",
  "Compiling comprehensive inspection report...",
];

const QUICK_TARGETS = [
  "dineshkorukonda.in",
  "github.com",
  "stripe.com",
  "indevs.in",
];

export function HeroScanForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const executeScan = async (target?: string) => {
    const rawTarget = (target || url).trim();
    if (!rawTarget || loading) return;

    if (target) {
      setUrl(target);
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
        body: JSON.stringify({ url: rawTarget }),
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
    <div className="w-full bg-[#0d0d12] border border-zinc-800 rounded-xl p-5 sm:p-6 space-y-4 font-mono shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#00ff66]" />
          <span className="text-white text-xs font-semibold uppercase tracking-wider">
            Zero-Auth Instant Reconnaissance
          </span>
        </div>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider hidden sm:inline">
          Public Scan Engine v2
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          executeScan();
        }}
        className="flex flex-col sm:flex-row items-stretch gap-2.5"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            placeholder="Enter hostname or URL (e.g., example.com)..."
            className="w-full pl-10 pr-4 py-3 bg-[#07070a] border border-zinc-800 rounded text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00ff66] transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-6 py-3 bg-[#00ff66] text-black font-bold text-xs uppercase tracking-wider rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Inspecting...</span>
            </>
          ) : (
            <>
              <span>Inspect Target</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Quick Example Targets */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-500">
        <span>Quick probe:</span>
        {QUICK_TARGETS.map((target) => (
          <button
            key={target}
            type="button"
            onClick={() => executeScan(target)}
            disabled={loading}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-[#00ff66] hover:text-[#00ff66] transition-colors text-zinc-400 cursor-pointer disabled:opacity-50"
          >
            {target}
          </button>
        ))}
      </div>

      {/* Active Stage Indicator */}
      {loading && (
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded flex items-center gap-3 text-xs text-zinc-300 animate-pulse">
          <Activity className="w-4 h-4 text-[#00ff66] shrink-0 animate-spin" />
          <span>{SCAN_STAGES[stageIndex]}</span>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/80 rounded flex items-center gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
