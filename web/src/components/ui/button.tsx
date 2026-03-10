"use client";

import type * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "ghost" | "outline";
type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-white text-black hover:bg-white/85 border border-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
  secondary:
    "bg-white/[0.08] text-white hover:bg-white/[0.14] border border-white/10",
  ghost: "bg-transparent text-white hover:bg-white/[0.06]",
  outline:
    "bg-transparent text-white border border-white/12 hover:bg-white/[0.06]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-11 px-5 py-2.5 text-sm",
  sm: "h-9 px-4 text-xs",
  lg: "h-12 px-6 text-sm",
};

export function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
