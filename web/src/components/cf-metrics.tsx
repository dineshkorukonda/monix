import { formatCompactNumber } from "@/components/gsc-metrics";
import type { CfTargetEdge } from "@/lib/cf-workspace";

export function formatCfBytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)} TB`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${Math.round(n)} B`;
}

/** Compact edge snippet for the sites table (matches GSC snippet style). */
export function CfEdgeProjectCardSnippet({
  edge,
}: {
  edge: CfTargetEdge | null | undefined;
}) {
  if (!edge?.analytics) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  const a = edge.analytics.totals;
  const days = edge.analytics.period_days;
  const cachePct =
    a.requests > 0
      ? Math.round((a.cached_requests / a.requests) * 1000) / 10
      : null;
  return (
    <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-400/70 mb-1.5">
        Edge · last {days}d
      </p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] tabular-nums">
        <div>
          <p className="text-muted-foreground">Requests</p>
          <p className="text-foreground/90 font-medium">
            {formatCompactNumber(a.requests)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Threats</p>
          <p className="text-foreground/90 font-medium">
            {formatCompactNumber(a.threats)}
          </p>
        </div>
        {cachePct != null && (
          <div className="col-span-2">
            <p className="text-muted-foreground">Cache hit</p>
            <p className="text-foreground/90 font-medium">{cachePct}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
