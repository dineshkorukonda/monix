"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Navigation from "@/components/Navigation";

const nav = [
  { id: "overview", title: "Overview" },
  { id: "using-the-product", title: "Using the product" },
  { id: "google-oauth-console", title: "Google OAuth (Console)" },
  { id: "google-search-console", title: "Google Search Console" },
  { id: "cloudflare", title: "Cloudflare" },
  { id: "architecture", title: "Architecture" },
  { id: "reports-storage", title: "Reports & persistence" },
  { id: "scan-engine", title: "Scan engine" },
  { id: "backend-api", title: "Next.js API & data" },
  { id: "nextjs", title: "Next.js web app" },
  { id: "analysis", title: "What gets analyzed" },
  { id: "configuration", title: "Configuration" },
  { id: "local-dev", title: "Local development" },
] as const;

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />

      <main className="relative px-6 pt-28 pb-32 md:pt-32">
        <div className="relative z-10 mx-auto grid max-w-[1600px] gap-16 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <div className="sticky top-28 border-l border-white/15 pl-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
                Contents
              </p>
              <nav className="mt-6 space-y-3" aria-label="Documentation">
                {nav.map((item, i) => (
                  <motion.a
                    key={item.id}
                    href={`#${item.id}`}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.04 }}
                    className="block text-sm font-medium text-white/45 transition-colors hover:text-white"
                  >
                    {item.title}
                  </motion.a>
                ))}
              </nav>
              <div className="mt-10 border-t border-white/10 pt-8">
                <Link
                  href="/login"
                  className="text-sm font-medium text-white underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white/50"
                >
                  Sign in to Monix
                </Link>
              </div>
            </div>
          </aside>

          <motion.article
            className="lg:col-span-9"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <header className="mb-16 border-b border-white/10 pb-12">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
                Monix
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
                How everything fits together
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
                This guide matches the repo: Next.js route handlers run the scan
                pipeline, persist results in Supabase Postgres, verify Supabase
                JWTs for authenticated APIs, and orchestrate Google Search
                Console OAuth and Cloudflare using server-side secrets. The same
                Next.js app is where you sign in and manage sites, scans, and
                integrations.
              </p>
            </header>

            <div className="space-y-20 md:space-y-28">
              <section id="overview" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Overview
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Monix analyzes a public URL and produces category scores
                  (security, SEO, performance) plus an overall score. Each run
                  is stored as a{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    Scan
                  </code>{" "}
                  row (JSON payload, score, expiry) so you can reopen reports
                  and list history. The product surface is the authenticated
                  dashboard: you sign in with Supabase, add monitored sites
                  (targets), run scans, and browse results. Optionally connect
                  Google Search Console for search analytics and Cloudflare for
                  edge HTTP metrics when hostnames match your zones.
                </p>
              </section>

              <section id="using-the-product" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Using the product
                </h2>
                <ul className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-white/60">
                  <li>
                    <strong className="text-white/90">Sign in</strong> — The
                    browser authenticates with{" "}
                    <strong className="text-white/90">Supabase Auth</strong>.
                    The Next.js app sends{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      Authorization: Bearer &lt;JWT&gt;
                    </code>{" "}
                    to{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      /api/*
                    </code>
                    ; the server verifies the JWT (JWKS or HS256 in tests) and
                    syncs profile rows in Postgres. App sign-in is{" "}
                    <strong className="text-white/90">Supabase Auth</strong>{" "}
                    (email/password or Google via Supabase).{" "}
                    <strong className="text-white/90">Search Console</strong>{" "}
                    OAuth is a separate Google consent flow: set{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      GOOGLE_REDIRECT_URI
                    </code>{" "}
                    to your deployed{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      /api/gsc/callback
                    </code>{" "}
                    URL so Google returns the authorization code to Monix.
                  </li>
                  <li>
                    <strong className="text-white/90">Overview</strong> — The
                    dashboard home summarizes activity, average scores, Search
                    Console rollups when connected, and Cloudflare edge totals
                    when a monitored hostname matches a zone on your API token.
                  </li>
                  <li>
                    <strong className="text-white/90">Analytics</strong> —
                    Search Console tables (per-target summaries, top queries,
                    sync) plus Cloudflare edge charts when connected.
                  </li>
                  <li>
                    <strong className="text-white/90">Sites</strong> — Monitored
                    URLs (targets). Add a site, run scans, and link Search
                    Console properties when the URL matches a verified property.
                    Cloudflare metrics appear automatically when the hostname
                    matches a zone on your token—no per-site toggle.
                  </li>
                  <li>
                    <strong className="text-white/90">Integrations</strong> —{" "}
                    <Link
                      href="/dashboard/integrations"
                      className="text-white/80 underline decoration-white/25 underline-offset-2 hover:text-white"
                    >
                      Dashboard → Integrations
                    </Link>{" "}
                    for Google Search Console and Cloudflare connection status.
                  </li>
                  <li>
                    <strong className="text-white/90">Scan history</strong> —
                    Lists completed scans; open a row to view the full report
                    for that run.
                  </li>
                  <li>
                    <strong className="text-white/90">Reports</strong> — Each
                    scan is persisted as a{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      Scan
                    </code>{" "}
                    row (see{" "}
                    <a
                      href="#reports-storage"
                      className="text-white/80 underline decoration-white/25 underline-offset-2 hover:text-white"
                    >
                      Reports &amp; persistence
                    </a>
                    ). JSON is served from{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      GET /api/reports/&lt;uuid&gt;/
                    </code>{" "}
                    (shareable until expiry). The app also surfaces reports
                    under{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      /dashboard/report/&lt;id&gt;
                    </code>
                    .
                  </li>
                  <li>
                    <strong className="text-white/90">
                      Profile &amp; settings
                    </strong>{" "}
                    — Account and preferences from the sidebar.
                  </li>
                </ul>
              </section>

              <section id="google-oauth-console" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Google OAuth (Console setup)
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  If Google shows{" "}
                  <em>does not comply with Google&apos;s OAuth 2.0 policy</em>{" "}
                  or asks you to register the redirect URI, fix it in Google
                  Cloud Console — not in Monix code. Use one{" "}
                  <strong className="text-white/90">OAuth 2.0 Client ID</strong>{" "}
                  with type{" "}
                  <strong className="text-white/90">Web application</strong>.
                </p>
                <ol className="mt-6 max-w-3xl list-decimal space-y-3 pl-5 text-base leading-relaxed text-white/60">
                  <li>
                    Open{" "}
                    <strong className="text-white/90">
                      APIs &amp; Services → Credentials
                    </strong>
                    , select your client (or create one).
                  </li>
                  <li>
                    Under{" "}
                    <strong className="text-white/90">
                      Authorized redirect URIs
                    </strong>
                    , click <strong className="text-white/90">Add URI</strong>{" "}
                    and paste exactly (local Next.js; path must match{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      GOOGLE_REDIRECT_URI
                    </code>
                    ):
                    <code className="mt-2 block font-mono text-[13px] text-emerald-300/90">
                      http://localhost:3000/api/gsc/callback
                    </code>
                    Production: use your real origin, e.g.{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      https://app.example.com/api/gsc/callback
                    </code>
                    .
                  </li>
                  <li>
                    Set{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      GOOGLE_REDIRECT_URI
                    </code>{" "}
                    to that same callback URL so Google&apos;s redirect matches
                    what Monix exchanges for tokens.
                  </li>
                  <li>
                    Under{" "}
                    <strong className="text-white/90">
                      OAuth consent screen
                    </strong>
                    : if publishing status is{" "}
                    <strong className="text-white/90">Testing</strong>, add your
                    Google account under{" "}
                    <strong className="text-white/90">Test users</strong>. Save
                    and wait a minute before retrying.
                  </li>
                </ol>
              </section>

              <section id="google-search-console" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Google Search Console
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Monix can read{" "}
                  <strong className="text-white/90">
                    Search Analytics (read-only)
                  </strong>{" "}
                  and list your verified sites using Google&apos;s OAuth 2.0
                  flow. Refresh tokens are stored encrypted in PostgreSQL; the
                  browser never holds long-lived secrets. This is separate from
                  signing in with Google for Monix itself—GSC uses its own
                  consent screen and scopes (
                  <code className="font-mono text-[13px] text-white/70">
                    webmasters.readonly
                  </code>
                  , plus standard OpenID profile scopes).
                </p>
                <h3 className="mt-10 text-sm font-semibold text-white">
                  What you see in the app
                </h3>
                <ul className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-white/60">
                  <li>
                    <strong className="text-white/90">Overview</strong> — Totals
                    and charts built from cached per-target metrics when at
                    least one target has synced data.
                  </li>
                  <li>
                    <strong className="text-white/90">Analytics</strong> — Full
                    table of targets with property URLs, sync errors, summary
                    numbers, and top queries.
                  </li>
                  <li>
                    <strong className="text-white/90">Matching</strong> — For
                    each target URL, the server picks a Search Console property
                    you have verified (URL-prefix or domain) that matches the
                    target host. If nothing matches, the target records a clear
                    sync message instead of failing the rest of the app.
                  </li>
                </ul>
                <h3 className="mt-10 text-sm font-semibold text-white">
                  When data syncs
                </h3>
                <ul className="mt-4 max-w-3xl space-y-3 text-base leading-relaxed text-white/60">
                  <li>
                    After you connect GSC, creating a new target triggers a sync
                    attempt for that target (server-side).
                  </li>
                  <li>
                    Use{" "}
                    <strong className="text-white/90">
                      Sync Search Console
                    </strong>{" "}
                    on Analytics (or the equivalent API) to re-fetch metrics for
                    every target—useful right after connecting or when you add
                    properties in Google.
                  </li>
                </ul>
                <h3 className="mt-10 text-sm font-semibold text-white">
                  Search Console API routes
                </h3>
                <ul className="mt-4 max-w-3xl space-y-2 font-mono text-[13px] leading-relaxed text-white/55">
                  <li>
                    <code className="text-white/75">GET /api/gsc/connect/</code>{" "}
                    — Returns JSON with a Google authorization URL (signed{" "}
                    <code className="text-white/70">state</code>).
                  </li>
                  <li>
                    <code className="text-white/75">GET /api/gsc/callback</code>{" "}
                    — OAuth redirect handler (must match{" "}
                    <code className="text-white/70">GOOGLE_REDIRECT_URI</code>
                    ). Exchanges the code, stores refresh tokens encrypted at
                    rest, then redirects to{" "}
                    <code className="text-white/70">GSC_OAUTH_SUCCESS_URL</code>{" "}
                    / error URL.
                  </li>
                  <li>
                    <code className="text-white/75">GET /api/gsc/status/</code>{" "}
                    — Whether the current user has stored credentials.
                  </li>
                  <li>
                    <code className="text-white/75">GET /api/gsc/sites/</code> —
                    List verified sites (for debugging or future UI).
                  </li>
                  <li>
                    <code className="text-white/75">
                      POST /api/gsc/analytics/
                    </code>{" "}
                    — On-demand analytics for a given{" "}
                    <code className="text-white/70">site_url</code> (JSON body;
                    optional date range).
                  </li>
                  <li>
                    <code className="text-white/75">
                      POST /api/gsc/sync-targets/
                    </code>{" "}
                    — Re-sync all targets for the user.
                  </li>
                  <li>
                    <code className="text-white/75">
                      POST /api/gsc/disconnect/
                    </code>{" "}
                    — Remove stored Search Console tokens for the current user.
                  </li>
                </ul>
                <p className="mt-6 max-w-3xl text-sm leading-relaxed text-white/50">
                  Register the redirect URI in Google Cloud exactly as{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    GOOGLE_REDIRECT_URI
                  </code>
                  . The default in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    .env.example
                  </code>{" "}
                  is{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    http://localhost:3000/api/gsc/callback
                  </code>
                  . Success and error browser redirects after OAuth use{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    GSC_OAUTH_SUCCESS_URL
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    GSC_OAUTH_ERROR_URL
                  </code>{" "}
                  (defaults point at the Next.js app with query flags).
                </p>
              </section>

              <section id="cloudflare" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Cloudflare
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Users paste a{" "}
                  <a
                    href="https://developers.cloudflare.com/fundamentals/api/get-started/create-token/"
                    className="text-white/80 underline decoration-white/25 underline-offset-2 hover:text-white"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Cloudflare API token
                  </a>{" "}
                  in the app. The Next.js server verifies it, encrypts it with
                  the same Fernet machinery as GSC tokens, and calls Cloudflare
                  API v4 (REST for zones and token verify;{" "}
                  <strong className="text-white/90">GraphQL</strong> for zone
                  HTTP request analytics). No Cloudflare secrets live in the
                  browser.
                </p>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Create a custom token with{" "}
                  <strong className="text-white/90">Zone → Zone → Read</strong>{" "}
                  and{" "}
                  <strong className="text-white/90">
                    Zone → Analytics → Read
                  </strong>{" "}
                  for the zones you need. The dashboard matches each monitored
                  site hostname to a zone on that token and rolls up requests,
                  cached bytes, threats, and country breakdowns on Overview,
                  Sites, Analytics, and Issues.
                </p>
                <h3 className="mt-10 text-sm font-semibold text-white">
                  Cloudflare API routes
                </h3>
                <ul className="mt-4 max-w-3xl space-y-2 font-mono text-[13px] leading-relaxed text-white/55">
                  <li>
                    <code className="text-white/75">
                      GET /api/cloudflare/status/
                    </code>{" "}
                    — Connection status and account summary.
                  </li>
                  <li>
                    <code className="text-white/75">
                      POST /api/cloudflare/connect/
                    </code>{" "}
                    — JSON body{" "}
                    <code className="text-white/70">{`{ "api_token": "…" }`}</code>
                    ; verifies and stores the token.
                  </li>
                  <li>
                    <code className="text-white/75">
                      DELETE /api/cloudflare/disconnect/
                    </code>{" "}
                    — Remove stored credentials.
                  </li>
                  <li>
                    <code className="text-white/75">
                      GET /api/cloudflare/zones/
                    </code>{" "}
                    — List zones visible to the token.
                  </li>
                  <li>
                    <code className="text-white/75">
                      GET /api/cloudflare/analytics/
                    </code>{" "}
                    — Query params{" "}
                    <code className="text-white/70">zone_id</code>, optional{" "}
                    <code className="text-white/70">days</code> (default 7).
                  </li>
                </ul>
              </section>

              <section id="architecture" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Architecture
                </h2>
                <div className="mt-6 max-w-3xl space-y-4 border border-white/10 bg-white/[0.02] p-6 font-mono text-xs leading-relaxed text-white/55 md:text-sm">
                  <pre className="whitespace-pre-wrap">{`Browser (Next.js UI)
       │
       └─► Next.js Route Handlers (/api/*) — Supabase JWT auth, scan pipeline,
           targets/scans persistence, GSC OAuth, Cloudflare API proxy

Supabase Postgres — monix_* tables (users, targets, scans, credentials).

Google APIs — Search Console via stored OAuth refresh tokens.

Cloudflare — api.cloudflare.com (zones, GraphQL HTTP analytics) via stored API token.`}</pre>
                </div>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/60">
                  When you trigger a scan from the authenticated app, the server
                  validates the bearer token, associates the run with a target
                  when provided, and runs the TypeScript scan pipeline. Results
                  are written to{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    monix_scans
                  </code>{" "}
                  (see Reports &amp; persistence below).
                </p>
              </section>

              <section id="reports-storage" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Reports &amp; persistence
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Scan outcomes are stored in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    public.monix_scans
                  </code>
                  : a unique{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    report_id
                  </code>{" "}
                  (UUID), the scanned URL, composite{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    score
                  </code>
                  , full{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    results
                  </code>{" "}
                  JSON from the engine, optional{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    target_id
                  </code>{" "}
                  reference, and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    expires_at
                  </code>{" "}
                  /{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    is_expired
                  </code>{" "}
                  for shareable report lifetime (default TTL 30 days when
                  persisted).
                </p>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  <code className="font-mono text-[13px] text-white/70">
                    GET /api/reports/&lt;uuid&gt;/
                  </code>{" "}
                  returns the JSON payload for non-expired scans (used for
                  public sharing and the in-app report viewer). List endpoints
                  under{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/scans/
                  </code>{" "}
                  return metadata for the signed-in user&apos;s targets.
                </p>
              </section>

              <section id="scan-engine" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Scan engine
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  The scan pipeline lives in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    web/src/server/analysis/
                  </code>{" "}
                  (TypeScript). It covers TLS, DNS, headers, redirects, cookies,
                  geo, optional port checks, and—when configured—PageSpeed, then
                  feeds category scores. The response model includes findings,
                  recommendations, summaries, and raw fields the UI renders in
                  tables and panels.
                </p>
              </section>

              <section id="backend-api" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Next.js API &amp; data
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Authenticated JSON lives under{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/
                  </code>{" "}
                  as Next.js route handlers. The Supabase service role key is
                  used only on the server to read and write{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    monix_*
                  </code>{" "}
                  tables. Google Search Console and Cloudflare integration
                  endpoints are{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/gsc/*
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/cloudflare/*
                  </code>
                  .
                </p>
              </section>

              <section id="nextjs" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Next.js web app
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  The{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    web/
                  </code>{" "}
                  app uses the App Router. API calls are centralized in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    src/lib/api.ts
                  </code>
                  : the browser calls same-origin{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/*
                  </code>
                  . For server-side rendering, set{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    NEXT_PUBLIC_SITE_URL
                  </code>{" "}
                  to the public app origin so fetches resolve correctly outside
                  the browser.
                </p>
              </section>

              <section id="analysis" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  What gets analyzed
                </h2>
                <div className="mt-6 grid gap-8 md:grid-cols-3">
                  {[
                    {
                      title: "Security",
                      lines: [
                        "TLS / certificate validity",
                        "Security headers and cookie flags",
                        "DNS and host intelligence",
                        "Ports, redirects, tech fingerprint",
                        "Geo / IP context",
                      ],
                    },
                    {
                      title: "SEO",
                      lines: [
                        "Title, meta description, Open Graph",
                        "robots.txt and sitemap signals",
                        "Canonical and heading structure",
                        "Optional: GSC clicks, impressions, queries (OAuth)",
                        "Optional: Cloudflare edge requests & threats (API token)",
                      ],
                    },
                    {
                      title: "Performance",
                      lines: [
                        "Google PageSpeed when an API key is set",
                        "Core Web Vitals and lab metrics",
                        "Accessibility and best-practices scores",
                      ],
                    },
                  ].map((col) => (
                    <div
                      key={col.title}
                      className="border border-white/10 bg-white/[0.02] p-6"
                    >
                      <h3 className="text-sm font-semibold text-white">
                        {col.title}
                      </h3>
                      <ul className="mt-4 space-y-2 text-sm leading-relaxed text-white/50">
                        {col.lines.map((line) => (
                          <li key={line} className="flex gap-2">
                            <span className="font-mono text-white/25">—</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              <section id="configuration" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Configuration
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/50">
                  See repository{" "}
                  <code className="font-mono text-white/65">.env.example</code>{" "}
                  for the full list. Commonly:
                </p>
                <dl className="mt-6 max-w-3xl space-y-4 border border-white/10 divide-y divide-white/10">
                  {[
                    [
                      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
                      "Supabase project URL and anon key for browser auth.",
                    ],
                    [
                      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
                      "Server-only: Postgres access and admin operations from route handlers.",
                    ],
                    [
                      "SUPABASE_JWKS_URL / SUPABASE_JWT_AUD",
                      "JWT verification for production (RS256 via JWKS).",
                    ],
                    [
                      "NEXT_PUBLIC_SITE_URL",
                      "Public site origin for SSR fetches to /api/* (no trailing slash).",
                    ],
                    [
                      "PAGESPEED_API_KEY",
                      "Optional; improves PageSpeed Insights rate limits.",
                    ],
                    [
                      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET",
                      "OAuth client for Search Console API access; create in Google Cloud Console.",
                    ],
                    [
                      "GOOGLE_REDIRECT_URI",
                      "Must match Authorized redirect URIs — typically https://your-app/api/gsc/callback (local: http://localhost:3000/api/gsc/callback).",
                    ],
                    [
                      "GSC_OAUTH_SUCCESS_URL / GSC_OAUTH_ERROR_URL",
                      "Where the browser lands after GSC OAuth (defaults: Next.js Projects page with query flags).",
                    ],
                    [
                      "GOOGLE_REFRESH_TOKEN_FERNET_KEY",
                      "Optional Fernet key for stored GSC refresh tokens and Cloudflare API tokens; if unset, a key is derived from MONIX_FERNET_SECRET or SUPABASE_SERVICE_ROLE_KEY.",
                    ],
                  ].map(([name, desc]) => (
                    <div
                      key={name as string}
                      className="grid gap-2 px-4 py-4 md:grid-cols-[minmax(0,220px)_1fr] md:gap-8"
                    >
                      <dt className="font-mono text-[13px] text-white/80">
                        {name}
                      </dt>
                      <dd className="text-sm text-white/55">{desc}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section id="local-dev" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Local development
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Copy{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    .env.example
                  </code>{" "}
                  to{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    .env
                  </code>{" "}
                  at the repo root and configure Supabase plus Google OAuth as
                  documented above. Apply SQL in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    supabase/migrations/
                  </code>{" "}
                  to your Supabase Postgres project. Then run the Next.js app in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    web/
                  </code>{" "}
                  with{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    bun install
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    bun run dev
                  </code>
                  . Use{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    bun run test
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    bun run build
                  </code>{" "}
                  before shipping. Optionally run{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    ./setup.sh web
                  </code>{" "}
                  from the repo root.
                </p>
              </section>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
}
