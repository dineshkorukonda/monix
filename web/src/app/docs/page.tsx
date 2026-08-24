"use client";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

const nav = [
  { id: "overview", title: "Overview" },
  { id: "public-scanning", title: "Public Inspection Engine" },
  { id: "inspection-pipeline", title: "Inspection Pipeline" },
  { id: "rate-limiting", title: "Rate Limiting" },
  { id: "reports-persistence", title: "Reports & Persistence" },
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
            </div>
          </aside>

          {/* Documentation Content */}
          <article className="lg:col-span-9 space-y-16">
            <header className="border-b border-border pb-10 space-y-4">
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
                Monix Technical Reference
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-foreground">
                Architecture &amp; Inspection Pipeline
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-3xl">
                Monix is a standalone, unauthenticated website diagnostic
                platform built with Next.js 16, TypeScript, and Bun.
              </p>
            </header>

            {/* Overview */}
            <section id="overview" className="scroll-mt-28 space-y-4">
              <h2 className="font-serif text-2xl font-medium text-foreground">
                Overview
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Monix operates as a direct inspection utility: input any public
                URL to execute parallel diagnostic checks across Security
                posture, SEO directives, and performance indicators without any
                login wall.
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
                <pre>{`curl -X POST https://monix.dineshkorukonda.in/api/scan \\
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
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
