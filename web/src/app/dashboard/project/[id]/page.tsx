"use client";

import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import UrlAnalyzer from "@/components/UrlAnalyzer";
import { getTarget, getScans, type Target, type ScanSummary } from "@/lib/api";
import { Button } from "@/components/ui/button";

function TargetHeader({ target }: { target: Target | null }) {
  if (!target) {
    return (
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <Link
          href="/dashboard"
          className="h-9 w-9 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="h-7 w-48 bg-white/5 rounded animate-pulse mb-1" />
          <div className="h-4 w-72 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-white/10 pb-6">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <Link
          href="/dashboard"
          className="h-9 w-9 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-0.5 truncate">
            {target.name}
          </h2>
          <p className="text-xs text-white/40 font-mono truncate">
            {target.url}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50">
          <Server className="h-3 w-3" />
          {target.environment}
        </span>

        {target.scan_count !== undefined && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50">
            <Globe className="h-3 w-3" />
            {target.scan_count} scan{target.scan_count !== 1 ? "s" : ""}
          </span>
        )}

        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50">
          <Clock className="h-3 w-3" />
          {target.lastScan}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
            target.status === "Healthy"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-amber-500/10 border-amber-500/20 text-amber-500"
          }`}
        >
          {target.status === "Healthy" ? (
            <ShieldCheck className="h-3 w-3" />
          ) : (
            <ShieldAlert className="h-3 w-3" />
          )}
          {target.status}
        </span>
      </div>
    </div>
  );
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const id = params?.id as string;
  const [target, setTarget] = useState<Target | null>(null);
  const [latestScan, setLatestScan] = useState<ScanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    const loadTargetData = async () => {
      try {
        const [targetData, scansData] = await Promise.all([
          getTarget(id),
          getScans()
        ]);
        setTarget(targetData);
        
        // Find latest scan for THIS target
        const targetScans = scansData.filter(s => s.target_id === id);
        if (targetScans.length > 0) {
          setLatestScan(targetScans[0]); // Scans are sorted by created_at desc in API
        }
      } catch (err) {
        console.error("Failed to load target data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTargetData();
  }, [id]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <TargetHeader target={target} />

      {latestScan && (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border ${
              latestScan.score >= 80 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
            }`}>
              <span className="text-xl font-black">{latestScan.score}</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Most Recent Scan Result</h3>
              <p className="text-white/40 text-sm">
                Generated on {new Date(latestScan.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <Button asChild className="bg-white text-black hover:bg-white/90 font-bold h-12 px-8 gap-2 w-full md:w-auto">
            <Link href={`/report/${latestScan.report_id}`}>
              <ExternalLink className="h-4 w-4" />
              View Full Report
            </Link>
          </Button>
        </div>
      )}

      <div className="pt-2">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1">Trigger New Analysis</h3>
          <p className="text-white/40 text-sm">Run a fresh security audit for this target environment.</p>
        </div>
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-white/20 text-sm gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              Initializing analysis engine...
            </div>
          }
        >
          <UrlAnalyzer />
        </Suspense>
      </div>
    </div>
  );
}
