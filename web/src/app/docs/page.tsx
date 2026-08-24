"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const nav = [
  { id: "overview", title: "Overview" },
  { id: "public-scanning", title: "Public Scanning & Reports" },
  { id: "using-the-product", title: "Authenticated Dashboard" },
  { id: "google-search-console", title: "Google Search Console" },
  { id: "cloudflare", title: "Cloudflare" },
  { id: "architecture", title: "Architecture" },
  { id: "reports-storage", title: "Reports & Persistence" },
  { id: "rate-limiting", title: "Rate Limiting" },
  { id: "scan-engine", title: "Scan Engine" },
  { id: "backend-api", title: "API & Data Model" },
  { id: "local-dev", title: "Local Development" },
] as const;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#E8E6E1] selection:text-foreground">
      <Navigation />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pt-28 pb-24">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <div className="sticky top-28 border-l border-border pl-5 space-y-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Documentation
                </p>
                <nav
                  className="mt-4 space-y-2"
                  aria-label="Documentation Table of Contents"
                >
                  {nav.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {item.title}
                    </a>
                  ))}
                </nav>
              </div>

              <div className="border-t border-border pt-4">
                <Link
                  href="/login"
                  className="text-xs font-mono text-accent hover:opacity-80 transition-opacity"
                >
                  Sign in to Monix →
                </Link>
              </div>
            </div>
          </aside>

          {/* Documentation Content */}
          <article className="lg:col-span-9 space-y-16">
            <header className="border-b border-border pb-10 space-y-4">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Monix Platform Architecture
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground">
                How everything fits together
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                Monix is a Next.js 16 application running on Bun. It combines
                instant, unauthenticated public security, SEO, and performance
                scanning with an authenticated domain portfolio monitor.
              </p>
            </header>

            {/* Overview */}
            <section id="overview" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Overview
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Monix operates on a dual-surface model:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="border border-border bg-card p-6">
                  <h3 className="font-serif text-lg font-medium text-foreground">
                    Public Scanner
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Zero-auth website intelligence. Anyone can enter a URL on
                    the landing page, run an analysis, and receive a permanent
                    shareable report at{" "}
                    <code className="font-mono bg-secondary px-1 py-0.5 border border-border">
                      /r/[slug]
                    </code>
                    .
                  </p>
                </div>
                <div className="border border-border bg-card p-6">
                  <h3 className="font-serif text-lg font-medium text-foreground">
                    Authenticated Dashboard
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Monitored sites portfolio. Registered users save target
                    domains, run recurring automated scans, view trend charts,
                    and connect Google Search Console and Cloudflare.
                  </p>
                </div>
              </div>
            </section>

            {/* Public Scanning */}
            <section id="public-scanning" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Public Scanning &amp; Reports
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The public scanner endpoint is available at{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  POST /api/scan
                </code>
                . It accepts a JSON body with a{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  url
                </code>{" "}
                string, normalizes the domain, runs the full analysis pipeline,
                and assigns a 12-character URL-safe nanoid slug.
              </p>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Reports are permanently accessible at{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  /r/[slug]
                </code>{" "}
                without authentication. Each report renders flat diagnostic
                panels for Security, SEO, and Performance with expandable check
                lists.
              </p>
            </section>

            {/* Authenticated Dashboard */}
            <section id="using-the-product" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Authenticated Dashboard
              </h2>
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
                <li>
                  <strong className="text-foreground">Authentication</strong>:
                  Email/password or Google Sign-In with local JWTs verified on
                  server route handlers.
                </li>
                <li>
                  <strong className="text-foreground">Sites Management</strong>:
                  Add monitored target domains to track health score trends over
                  time.
                </li>
                <li>
                  <strong className="text-foreground">Scan History</strong>:
                  View past runs, inspect detailed score distributions, and
                  trigger manual re-scans.
                </li>
                <li>
                  <strong className="text-foreground">
                    Settings &amp; Integrations
                  </strong>
                  : Manage account preferences, API credentials, and connect
                  optional third-party integrations.
                </li>
              </ul>
            </section>

            {/* Google Search Console */}
            <section
              id="google-search-console"
              className="scroll-mt-28 space-y-4"
            >
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Google Search Console Integration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Google Search Console integration is managed under{" "}
                <strong className="text-foreground">
                  Dashboard → Settings → Connected Integrations
                </strong>
                . Monix requests read-only search analytics permissions,
                securely stores encrypted refresh tokens in PostgreSQL, and maps
                search queries and CTR directly to your monitored target sites.
              </p>
            </section>

            {/* Cloudflare */}
            <section id="cloudflare" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Cloudflare Integration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Connect Cloudflare via a read-only API token with{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  Zone.Analytics:Read
                </code>{" "}
                permissions. Monix matches monitored domains with your DNS zones
                and pulls edge request volumes, cache hit ratios, and threat
                mitigation logs.
              </p>
            </section>

            {/* Architecture */}
            <section id="architecture" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Architecture Diagram
              </h2>
              <div className="border border-border bg-card p-6 font-mono text-xs text-foreground overflow-x-auto">
                <pre>{`Browser (Next.js 16 UI)
  │
  ├─► Public Flow:
  │     POST /api/scan  ──► Rate Limiter (5 req/hr/IP) ──► Analysis Engine ──► INSERT monix_scans
  │     GET /r/[slug]   ──► GET /api/r/[slug] ──► SELECT monix_scans (Public Report)
  │
  └─► Authenticated Flow:
        Authorization: Bearer <JWT>
        POST /api/targets
        GET /api/scans
        GET /api/gsc/* & /api/cloudflare/*`}</pre>
              </div>
            </section>

            {/* Reports & Persistence */}
            <section id="reports-storage" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Reports &amp; Persistence
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                All scans are recorded in the{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  public.monix_scans
                </code>{" "}
                table:
              </p>
              <div className="border border-border bg-card p-4 overflow-x-auto text-xs font-mono">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border text-foreground">
                      <th className="pb-2">Column</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-muted-foreground">
                    <tr>
                      <td className="py-2 text-foreground">id</td>
                      <td>bigserial</td>
                      <td>Primary Key</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-foreground">public_slug</td>
                      <td>text unique</td>
                      <td>12-char URL nanoid for /r/[slug]</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-foreground">trigger</td>
                      <td>text</td>
                      <td>
                        &apos;anonymous&apos; or &apos;authenticated&apos;
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 text-foreground">target_id</td>
                      <td>uuid nullable</td>
                      <td>Target site ID if run by authenticated user</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-foreground">score</td>
                      <td>smallint</td>
                      <td>Composite evaluation score (0-100)</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-foreground">results</td>
                      <td>jsonb</td>
                      <td>Full security, SEO, and perf payload</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Rate Limiting */}
            <section id="rate-limiting" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Rate Limiting
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Public scanning is protected by a sliding 1-hour window rate
                limiter allowing up to{" "}
                <strong className="text-foreground">
                  5 scans per hour per IP address
                </strong>
                . Requests beyond this threshold receive an{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  HTTP 429 Too Many Requests
                </code>{" "}
                response with a standard{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  Retry-After
                </code>{" "}
                header in seconds.
              </p>
            </section>

            {/* Scan Engine */}
            <section id="scan-engine" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Scan Engine
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                The TypeScript scan pipeline lives under{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  web/src/server/analysis/
                </code>
                . It executes asynchronous checks for TLS certificates, HTTP
                response headers, meta directives, robots.txt, XML sitemaps, DNS
                entries, server geolocation, and Google PageSpeed Insights
                metrics.
              </p>
            </section>

            {/* Local Development */}
            <section id="local-dev" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Local Development
              </h2>
              <div className="border border-border bg-card p-6 font-mono text-xs space-y-3">
                <p className="text-muted-foreground"># Install dependencies</p>
                <p className="text-foreground">bun install</p>
                <p className="text-muted-foreground">
                  # Run development server
                </p>
                <p className="text-foreground">bun run dev</p>
                <p className="text-muted-foreground"># Run tests</p>
                <p className="text-foreground">bun test</p>
                <p className="text-muted-foreground"># Run linter</p>
                <p className="text-foreground">bun run lint</p>
              </div>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
