"use client";

import {
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { GscProjectCardSnippet } from "@/components/gsc-metrics";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createTarget,
  deleteTarget,
  getGscConnectAuthorizationUrl,
  getGscStatus,
  getTargets,
  type Target,
} from "@/lib/api";

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null)
    return <span className="text-xs text-white/30 font-mono">—</span>;
  const cls =
    score >= 80
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : score >= 50
        ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
        : "text-rose-400 bg-rose-500/10 border-rose-500/20";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}
    >
      <Shield className="h-2.5 w-2.5" />
      {score}
    </span>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [gscConnected, setGscConnected] = useState<boolean | null>(null);
  const [gscConnecting, setGscConnecting] = useState(false);
  const [gscBanner, setGscBanner] = useState("");

  const reload = useCallback(async () => {
    const t = await getTargets();
    setProjects(t);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        await reload();
      } catch (e) {
        if (
          !(e instanceof ApiError && (e.status === 401 || e.status === 403))
        ) {
          console.error("Projects load error:", e);
        }
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [reload]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("gsc") === "connected") {
      setGscBanner(
        "Google Search Console connected. New projects will sync search metrics when the domain matches a verified property.",
      );
      window.history.replaceState({}, "", "/dashboard/projects");
    } else if (p.get("gsc") === "error") {
      const reason = p.get("reason") || "unknown";
      setGscBanner(
        `Search Console connection did not complete (${reason}). Try again or check Google Cloud OAuth settings.`,
      );
      window.history.replaceState({}, "", "/dashboard/projects");
    }
  }, []);

  useEffect(() => {
    const loadGsc = async () => {
      try {
        const s = await getGscStatus();
        setGscConnected(s.connected);
      } catch {
        setGscConnected(null);
      }
    };
    loadGsc();
  }, []);

  const handleConnectGsc = async () => {
    setGscConnecting(true);
    try {
      const { authorization_url } = await getGscConnectAuthorizationUrl();
      window.location.href = authorization_url;
    } catch (e) {
      console.error("GSC connect failed:", e);
      setGscBanner(
        e instanceof ApiError
          ? e.message
          : "Could not start Google Search Console. Is the Django backend running?",
      );
      setGscConnecting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteTarget(id);
      await reload();
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAddAndScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      const target = await createTarget(url.trim());
      router.push(`/dashboard/project/${target.id}?autoscan=1`);
    } catch (err: unknown) {
      setAddError(
        err instanceof Error
          ? err.message
          : "Could not add project. Is the backend running?",
      );
      setAdding(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      {/* Hero scan input */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 sm:p-10">
        <div className="max-w-2xl mx-auto text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white/10 border border-white/10 mb-2">
            <Search className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Add a project
          </h2>
          <p className="text-sm text-white/50">
            Enter any URL — we&apos;ll create the project and kick off a full
            security scan immediately.
          </p>
        </div>

        <form
          onSubmit={handleAddAndScan}
          className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto"
        >
          <div className="flex-1 space-y-1.5">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={adding}
              className="flex h-12 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-2 text-sm text-white placeholder:text-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50"
            />
            {addError && (
              <p className="text-xs text-rose-400 text-center">{addError}</p>
            )}
          </div>
          <Button
            type="submit"
            disabled={!url.trim() || adding}
            className="bg-white text-black hover:bg-white/90 font-semibold h-12 px-8 shrink-0 rounded-xl"
          >
            {adding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Starting…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Add &amp; Scan
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Google Search Console
                </p>
                <p className="text-xs text-white/45 mt-0.5 leading-relaxed">
                  Connect once to pull clicks, impressions, CTR, and queries for
                  project domains that match your verified properties.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={gscConnecting || gscConnected === true}
              onClick={handleConnectGsc}
              className="border-white/15 hover:bg-white/5 text-white shrink-0 rounded-xl"
            >
              {gscConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Redirecting…
                </>
              ) : gscConnected ? (
                "Connected"
              ) : (
                "Connect Google Search Console"
              )}
            </Button>
          </div>
          {gscBanner && (
            <p className="text-xs text-white/55 mt-4 text-center">
              {gscBanner}
            </p>
          )}
        </div>
      </div>

      {/* Projects list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">
              Your projects
            </h3>
            <p className="text-xs text-white/40 mt-0.5">
              {loading
                ? "Loading…"
                : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5 text-white/60 hover:text-white"
          >
            <Link href="/dashboard/scans">Scan history</Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 rounded-xl bg-white/[0.03] border border-white/10 animate-pulse"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center">
            <Globe className="h-8 w-8 mx-auto text-white/20 mb-3" />
            <p className="text-sm text-white/40">No projects yet.</p>
            <p className="text-xs text-white/25 mt-1">
              Add a URL above to create your first project.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <div
                key={p.id}
                className="group relative rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-white/20 transition-all p-5 flex flex-col gap-3"
              >
                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(p.id, p.name)}
                  disabled={deletingId === p.id}
                  className="absolute top-3 right-3 h-6 w-6 rounded-md flex items-center justify-center text-white/20 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                  aria-label={`Delete ${p.name}`}
                >
                  {deletingId === p.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>

                <div className="flex items-start justify-between gap-2 pr-6">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-white/35 font-mono truncate mt-0.5">
                      {p.url}
                    </p>
                  </div>
                  <ScoreBadge score={p.score} />
                </div>

                <GscProjectCardSnippet target={p} />

                <div className="flex items-center gap-1.5 text-[11px] text-white/30">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {p.lastScan ?? "No scans yet"}
                  </span>
                </div>

                <div className="flex gap-2 mt-auto pt-1">
                  <Link
                    href={`/dashboard/project/${p.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-xs font-medium text-white/70 hover:text-white py-1.5 transition-all"
                  >
                    Open workspace
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Link
                    href={`/dashboard/project/${p.id}?autoscan=1`}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-white text-black hover:bg-white/90 text-xs font-semibold px-3 py-1.5 transition-all"
                  >
                    Scan
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
