import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Target } from "@/lib/api";

export function formatCompactNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString();
}

export function formatPct(ratio: number | null | undefined): string {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatPosition(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return "—";
  return p.toFixed(1);
}

export type GscAggregate = {
  hasData: boolean;
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number | null;
  ctr: number | null;
  byProject: { name: string; id: string; clicks: number }[];
  dateLabel: string | null;
};

/** Roll up Search Console metrics across projects (for dashboard overview). */
export function aggregateGscFromTargets(targets: Target[]): GscAggregate {
  let totalClicks = 0;
  let totalImpr = 0;
  let posWeight = 0;
  const byProject: { name: string; id: string; clicks: number }[] = [];
  let dateLabel: string | null = null;

  for (const t of targets) {
    const sum = t.gsc_analytics?.summary;
    if (!sum) continue;
    const hasNumeric =
      sum.clicks != null ||
      sum.impressions != null ||
      sum.ctr != null ||
      sum.position != null;
    if (!hasNumeric) continue;
    const c = Number(sum.clicks ?? 0);
    const i = Number(sum.impressions ?? 0);
    totalClicks += c;
    totalImpr += i;
    if (sum.position != null && i > 0) {
      posWeight += sum.position * i;
    }
    byProject.push({ name: t.name, id: t.id, clicks: c });
    const ga = t.gsc_analytics;
    if (ga && !dateLabel && ga.start_date && ga.end_date) {
      dateLabel = `${ga.start_date} → ${ga.end_date}`;
    }
  }

  byProject.sort((a, b) => b.clicks - a.clicks);
  const avgPos = totalImpr > 0 ? posWeight / totalImpr : null;
  const ctr = totalImpr > 0 ? totalClicks / totalImpr : null;
  const hasData = byProject.length > 0;

  return {
    hasData,
    totalClicks,
    totalImpressions: totalImpr,
    avgPosition: avgPos,
    ctr,
    byProject: byProject.slice(0, 8),
    dateLabel,
  };
}

/** Compact metrics for a project card on the projects list. */
export function GscProjectCardSnippet({ target }: { target: Target }) {
  const err = target.gsc_sync_error?.trim();
  if (err) {
    return (
      <p className="text-[10px] text-amber-400/90 leading-snug line-clamp-2">
        {err}
      </p>
    );
  }

  const sum = target.gsc_analytics?.summary;
  const range =
    target.gsc_analytics?.start_date && target.gsc_analytics?.end_date
      ? `${target.gsc_analytics.start_date} → ${target.gsc_analytics.end_date}`
      : null;

  const hasNumeric =
    sum &&
    (sum.clicks != null ||
      sum.impressions != null ||
      sum.ctr != null ||
      sum.position != null);

  if (!hasNumeric) {
    return null;
  }

  return (
    <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-emerald-400/70 mb-1.5">
        Search {range ? `· ${range}` : ""}
      </p>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] tabular-nums">
        <div>
          <span className="text-white/35">Clicks </span>
          <span className="text-white/90 font-semibold">
            {formatCompactNumber(sum.clicks)}
          </span>
        </div>
        <div>
          <span className="text-white/35">Impr. </span>
          <span className="text-white/90 font-semibold">
            {formatCompactNumber(sum.impressions)}
          </span>
        </div>
        <div>
          <span className="text-white/35">CTR </span>
          <span className="text-white/90 font-semibold">
            {formatPct(sum.ctr)}
          </span>
        </div>
        <div>
          <span className="text-white/35">Pos. </span>
          <span className="text-white/90 font-semibold">
            {formatPosition(sum.position)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Full-width Search section for the project workspace page. */
export function GscProjectWorkspaceSection({ target }: { target: Target }) {
  const err = target.gsc_sync_error?.trim();
  const sum = target.gsc_analytics?.summary;
  const queries = target.gsc_analytics?.top_queries ?? [];
  const range =
    target.gsc_analytics?.start_date && target.gsc_analytics?.end_date
      ? `${target.gsc_analytics.start_date} → ${target.gsc_analytics.end_date}`
      : null;

  if (err) {
    return (
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Search performance
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Google Search Console could not sync metrics for this project.
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
          {err}
        </div>
      </section>
    );
  }

  const hasNumeric =
    sum &&
    (sum.clicks != null ||
      sum.impressions != null ||
      sum.ctr != null ||
      sum.position != null);

  if (!target.gsc_analytics || !hasNumeric) {
    return (
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Search performance
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            Connect Search Console under Projects and use a URL that matches a
            verified property to see clicks, impressions, and queries.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center text-sm text-white/35">
          No Search Console data for this project yet.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Search performance
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {range
              ? `${range} · Google Search Console`
              : "Google Search Console"}
            {target.gsc_property_url ? (
              <span className="block font-mono text-[10px] text-white/25 mt-1 truncate max-w-xl">
                {target.gsc_property_url}
              </span>
            ) : null}
          </p>
        </div>
        <Link
          href="/dashboard/projects"
          className="text-xs text-white/35 hover:text-white/70 transition-colors shrink-0"
        >
          Manage connection
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["Clicks", formatCompactNumber(sum.clicks)],
            ["Impressions", formatCompactNumber(sum.impressions)],
            ["CTR", formatPct(sum.ctr)],
            ["Avg position", formatPosition(sum.position)],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
              {label}
            </p>
            <p className="text-lg font-bold text-white tabular-nums mt-1">
              {value}
            </p>
          </div>
        ))}
      </div>

      {queries.length > 0 ? (
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="text-xs font-semibold text-white">Top queries</p>
            <p className="text-[10px] text-white/30 mt-0.5">
              By clicks in this period
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent bg-white/[0.02]">
                <TableHead className="text-white/45 text-xs">Query</TableHead>
                <TableHead className="text-white/45 text-xs text-right w-20">
                  Clicks
                </TableHead>
                <TableHead className="text-white/45 text-xs text-right w-24">
                  Impr.
                </TableHead>
                <TableHead className="text-white/45 text-xs text-right w-16">
                  CTR
                </TableHead>
                <TableHead className="text-white/45 text-xs text-right w-16">
                  Pos.
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queries.slice(0, 12).map((row, idx) => (
                <TableRow
                  key={`${row.query}-${idx}`}
                  className="border-white/10 hover:bg-white/[0.03]"
                >
                  <TableCell className="text-white/80 text-xs max-w-[280px]">
                    <span className="truncate block">{row.query || "—"}</span>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-white/70">
                    {formatCompactNumber(row.clicks)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-white/70">
                    {formatCompactNumber(row.impressions)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-white/70">
                    {formatPct(row.ctr)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-white/70">
                    {formatPosition(row.position)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </section>
  );
}
