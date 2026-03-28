"use client";

import { ExternalLink, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, createTarget, getTargets, type Target } from "@/lib/api";

function ScrollToAddFromQuery() {
  const searchParams = useSearchParams();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || searchParams.get("add") !== "1") return;
    done.current = true;
    document
      .getElementById("add-project")
      ?.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState(null, "", "/dashboard/projects");
  }, [searchParams]);
  return null;
}

function scoreClass(score: number) {
  if (score >= 80) return "text-emerald-400 font-semibold tabular-nums";
  if (score >= 50) return "text-amber-400 font-semibold tabular-nums";
  return "text-rose-400 font-semibold tabular-nums";
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

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
    if (window.location.hash === "#add-project") {
      requestAnimationFrame(() => {
        document.getElementById("add-project")?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setAdding(true);
    setAddError("");
    try {
      await createTarget(url.trim());
      setUrl("");
      await reload();
    } catch (err: unknown) {
      setAddError(
        err instanceof Error
          ? err.message
          : "Could not add project. Is the backend running?",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <Suspense fallback={null}>
        <ScrollToAddFromQuery />
      </Suspense>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Projects
          </h2>
          <p className="text-white/50 mt-1 text-sm max-w-xl">
            All monitored URLs in your workspace. Add a new one below or open a
            row for scans and reports.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-white/10 hover:bg-white/5 shrink-0"
        >
          <Link href="/dashboard/scans">Scan history</Link>
        </Button>
      </div>

      <section
        id="add-project"
        className="rounded-xl border border-white/10 bg-white/[0.03] p-5 sm:p-6"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Add a project</h3>
            <p className="text-xs text-white/45 mt-0.5">
              Enter a URL to monitor. It appears in the table as soon as it is
              saved.
            </p>
          </div>
        </div>
        <form
          onSubmit={handleAddProject}
          className="flex flex-col sm:flex-row gap-3 sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="projects-new-url" className="sr-only">
              Project URL
            </label>
            <input
              id="projects-new-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
            />
            {addError && <p className="text-xs text-rose-400">{addError}</p>}
          </div>
          <Button
            type="submit"
            disabled={!url.trim() || adding}
            className="bg-white text-black hover:bg-white/90 font-semibold h-11 px-6 shrink-0"
          >
            {adding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {adding ? "Adding…" : "Add project"}
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="px-1">
          <h3 className="text-sm font-semibold text-white tracking-tight">
            All projects
          </h3>
          <p className="text-xs text-white/40 mt-0.5">
            {loading
              ? "Loading…"
              : `${projects.length} project${projects.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card/30 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-sm text-white/40">
              Loading projects…
            </div>
          ) : projects.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-white/40 text-sm">No projects yet.</p>
              <p className="text-white/25 text-xs mt-2">
                Add a URL above to create your first project.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50 font-medium">
                    Project
                  </TableHead>
                  <TableHead className="text-white/50 font-medium">
                    URL
                  </TableHead>
                  <TableHead className="text-white/50 font-medium text-right w-24">
                    Score
                  </TableHead>
                  <TableHead className="text-white/50 font-medium text-right w-36">
                    Last scan
                  </TableHead>
                  <TableHead className="text-white/50 font-medium text-right w-28">
                    Open
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-white/10 hover:bg-white/[0.04]"
                  >
                    <TableCell className="font-medium text-white max-w-[200px]">
                      <span className="truncate block">{p.name}</span>
                    </TableCell>
                    <TableCell className="text-white/50 text-xs font-mono max-w-[280px]">
                      <span className="truncate block">{p.url}</span>
                    </TableCell>
                    <TableCell
                      className={`text-right ${scoreClass(p.score ?? 0)}`}
                    >
                      {p.score ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-white/45 text-xs whitespace-nowrap">
                      {p.lastScan ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/dashboard/project/${p.id}?url=${encodeURIComponent(p.url)}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white"
                      >
                        Details
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </section>
    </div>
  );
}
