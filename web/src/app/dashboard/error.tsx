"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-medium text-zinc-100">Something went wrong</p>
      <p className="max-w-sm text-xs text-zinc-500">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-100 hover:bg-zinc-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
