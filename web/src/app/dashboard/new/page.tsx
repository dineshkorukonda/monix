"use client";

import { ArrowLeft, Loader2, Target } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createTarget } from "@/lib/api";

export default function NewTargetPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [environment, setEnvironment] = useState("Production");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setIsLoading(true);
    setError("");

    try {
      const target = await createTarget(url.trim(), environment);
      router.push(
        `/dashboard/project/${target.id}?url=${encodeURIComponent(target.url)}`,
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create target. Is the Django backend running?",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pt-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Targets
      </Link>

      <div className="space-y-3 mb-8">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-5 shadow-sm">
          <Target className="h-6 w-6" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Deploy Security Tracker
        </h1>
        <p className="text-muted-foreground text-sm">
          Target a live endpoint or production domain to initialize the Monix
          security engine.
        </p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2.5">
            <label
              htmlFor="url"
              className="text-sm font-semibold text-foreground tracking-tight"
            >
              Target URL
            </label>
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. https://api.example.com"
              className="flex h-12 w-full rounded-md border border-input bg-background/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            />
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="environment"
              className="text-sm font-semibold text-foreground tracking-tight"
            >
              Environment
            </label>
            <select
              id="environment"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="flex h-12 w-full rounded-md border border-input bg-background/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
            >
              <option>Production</option>
              <option>Staging</option>
              <option>Development</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3">
              {error}
            </p>
          )}

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-border mt-8">
            <Button
              variant="ghost"
              asChild
              className="hover:bg-muted font-medium"
            >
              <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button
              type="submit"
              disabled={!url.trim() || isLoading}
              className="font-semibold px-6 bg-foreground text-background gap-2"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Initializing..." : "Initialize Analysis"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
