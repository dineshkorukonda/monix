"use client";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const nav = [
  { id: "overview", title: "Overview" },
  { id: "public-scanning", title: "Public Inspection Engine" },
  { id: "inspection-pipeline", title: "Inspection Pipeline" },
  { id: "rate-limiting", title: "Rate Limiting" },
  { id: "reports-persistence", title: "Reports & Persistence" },
  { id: "uptime-monitoring", title: "Uptime Monitoring" },
  { id: "status-pages", title: "Public Status Pages" },
  { id: "certificate-tracking", title: "Certificate Tracking" },
  { id: "webhooks", title: "Webhook Alerting" },
  { id: "subdomain-enumeration", title: "Subdomain Enumeration" },
  { id: "database-setup", title: "Database Setup" },
  { id: "local-dev", title: "Local Development" },
] as const;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
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
            </div>
          </aside>

          {/* Documentation Content */}
          <article className="lg:col-span-9 space-y-16">
            <header className="border-b border-border pb-10 space-y-4">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Monix Technical Reference
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground">
                Architecture & Documentation
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                Monix is an open website diagnostic platform built with Next.js
                16, TypeScript, and Bun. It combines a public inspection engine,
                uptime monitoring, status pages, TLS certificate tracking,
                webhook alerting, and native subdomain enumeration.
              </p>
            </header>

            {/* Overview */}
            <section id="overview" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Overview
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Monix works as a direct inspection and monitoring utility. Scan
                any public URL instantly — no login wall, no account required.
                For registered targets stored in Postgres, Monix runs scheduled
                uptime checks, tracks TLS certificate expiry, discovers
                subdomains (authenticated routes), and sends webhook alerts when
                configured on a target.
              </p>
            </section>

            {/* Public Inspection Engine */}
            <section id="public-scanning" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Public Inspection Engine
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
                parameter:
              </p>
              <div className="border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto">
                <pre>{`curl -X POST https://monix.dineshkorukonda.online/api/scan \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://example.com"}'`}</pre>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Upon completion, the engine returns a JSON payload containing
                the diagnostic scores and a 12-character URL-safe nanoid slug
                for permanent public viewing at{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  /r/[slug]
                </code>
                .
              </p>
            </section>

            {/* Inspection Pipeline */}
            <section
              id="inspection-pipeline"
              className="scroll-mt-28 space-y-4"
            >
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Inspection Pipeline
              </h2>
              <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
                <li>
                  <strong className="text-foreground">Security Lens</strong>:
                  TLS certificate validity, expiration date, issuer
                  verification, and security headers (
                  <code className="font-mono bg-secondary px-1 py-0.5 border border-border">
                    HSTS
                  </code>
                  ,{" "}
                  <code className="font-mono bg-secondary px-1 py-0.5 border border-border">
                    CSP
                  </code>
                  ,{" "}
                  <code className="font-mono bg-secondary px-1 py-0.5 border border-border">
                    X-Frame-Options
                  </code>
                  ,{" "}
                  <code className="font-mono bg-secondary px-1 py-0.5 border border-border">
                    X-Content-Type-Options
                  </code>
                  ,{" "}
                  <code className="font-mono bg-secondary px-1 py-0.5 border border-border">
                    Referrer-Policy
                  </code>
                  ).
                </li>
                <li>
                  <strong className="text-foreground">SEO Lens</strong>: Title
                  tag length and presence, meta descriptions, Open Graph preview
                  tags, robots.txt accessibility, XML sitemap discovery, and
                  heading hierarchy.
                </li>
                <li>
                  <strong className="text-foreground">Performance Lens</strong>:
                  Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS),
                  Total Blocking Time, and Google PageSpeed Insights lab
                  metrics.
                </li>
              </ul>
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
                response with a{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  Retry-After
                </code>{" "}
                header in seconds.
              </p>
            </section>

            {/* Reports & Persistence */}
            <section
              id="reports-persistence"
              className="scroll-mt-28 space-y-4"
            >
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Reports &amp; Persistence
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                All scans are stored in PostgreSQL table{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  public.monix_scans
                </code>{" "}
                and retrieved via{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  GET /api/r/[slug]
                </code>
                . Reports remain permanently accessible through their dedicated
                slug URL.
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
                  # Start development server
                </p>
                <p className="text-foreground">bun run dev</p>
                <p className="text-muted-foreground"># Run test suite</p>
                <p className="text-foreground">bun test</p>
                <p className="text-muted-foreground"># Run linter</p>
                <p className="text-foreground">bun run lint</p>
              </div>
            </section>

            {/* Uptime Monitoring */}
            <section id="uptime-monitoring" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Uptime Monitoring
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Registered targets are pinged via{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  POST /api/cron/uptime
                </code>
                . Production uses the GitHub Actions workflow{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  .github/workflows/uptime-cron.yml
                </code>{" "}
                on schedule{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  */5 * * * *
                </code>{" "}
                (every 5 minutes). Set the repo variable{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  MONIX_SITE_URL
                </code>{" "}
                to your deployed origin.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
                <li>
                  <strong className="text-foreground">
                    2 consecutive failure threshold
                  </strong>
                  : A single failed check does not trigger an incident. Two
                  back-to-back failures open a new incident record.
                </li>
                <li>
                  <strong className="text-foreground">Auto-resolution</strong>:
                  When a target returns healthy, the active incident is
                  automatically closed with a duration timestamp.
                </li>
                <li>
                  Data is stored in{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    public.uptime_checks
                  </code>{" "}
                  and{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    public.incidents
                  </code>{" "}
                  — apply migration{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    003_uptime_and_incidents.sql
                  </code>
                  .
                </li>
              </ul>
            </section>

            {/* Public Status Pages */}
            <section id="status-pages" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Public Status Pages
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Each target can have a public status page at{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  /status/[slug]
                </code>
                . Enable it by sending a{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  PATCH
                </code>{" "}
                request:
              </p>
              <div className="border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto">
                <pre>{`PATCH /api/targets/<target-id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "public_status_page": true,
  "status_slug": "my-api"
}`}</pre>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The status page is publicly accessible — no login required.
                Setting{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  public_status_page: false
                </code>{" "}
                returns a 404 to all visitors. Requires migration{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  004_status_page_toggle.sql
                </code>
                .
              </p>
            </section>

            {/* Certificate Tracking */}
            <section
              id="certificate-tracking"
              className="scroll-mt-28 space-y-4"
            >
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Certificate Tracking
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                A nightly cron at{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  POST /api/cron/certificates
                </code>{" "}
                (schedule:{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  0 2 * * *
                </code>
                ) inspects TLS certificates for all HTTPS targets. It records
                the expiry date, issuer name, and fires a webhook alert when
                within the warning window.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
                <li>
                  Default warning threshold:{" "}
                  <strong className="text-foreground">14 days</strong> before
                  expiry. Configurable per target via{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    cert_warning_days
                  </code>
                  .
                </li>
                <li>
                  Requires migration{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    005_certificate_expiry.sql
                  </code>
                  .
                </li>
              </ul>
            </section>

            {/* Webhook Alerting */}
            <section id="webhooks" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Webhook Alerting
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Set a webhook URL on any target and Monix will POST a JSON
                payload when critical events occur. Configure via{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  PATCH /api/targets/&lt;id&gt;
                </code>{" "}
                with{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  {`{ "webhook_url": "https://..." }`}
                </code>
                .
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
                <li>
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    incident.started
                  </code>{" "}
                  — fired when 2 consecutive checks fail.
                </li>
                <li>
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    incident.resolved
                  </code>{" "}
                  — fired when a downed target returns healthy.
                </li>
                <li>
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    certificate.expiry_warning
                  </code>{" "}
                  — fired when cert enters the expiry warning window.
                </li>
                <li>
                  5-second timeout, automatic 1× retry on non-2xx or connection
                  failure. Full payload reference at{" "}
                  <a
                    href="/docs/webhooks"
                    className="text-[#00ff66] hover:underline font-mono"
                  >
                    /docs/webhooks
                  </a>
                  .
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                Requires migration{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  006_webhook_alerts.sql
                </code>
                .
              </p>
            </section>

            {/* Subdomain Enumeration */}
            <section
              id="subdomain-enumeration"
              className="scroll-mt-28 space-y-4"
            >
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Subdomain Enumeration
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Monix discovers subdomains for any target using a native
                TypeScript pipeline — no external binaries required.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-outside ml-5">
                <li>
                  <strong className="text-foreground">
                    Passive CT log lookup
                  </strong>
                  : Queries{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    crt.sh
                  </code>{" "}
                  Certificate Transparency logs to find all registered
                  subdomains.
                </li>
                <li>
                  <strong className="text-foreground">
                    Wildcard DNS detection
                  </strong>
                  : Tests a random non-existent subdomain to detect wildcard
                  DNS, preventing false positives.
                </li>
                <li>
                  <strong className="text-foreground">
                    Active liveness probing
                  </strong>
                  : Resolves IPv4 via{" "}
                  <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                    node:dns
                  </code>{" "}
                  and issues HTTP HEAD requests to determine live status and
                  HTTP status code.
                </li>
              </ul>
              <div className="border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto">
                <pre>{`# Trigger a scan
POST /api/targets/<target-id>/subdomains
Authorization: Bearer <token>

# List stored results
GET /api/targets/<target-id>/subdomains
Authorization: Bearer <token>`}</pre>
              </div>
              <p className="text-sm text-muted-foreground">
                Results are displayed on the public report page at{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  /r/[slug]
                </code>{" "}
                with live/DNS badges, IP addresses, and HTTP status codes.
                Requires migration{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  007_subdomains.sql
                </code>
                .
              </p>
            </section>

            {/* Database Setup */}
            <section id="database-setup" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Database Setup
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Monix uses PostgreSQL for all persistence. Run the following
                migrations in order via your Supabase SQL Editor or{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  psql
                </code>
                :
              </p>
              <div className="border border-border bg-card p-4 font-mono text-xs text-foreground overflow-x-auto">
                <pre>{`psql $DATABASE_URL -f web/sql/init.sql
psql $DATABASE_URL -f web/sql/003_uptime_and_incidents.sql
psql $DATABASE_URL -f web/sql/004_status_page_toggle.sql
psql $DATABASE_URL -f web/sql/005_certificate_expiry.sql
psql $DATABASE_URL -f web/sql/006_webhook_alerts.sql
psql $DATABASE_URL -f web/sql/007_subdomains.sql`}</pre>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                All migrations use{" "}
                <code className="font-mono bg-secondary px-1.5 py-0.5 border border-border text-foreground">
                  IF NOT EXISTS
                </code>{" "}
                guards — safe to re-run.
              </p>
            </section>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
