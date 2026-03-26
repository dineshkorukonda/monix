"use client";

import {
  Activity,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getScans, type ScanSummary } from "@/lib/api";

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
        <ShieldCheck className="h-3 w-3" /> {score}
      </span>
    );
  }
  if (score >= 50) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/20">
        <ShieldAlert className="h-3 w-3" /> {score}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-500 border border-red-500/20">
      <ShieldX className="h-3 w-3" /> {score}
    </span>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-muted/40 animate-pulse border border-border"
        />
      ))}
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Scan History
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete history of security scans run across all your monitored
          targets.
        </p>
      </div>

      {isLoading && <Skeleton />}

      {!isLoading && error && (
        <div className="border border-destructive/30 bg-destructive/5 rounded-xl p-8 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && scans.length === 0 && (
        <div className="border border-border bg-card rounded-xl p-10 text-center text-muted-foreground">
          <Activity className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No scans yet.</p>
          <p className="text-sm mt-1">
            Add a target and run your first scan to see results here.
          </p>
          <Link
            href="/dashboard/new"
            className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-foreground bg-foreground/10 hover:bg-foreground/15 border border-border px-4 py-2 rounded-lg transition-colors"
          >
            <Target className="h-4 w-4" /> Add Target
          </Link>
        </div>
      )}

      {!isLoading && !error && scans.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>Target</span>
            <span className="text-right">Score</span>
            <span className="text-right">Date</span>
            <span className="text-right">Report</span>
          </div>

          {scans.map((scan, idx) => (
            <div
              key={scan.id}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 ${
                idx !== scans.length - 1 ? "border-b border-border/60" : ""
              } hover:bg-muted/20 transition-colors`}
            >
              {/* Target info */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {scan.target_name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {scan.url}
                </p>
              </div>

              {/* Score */}
              <ScoreBadge score={scan.score} />

              {/* Date */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                <Clock className="h-3 w-3 shrink-0" />
                {new Date(scan.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>

              {/* Report link */}
              <Link
                href={`/report/${scan.report_id}`}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
