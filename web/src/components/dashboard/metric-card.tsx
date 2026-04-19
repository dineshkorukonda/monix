"use client";

// MetricCard — displays a single KPI with icon, value and optional trend.
// Open/Closed: extend by passing custom icon / accent variant.

import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

type Trend = "up" | "down" | "neutral";

interface MetricCardProps {
  /** Short label above the value */
  label: string;
  /** Primary displayed number / string */
  value: ReactNode;
  /** Small supplementary text */
  sub?: string;
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>;
  /** Colour variant for the icon background */
  variant?: "default" | "indigo" | "emerald" | "amber" | "rose";
  trend?: Trend;
  /** Trend label, e.g. "+12% vs last week" */
  trendLabel?: string;
}

const VARIANT_CLASSES: Record<
  NonNullable<MetricCardProps["variant"]>,
  string
> = {
  default: "bg-muted/60 text-muted-foreground",
  indigo: "bg-indigo-500/10 text-indigo-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  amber: "bg-amber-500/10 text-amber-500",
  rose: "bg-rose-500/10 text-rose-500",
};

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  variant = "default",
  trend,
  trendLabel,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${VARIANT_CLASSES[variant]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums leading-none">
          {value}
        </span>
        {trend && trend !== "neutral" && (
          <div
            className={`flex items-center gap-0.5 text-[11px] font-medium mb-0.5 ${
              trend === "up" ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {trendLabel}
          </div>
        )}
      </div>

      {sub && <p className="text-[11px] text-muted-foreground -mt-2">{sub}</p>}
    </div>
  );
}
