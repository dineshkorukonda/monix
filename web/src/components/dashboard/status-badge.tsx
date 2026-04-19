"use client";

// StatusBadge — severity and status indicator pills.
// Single Responsibility: renders a coloured label pill.

import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

export type Severity = "critical" | "warning" | "info" | "success";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; icon: ReactNode; classes: string }
> = {
  critical: {
    label: "Critical",
    icon: <XCircle className="h-3 w-3" />,
    classes:
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  warning: {
    label: "Warning",
    icon: <AlertTriangle className="h-3 w-3" />,
    classes:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  info: {
    label: "Info",
    icon: <Info className="h-3 w-3" />,
    classes:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  success: {
    label: "Healthy",
    icon: <CheckCircle2 className="h-3 w-3" />,
    classes:
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

interface StatusBadgeProps {
  severity: Severity;
  /** Override the default label */
  label?: string;
  /** Hide the leading icon */
  noIcon?: boolean;
}

export function StatusBadge({
  severity,
  label,
  noIcon = false,
}: StatusBadgeProps) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.classes}`}
    >
      {!noIcon && cfg.icon}
      {label ?? cfg.label}
    </span>
  );
}

/** Derives severity from a numeric score */
export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border border-border text-muted-foreground">
        <ShieldAlert className="h-3 w-3" />
        No scan
      </span>
    );
  }
  const severity: Severity =
    score >= 80 ? "success" : score >= 50 ? "warning" : "critical";
  return <StatusBadge severity={severity} label={String(score)} />;
}
