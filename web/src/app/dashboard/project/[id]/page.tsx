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
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { GscProjectWorkspaceSection } from "@/components/gsc-metrics";
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

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/20";
  return "bg-rose-500/10 border-rose-500/20";
}

function sameMonitoredUrl(a: string, b: string) {
  const norm = (s: string) => s.trim().replace(/\/$/, "").toLowerCase();
  return norm(a) === norm(b);
}

function TargetHeader({ target }: { target: Target | null }) {
  if (!target) {
    return (
      <div className="flex items-center gap-4 pb-6">
        <Link
          href="/dashboard/projects"
          className="h-9 w-9 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="h-6 w-48 bg-white/5 rounded animate-pulse mb-1.5" />
          <div className="h-3.5 w-72 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-6 border-b border-white/10">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Link
          href="/dashboard/projects"
          className="h-9 w-9 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:bg-white/10 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-white truncate">
            {target.name}
          </h2>
          <p className="text-xs text-white/40 font-mono truncate mt-0.5">
            {target.url}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {target.scan_count !== undefined && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50">
            <Globe className="h-3 w-3" />
            {target.scan_count} scan{target.scan_count !== 1 ? "s" : ""}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 border border-white/10 text-white/50">
          <Clock className="h-3 w-3" />
          {target.lastScan ?? "No scans"}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
            target.status === "Healthy"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
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

function WorkspaceInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const autoscan = searchParams.get("autoscan") === "1";

  const [target, setTarget] = useState<Target | null>(null);
  const [targetScans, setTargetScans] = useState<ScanSummary[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <TargetHeader target={target} />

      {/* Scanner - main action */}
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            {autoscan && !latestScan ? "Running scan…" : "New scan"}
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Results are saved to this project automatically.
          </p>
        </div>

        {loading ? (
          <div className="h-20 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse" />
        ) : (
          <UrlAnalyzer
            variant="compact"
            onScanComplete={reloadWorkspace}
            initialUrl={target?.url ?? ""}
            autoStart={autoscan}
          />
        )}
      </section>

      {!loading && target ? (
        <GscProjectWorkspaceSection target={target} />
      ) : null}

      {/* Latest scan card */}
      {!loading && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">Scan history</h3>

          {latestScan ? (
            <>
              <div
                className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${scoreBg(latestScan.score)}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`h-14 w-14 shrink-0 rounded-xl flex items-center justify-center border text-xl font-black ${scoreTone(latestScan.score)} bg-white/5 ${scoreBg(latestScan.score)}`}
                  >
                    {latestScan.score}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                      Latest scan
                    </p>
                    <p className="text-sm text-white font-medium truncate mt-0.5">
                      {latestScan.url}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {new Date(latestScan.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="bg-white text-black hover:bg-white/90 font-bold gap-2 shrink-0"
                >
                  <Link
                    href={`/dashboard/report/${latestScan.report_id}?from=project&project=${id}`}
                  >
                    <FileText className="h-4 w-4" />
                    Full report
                  </Link>
                </Button>
              </div>

              {targetScans.length > 1 && (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                        <TableHead className="text-white/45 text-xs">
                          When
                        </TableHead>
                        <TableHead className="text-white/45 text-xs">
                          URL
                        </TableHead>
                        <TableHead className="text-white/45 text-xs text-right w-20">
                          Score
                        </TableHead>
                        <TableHead className="text-white/45 text-xs text-right w-24">
                          Report
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {targetScans.slice(1).map((scan) => (
                        <TableRow
                          key={scan.id}
                          className="border-white/10 hover:bg-white/[0.03]"
                        >
                          <TableCell className="text-white/50 text-xs whitespace-nowrap">
                            {new Date(scan.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-white/60 text-xs font-mono max-w-[260px]">
                            <span className="truncate block">{scan.url}</span>
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold tabular-nums text-sm ${scoreTone(scan.score)}`}
                          >
                            {scan.score}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/dashboard/report/${scan.report_id}?from=project&project=${id}`}
                              className="inline-flex items-center gap-0.5 text-xs text-white/45 hover:text-white"
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
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <p className="text-white/40 text-sm">
                No scans yet — run one above to get started.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function ProjectWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-40 text-white/20 text-sm gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      }
    >
      <WorkspaceInner />
    </Suspense>
  );
}
