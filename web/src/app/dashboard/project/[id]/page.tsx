import {
  ArrowLeft,
  Clock,
  Globe,
  Server,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import UrlAnalyzer from "@/components/UrlAnalyzer";
import { getTarget } from "@/lib/api";

async function TargetHeader({ id }: { id: string }) {
  let target = null;
  try {
    target = await getTarget(id);
  } catch {
    // Target may be new or backend offline — fall back gracefully
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4 border-b border-border pb-6">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <Link
          href="/dashboard"
          className="h-9 w-9 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors mt-0.5"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-0.5 truncate">
            {target?.name ?? "Project Workspace"}
          </h2>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {target?.url ?? `id: ${id}`}
          </p>
        </div>
      </div>

      {target && (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {/* Environment badge */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-muted-foreground">
            <Server className="h-3 w-3" />
            {target.environment}
          </span>

          {/* Scan count */}
          {target.scan_count !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-muted-foreground">
              <Globe className="h-3 w-3" />
              {target.scan_count} scan{target.scan_count !== 1 ? "s" : ""}
            </span>
          )}

          {/* Last scan */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border border-border text-muted-foreground">
            <Clock className="h-3 w-3" />
            {target.lastScan}
          </span>

          {/* Health */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
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
      )}
    </div>
  );
}

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <Suspense
        fallback={
          <div className="flex items-center gap-4 border-b border-border pb-6">
            <Link
              href="/dashboard"
              className="h-9 w-9 shrink-0 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="h-7 w-48 bg-muted/60 rounded animate-pulse mb-1" />
              <div className="h-4 w-72 bg-muted/40 rounded animate-pulse" />
            </div>
          </div>
        }
      >
        <TargetHeader id={id} />
      </Suspense>

      {/* UrlAnalyzer reads ?url= from searchParams automatically via useSearchParams */}
      <div className="pt-2">
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
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
