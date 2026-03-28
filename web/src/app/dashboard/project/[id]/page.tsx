"use client";

import {
  ArrowLeft,
  ChevronRight,
  Clock,
  FileText,
  Globe,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import UrlAnalyzer from "@/components/UrlAnalyzer";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getScans, getTarget, type ScanSummary, type Target } from "@/lib/api";

function TargetHeader({ target }: { target: Target | null }) {
  if (!target) {
    return (
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <Link
          href="/dashboard/projects"
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
          href="/dashboard/projects"
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

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function sameMonitoredUrl(a: string, b: string) {
  const norm = (s: string) => s.trim().replace(/\/$/, "").toLowerCase();
  return norm(a) === norm(b);
}

export default function ProjectWorkspacePage() {
  const params = useParams();
  const id = params?.id as string;
  const [target, setTarget] = useState<Target | null>(null);
  const [targetScans, setTargetScans] = useState<ScanSummary[]>([]);
  const [, setLoading] = useState(true);

  const reloadWorkspace = useCallback(async () => {
    if (!id) return;
    try {
      const [targetData, scansData] = await Promise.all([
        getTarget(id),
        getScans(),
      ]);
      setTarget(targetData);
      setTargetScans(
        scansData.filter(
          (s) =>
            s.target_id === id ||
            (!s.target_id && sameMonitoredUrl(s.url, targetData.url)),
        ),
      );
    } catch (err) {
      console.error("Failed to load project:", err);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        await reloadWorkspace();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, reloadWorkspace]);

  const latestScan = targetScans[0] ?? null;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      <TargetHeader target={target} />

      <section className="space-y-3">
        <h3 className="text-lg font-bold text-white">Saved scans</h3>
        <p className="text-sm text-white/45 max-w-2xl">
          Each run is stored in your database (score, URL, full results). Open
          the report for the detailed breakdown.
        </p>

        {latestScan ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-5 min-w-0">
              <div
                className={`h-16 w-16 shrink-0 rounded-2xl flex items-center justify-center border text-2xl font-black ${scoreTone(latestScan.score)} bg-white/5`}
              >
                {latestScan.score}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  Latest scan
                </p>
                <p className="text-white font-semibold mt-1 truncate">
                  {latestScan.url}
                </p>
                <p className="text-white/40 text-sm mt-1">
                  {new Date(latestScan.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="bg-white text-black hover:bg-white/90 font-bold gap-2 shrink-0 w-full lg:w-auto"
            >
              <Link href={`/dashboard/report/${latestScan.report_id}`}>
                <FileText className="h-4 w-4" />
                View full report
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
            <p className="text-white/50 text-sm">
              No scans for this project yet. Run an analysis below—results will
              appear here and stay linked to this project.
            </p>
          </div>
        )}

        {targetScans.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden mt-4">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                  <TableHead className="text-white/50">When</TableHead>
                  <TableHead className="text-white/50">URL scanned</TableHead>
                  <TableHead className="text-white/50 text-right w-24">
                    Score
                  </TableHead>
                  <TableHead className="text-white/50 text-right w-32">
                    Report
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targetScans.map((scan) => (
                  <TableRow
                    key={scan.id}
                    className="border-white/10 hover:bg-white/[0.04]"
                  >
                    <TableCell className="text-white/60 text-xs whitespace-nowrap">
                      {new Date(scan.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-white/80 text-xs font-mono max-w-[320px]">
                      <span className="truncate block">{scan.url}</span>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold tabular-nums ${scoreTone(scan.score)}`}
                    >
                      {scan.score}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/report/${scan.report_id}`}
                        className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
                      >
                        View
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="pt-2 border-t border-white/10">
        <h3 className="text-sm font-semibold text-white/80 mb-3">New scan</h3>
        <Suspense
          fallback={
            <div className="h-24 flex items-center justify-center text-white/20 text-sm gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading…
            </div>
          }
        >
          <UrlAnalyzer variant="compact" onScanComplete={reloadWorkspace} />
        </Suspense>
      </section>
    </div>
  );
}
