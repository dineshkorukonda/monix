"use client";

import { AlertTriangle, Filter, Info, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "@/components/dashboard/section-header";
import { getTargets, type Target } from "@/lib/api";

type Severity = "critical" | "warning" | "info";

interface Issue {
  id: string;
  severity: Severity;
  title: string;
  site: string;
  page: string;
  recommendation: string;
  category: string;
  date: string;
}

const mockIssues: Issue[] = [
  {
    id: "mock-1",
    severity: "critical",
    title: "Missing Content Security Policy (CSP)",
    site: "api.example.com",
    page: "(Global)",
    recommendation: "Implement a strict CSP header to prevent XSS attacks.",
    category: "Security",
    date: new Date().toISOString(),
  },
  {
    id: "mock-2",
    severity: "warning",
    title: "Obsolete TLS Version Supported",
    site: "legacy.example.com",
    page: "(Global)",
    recommendation: "Disable TLS 1.0 and 1.1. Enforce TLS 1.2 or higher.",
    category: "Configuration",
    date: new Date().toISOString(),
  },
  {
    id: "mock-3",
    severity: "info",
    title: "No Security.txt Found",
    site: "example.com",
    page: "/.well-known/security.txt",
    recommendation: "Add a security.txt file to help researchers report vulnerabilities.",
    category: "Compliance",
    date: new Date().toISOString(),
  },
];

function severityTone(sev: Severity) {
  if (sev === "critical") return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  if (sev === "warning") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-blue-500/10 text-blue-500 border-blue-500/20";
}

export default function IssuesPage() {
  const [projects, setProjects] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    getTargets()
      .then(setProjects)
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  const issues = useMemo(() => {
    const list: Issue[] = [...mockIssues];
    for (const p of projects) {
      if (p.score == null) continue;
      if (p.score < 50) {
        list.push({
          id: `crit-${p.id}`,
          severity: "critical",
          title: `Critical Health Score (${p.score}/100)`,
          site: p.name,
          page: p.url,
          recommendation: "Review the full scan report and mitigate high-risk findings immediately.",
          category: "General",
          date: p.lastScan || new Date().toISOString(),
        });
      } else if (p.score < 80) {
        list.push({
          id: `warn-${p.id}`,
          severity: "warning",
          title: `Suboptimal Health Score (${p.score}/100)`,
          site: p.name,
          page: p.url,
          recommendation: "Address missing security headers and warnings to improve score.",
          category: "General",
          date: p.lastScan || new Date().toISOString(),
        });
      }
    }
    return list.sort((a, b) => {
      const w = { critical: 3, warning: 2, info: 1 };
      return w[b.severity] - w[a.severity];
    });
  }, [projects]);

  const filtered = issues.filter((i) => {
    if (severityFilter !== "all" && i.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && i.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    const q = search.toLowerCase();
    if (q && !i.title.toLowerCase().includes(q) && !i.site.toLowerCase().includes(q)) return false;
    return true;
  });

  const categories = Array.from(new Set(issues.map((i) => i.category)));

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse pb-10">
        <div className="h-8 w-40 bg-muted/40 rounded-md" />
        <div className="h-10 w-full bg-muted/30 rounded-lg" />
        <div className="h-64 rounded-xl bg-muted/30 border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <SectionHeader
        title="Detected Issues"
        description="Review and resolve vulnerabilities across all monitored sites."
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-2 rounded-xl border border-border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues or sites…"
            className="pl-9 h-10 w-full rounded-md bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 border-0"
          />
        </div>
        <div className="hidden sm:block h-6 w-px bg-border shrink-0" />
        <div className="flex items-center gap-3 w-full sm:w-auto px-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 bg-transparent text-sm text-foreground border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 bg-transparent text-sm text-foreground border border-border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground">Severity</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground w-1/4">Issue Title</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground">Site</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground">Affected Page</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground w-1/3">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <Filter className="h-6 w-6 opacity-40" />
                      <p>No issues found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((issue) => (
                  <tr key={issue.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-4 align-top">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${severityTone(
                          issue.severity
                        )}`}
                      >
                        {issue.severity === "info" ? <Info className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                        {issue.severity}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="font-medium text-foreground">{issue.title}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1.5">{issue.category}</p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="font-medium text-foreground">{issue.site}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <span className="font-mono text-xs text-muted-foreground break-all">{issue.page}</span>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-muted-foreground leading-relaxed text-[13px]">{issue.recommendation}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
