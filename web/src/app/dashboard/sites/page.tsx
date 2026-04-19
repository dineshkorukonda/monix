"use client";

import {
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { CfEdgeProjectCardSnippet } from "@/components/cf-metrics";
import { EmptyState } from "@/components/dashboard/empty-state";
import { SectionHeader } from "@/components/dashboard/section-header";
import { ScoreBadge } from "@/components/dashboard/status-badge";
import { GscProjectCardSnippet } from "@/components/gsc-metrics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTarget, deleteTarget, getTargets, type Target } from "@/lib/api";
import {
  type CfWorkspaceResult,
  loadCloudflareWorkspaceMetrics,
} from "@/lib/cf-workspace";

function AddSiteForm({ onAdded }: { onAdded: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const normalizeSiteInput = (raw: string) => {
    const v = raw.trim();
    // Accept plain domains like "vercel.com"; backend will add https:// when needed.
    return v.replace(/\s+/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeSiteInput(url);
    if (!normalized) return;
    setAdding(true);
    setError("");
    try {
      const target = await createTarget(normalized);
      onAdded();
      router.push(`/dashboard/site/${target.id}?autoscan=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add site.");
      setAdding(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
          <Plus className="h-4 w-4 text-indigo-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Add a new site
          </p>
          <p className="text-xs text-muted-foreground">
            Creates the site and starts a security scan immediately.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com or https://example.com"
          disabled={adding}
          className="flex-1 h-9"
        />
        <Button
          type="submit"
          disabled={!url.trim() || adding}
          className="h-9 bg-foreground text-background hover:bg-foreground/90 border-0 shrink-0"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add & Scan"}
        </Button>
      </form>
      {error && <p className="text-xs text-rose-500 mt-2">{error}</p>}
    </div>
  );
}

function SitesTable({
  sites,
  cfWs,
  onDelete,
  deletingId,
}: {
  sites: Target[];
  cfWs: CfWorkspaceResult | null;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const [search, setSearch] = useState("");
  const filtered = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()),
  );

  if (sites.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="No sites yet"
        description="Add your first site above to start monitoring."
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites…"
            className="pl-8 h-8 w-full rounded-md border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <p className="text-xs text-muted-foreground ml-auto">
          {filtered.length} site{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/20">
            <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground">
              Site
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">
              Scans
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
              Search
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground hidden xl:table-cell">
              Edge
            </th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">
              Score
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {filtered.map((site) => (
            <tr
              key={site.id}
              className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/60 flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">
                    {site.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {site.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">
                      {site.url}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-right hidden md:table-cell">
                <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {site.scan_count ?? 0}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                {site.gsc_analytics?.summary?.clicks != null ? (
                  <GscProjectCardSnippet target={site} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-right hidden xl:table-cell align-top min-w-[140px]">
                {cfWs?.connected ? (
                  <CfEdgeProjectCardSnippet edge={cfWs.byTargetId[site.id]} />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3.5 text-right">
                <ScoreBadge score={site.score} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/dashboard/site/${site.id}`}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(site.id)}
                    disabled={deletingId === site.id}
                    className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-rose-500 hover:border-rose-500/30 transition-colors"
                  >
                    {deletingId === site.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SitesPage() {
  const [sites, setSites] = useState<Target[]>([]);
  const [cfWs, setCfWs] = useState<CfWorkspaceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const tR = await getTargets();
      setSites(tR);
      try {
        setCfWs(await loadCloudflareWorkspaceMetrics(tR));
      } catch {
        setCfWs(null);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this site and all its scan data?")) return;
    setDeletingId(id);
    try {
      await deleteTarget(id);
      setSites((p) => p.filter((s) => s.id !== id));
    } catch {
      /* silent */
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-24 bg-muted/40 rounded-md" />
        <div className="h-24 rounded-xl bg-muted/30 border border-border" />
        <div className="h-64 rounded-xl bg-muted/30 border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <SectionHeader
        title="Sites"
        description="Monitor, scan and manage all your domains."
      />
      <AddSiteForm onAdded={refresh} />
      <SitesTable
        sites={sites}
        cfWs={cfWs}
        onDelete={handleDelete}
        deletingId={deletingId}
      />
    </div>
  );
}
