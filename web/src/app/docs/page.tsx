"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Navigation from "@/components/Navigation";

const nav = [
  { id: "overview", title: "Overview" },
  { id: "using-the-product", title: "Using the product" },
  { id: "google-oauth-console", title: "Google OAuth (Console)" },
  { id: "google-search-console", title: "Google Search Console" },
  { id: "architecture", title: "Architecture" },
  { id: "flask-api", title: "Flask scan API" },
  { id: "django", title: "Django reports & auth" },
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
                This guide matches the repo: Flask runs scans and scoring,
                Django stores reports and serves authenticated APIs (including
                optional Google Search Console OAuth), and the Next.js app is
                what you sign into to manage projects and read results.
              </p>
            </header>

            <div className="space-y-20 md:space-y-28">
              <section id="overview" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Overview
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  Monix analyzes a public URL and produces category scores
                  (security, SEO, performance) plus an overall score. Scan
                  output is persisted so you can reopen reports and share them.
                  The product surface is the authenticated dashboard: you sign
                  in, attach URLs to projects, run scans, and browse history—not
                  a separate marketing scanner flow. You can optionally connect
                  Google Search Console to pull verified-property search
                  analytics into the dashboard.
                </p>
              </section>

              <section id="using-the-product" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Using the product
                </h2>
                <ul className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-white/60">
                  <li>
                    <strong className="text-white/90">Sign in</strong> — Session
                    cookies are issued by Django (
                    <code className="font-mono text-[13px] text-white/70">
                      /api/auth/login/
                    </code>
                    , etc.). The Next.js app calls these endpoints with
                    credentials included.{" "}
                    <strong className="text-white/90">
                      Sign in with Google
                    </strong>{" "}
                    uses{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      /api/auth/login/google-oauth2/
                    </code>
                    ; Google redirects to{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      /api/auth/google/callback/
                    </code>{" "}
                    (same URI as{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      GOOGLE_REDIRECT_URI
                    </code>{" "}
                    for Search Console — the handler branches on OAuth scope).
                    Register the full URL under{" "}
                    <em>Authorized redirect URIs</em>. Set{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      DJANGO_PUBLIC_BASE_URL
                    </code>{" "}
                    so the origin matches (avoids{" "}
                    <code className="font-mono text-[12px] text-white/55">
                      redirect_uri_mismatch
                    </code>
                    ).
                  </li>
                  <li>
                    <strong className="text-white/90">Overview</strong> — The
                    dashboard home summarizes activity, average scores, and—when
                    Search Console is connected—aggregated search metrics
                    (clicks, impressions, CTR, position) and per-project
                    breakdowns.
                  </li>
                  <li>
                    <strong className="text-white/90">Analytics</strong> —
                    Deeper Search Console tables: per-target summaries, top
                    queries, sync status, and a button to refresh metrics for
                    all targets.
                  </li>
                  <li>
                    <strong className="text-white/90">Projects</strong> —
                    Targets (URLs) live under projects. Create or open a
                    project, then run analyses against a target. Connect Google
                    Search Console here (OAuth); new targets sync search data
                    when the domain matches a verified property in your GSC
                    account.
                  </li>
                  <li>
                    <strong className="text-white/90">Scan history</strong> —
                    Lists completed scans; open a row to view the full report
                    for that run.
                  </li>
                  <li>
                    <strong className="text-white/90">Reports</strong> — Stored
                    in PostgreSQL and fetched via Django (
                    <code className="font-mono text-[13px] text-white/70">
                      /api/reports/&lt;id&gt;/
                    </code>
                    ). Public report routes in the app redirect into the
                    dashboard report view when appropriate.
                  </li>
                  <li>
                    <strong className="text-white/90">
                      Profile &amp; settings
                    </strong>{" "}
                    — Account and workspace preferences from the sidebar.
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
                    and paste exactly (local Django; includes trailing slash).
                    Sign-in and Search Console share this path:
                    <code className="mt-2 block font-mono text-[13px] text-emerald-300/90">
                      http://localhost:8000/api/auth/google/callback/
                    </code>
                    If you use{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      127.0.0.1
                    </code>{" "}
                    everywhere, add that host instead and set{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      DJANGO_PUBLIC_BASE_URL
                    </code>{" "}
                    to match.
                  </li>
                  <li>
                    Set{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      GOOGLE_REDIRECT_URI
                    </code>{" "}
                    to that same callback URL so GSC token exchange matches. You
                    do not need a separate{" "}
                    <code className="font-mono text-[13px] text-white/70">
                      /api/gsc/callback/
                    </code>{" "}
                    unless you configure it that way yourself.
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
                    each target URL, Django picks a Search Console property you
                    have verified (URL-prefix or domain) that matches the target
                    host. If nothing matches, the target records a clear sync
                    message instead of failing the rest of the app.
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
                  Django API routes
                </h3>
                <ul className="mt-4 max-w-3xl space-y-2 font-mono text-[13px] leading-relaxed text-white/55">
                  <li>
                    <code className="text-white/75">GET /api/gsc/connect/</code>{" "}
                    — Start OAuth; redirects to Google.
                  </li>
                  <li>
                    <code className="text-white/75">
                      GET /api/gsc/callback/
                    </code>{" "}
                    — OAuth redirect target; exchanges code for tokens, then
                    redirects to{" "}
                    <code className="text-white/70">GSC_OAUTH_SUCCESS_URL</code>{" "}
                    or error URL.
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
                  Register the callback URL in Google Cloud Console (OAuth
                  client) exactly as{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    GOOGLE_REDIRECT_URI
                  </code>
                  — typically{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    http://localhost:8000/api/gsc/callback/
                  </code>{" "}
                  in development. Success and error browser redirects after
                  OAuth are controlled by{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    GSC_OAUTH_SUCCESS_URL
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    GSC_OAUTH_ERROR_URL
                  </code>{" "}
                  (defaults point at the Next.js Projects page with query
                  flags).
                </p>
              </section>

              <section id="architecture" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Architecture
                </h2>
                <div className="mt-6 max-w-3xl space-y-4 border border-white/10 bg-white/[0.02] p-6 font-mono text-xs leading-relaxed text-white/55 md:text-sm">
                  <pre className="whitespace-pre-wrap">{`Browser (Next.js)
       │
       ├─► Django :8000  — session auth, targets, scans, report CRUD
       │        │
       │        └─► Flask :3030  — scan execution (server-side proxy uses shared secret)
       │
       └─► Flask :3030  — optional direct API use (e.g. dev); web client uses env NEXT_PUBLIC_API_URL

PostgreSQL — single DATABASE_URL shared by Flask ORM and Django.

Google APIs — Django calls Google Search Console (OAuth + Webmasters API)
  using stored refresh tokens; Flask is not involved in GSC.`}</pre>
                </div>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-white/60">
                  When you trigger a scan from the authenticated app, Django
                  validates your session, associates the run with a target, and
                  calls Flask internally using{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    FLASK_API_URL
                  </code>{" "}
                  and{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    MONIX_INTERNAL_SCAN_SECRET
                  </code>
                  . Flask returns structured results; Django persists the report
                  and score for the UI to load.
                </p>
              </section>

              <section id="flask-api" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Flask scan API
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  The{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    api/
                  </code>{" "}
                  package hosts scan orchestration, enrichment, and scoring. It
                  listens on{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    PORT
                  </code>{" "}
                  (default 3030). Tasks such as TLS, DNS, headers, redirects,
                  cookies, geo, optional port checks, and—when
                  configured—PageSpeed run and feed into category scores. The
                  response model includes findings, recommendations, summaries,
                  and raw fields the UI renders in tables and panels.
                </p>
              </section>

              <section id="django" className="scroll-mt-28">
                <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  Django reports &amp; auth
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/60">
                  The{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    core/
                  </code>{" "}
                  project owns models for targets, scans, and reports; exposes
                  REST-style JSON under{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/
                  </code>
                  ; and includes the admin UI at{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /admin/
                  </code>
                  . CORS is configured so the browser can call Django directly
                  from the Next.js origin. Google Search Console OAuth and sync
                  endpoints live here (
                  <code className="font-mono text-[13px] text-white/70">
                    /api/gsc/*
                  </code>
                  ). Admin login can be rate-limited via django-axes using{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    AXES_*
                  </code>{" "}
                  in environment.
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
                  : Flask base URL from{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    NEXT_PUBLIC_API_URL
                  </code>{" "}
                  (defaults to{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    http://localhost:3030
                  </code>
                  ), Django from{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    NEXT_PUBLIC_DJANGO_URL
                  </code>{" "}
                  (defaults to{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    http://localhost:8000
                  </code>
                  ). Do not proxy browser calls through Next.js{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    /api/*
                  </code>{" "}
                  routes in a way that fights Django&apos;s trailing-slash
                  behavior—the client is written to hit Django and Flask
                  directly.
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
                      "DATABASE_URL",
                      "PostgreSQL URL shared by Flask and Django.",
                    ],
                    [
                      "DJANGO_SECRET_KEY",
                      "Required for Django sessions and signing.",
                    ],
                    [
                      "FLASK_API_URL",
                      "Where Django calls Flask for scans (server-side).",
                    ],
                    [
                      "MONIX_INTERNAL_SCAN_SECRET",
                      "Shared secret for Django→Flask scan proxy; set a strong value in production.",
                    ],
                    [
                      "PAGESPEED_API_KEY",
                      "Optional; improves PageSpeed Insights rate limits.",
                    ],
                    [
                      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET",
                      "OAuth client for Google login and Search Console; create in Google Cloud Console.",
                    ],
                    [
                      "DJANGO_PUBLIC_BASE_URL",
                      "Canonical origin of Django (no trailing slash). With default path, sign-in redirect is …/api/auth/google/callback/. In DEBUG defaults to http://localhost:8000.",
                    ],
                    [
                      "GOOGLE_LOGIN_REDIRECT_PATH",
                      "Optional path segment for sign-in only (default /api/auth/google/callback/). Must match Authorized redirect URIs.",
                    ],
                    [
                      "GOOGLE_REDIRECT_URI",
                      "Full URL for GSC OAuth code exchange — use the same …/api/auth/google/callback/ as sign-in when sharing one Console URI.",
                    ],
                    [
                      "GSC_OAUTH_SUCCESS_URL / GSC_OAUTH_ERROR_URL",
                      "Where the browser lands after GSC OAuth (defaults: Next.js Projects page with query flags).",
                    ],
                    [
                      "GOOGLE_REFRESH_TOKEN_FERNET_KEY",
                      "Optional Fernet key for encrypting stored GSC refresh tokens; falls back to a key derived from DJANGO_SECRET_KEY if unset.",
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
                  From the repo root: create a Python venv, install
                  requirements, copy{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    .env.example
                  </code>{" "}
                  to{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    .env
                  </code>
                  , run Flask (e.g.{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    python app.py
                  </code>
                  ), run Django in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    core/
                  </code>{" "}
                  with migrations, and run the Next.js dev server in{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    web/
                  </code>{" "}
                  with Bun. Use{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    pytest
                  </code>{" "}
                  from the repo root for backend tests;{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    bun run build
                  </code>{" "}
                  for the frontend. If your team uses{" "}
                  <code className="font-mono text-[13px] text-white/70">
                    setup.sh
                  </code>
                  , follow that for the exact sequence.
                </p>
              </section>
            </div>
          </motion.article>
        </div>
      </main>
    </div>
  );
}
