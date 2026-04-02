"use client";

// SectionHeader — consistent page and section titles.
// Single Responsibility: layout title + optional description + optional action slot.

import type { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Smaller variant used inside cards */
  size?: "lg" | "sm";
}

export function SectionHeader({
  title,
  description,
  action,
  size = "lg",
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        {size === "lg" ? (
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        ) : (
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        )}
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
