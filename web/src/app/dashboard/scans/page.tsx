"use client";

import {
  Activity,
  ChevronRight,
  Clock,
  Plus,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getScans, type ScanSummary } from "@/lib/api";

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null)
    return <span className="text-xs text-white/30 font-mono">—</span>;
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="h-3 w-3" />
        {score}
      </span>
    );
  }
  if (score >= 50) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <ShieldAlert className="h-3 w-3" />
        {score}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <ShieldX className="h-3 w-3" />
      {score}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-white/[0.06]">
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 bg-white/5 rounded animate-pulse" />
        <div className="h-2.5 w-52 bg-white/5 rounded animate-pulse" />
      </div>
      <div className="h-6 w-16 bg-white/5 rounded-full animate-pulse" />
      <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
      <div className="h-3 w-8 bg-white/5 rounded animate-pulse" />
    </div>
  );
}

export default function ScansPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getScans()
      .then(setScans)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load scans"),
      )
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Scan History
          </h2>
          <p className="text-sm text-white/40 mt-1">
            All security scans across your monitored targets.
          </p>
        </div>
        <Button
          asChild
          className="bg-white text-black hover:bg-white/90 font-semibold shrink-0"
        >
          <Link href="/dashboard/sites">
            <Plus className="h-4 w-4 mr-2" />
            New scan
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-sm text-rose-400">
          {error}
        </div>
      )}

      {!isLoading && !error && scans.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 mb-4">
            <Activity className="h-5 w-5 text-white/30" />
          </div>
          <p className="font-semibold text-white/50">No scans yet.</p>
          <p className="text-sm text-white/30 mt-1">
            Add a target and run your first scan to see results here.
          </p>
          <Link
            href="/dashboard/sites"
            className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-5 py-2.5 rounded-lg transition-all"
          >
            <Shield className="h-4 w-4" />
            Add a site
          </Link>
        </div>
      )}

      {!isLoading && !error && scans.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30">Target</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 text-right">Score</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 text-right">Date</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/30 text-right">Report</span>
          </div>

          {scans.map((scan, idx) => (
            <div
              key={scan.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-white/[0.03] transition-colors ${
                idx !== scans.length - 1 ? "border-b border-white/[0.05]" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/80 truncate">
                  {scan.target_name}
                </p>
                <p className="text-[11px] text-white/30 font-mono truncate mt-0.5">
                  {scan.url}
                </p>
              </div>

              <ScoreBadge score={scan.score} />

              <div className="flex items-center gap-1.5 text-xs text-white/35 whitespace-nowrap">
                <Clock className="h-3 w-3 shrink-0" />
                {new Date(scan.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              <Link
                href={`/dashboard/report/${scan.report_id}`}
                className="flex items-center gap-0.5 text-xs font-medium text-white/35 hover:text-white transition-colors"
              >
                View
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
