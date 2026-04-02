"use client";

// ChartCard — wrapper card for all chart sections.
// Open/Closed: accepts any chart as children; extend via header action slot.

import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  /** Optional right-side header element (e.g. time filter) */
  headerAction?: ReactNode;
  children: ReactNode;
  /** Controls the chart area height — default 220 */
  chartHeight?: number;
  noPadding?: boolean;
}

export function ChartCard({
  title,
  subtitle,
  headerAction,
  children,
  chartHeight = 220,
  noPadding = false,
}: ChartCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerAction && <div className="shrink-0">{headerAction}</div>}
      </div>

      {/* Chart body */}
      <div
        className={noPadding ? "" : "px-2 py-4"}
        style={{ height: chartHeight }}
      >
        {children}
      </div>
    </div>
  );
}
