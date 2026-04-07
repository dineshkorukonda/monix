"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Cloud,
  Gauge,
  Globe2,
  LayoutDashboard,
  Search,
  Shield,
  TrendingUp,
  Workflow,
} from "lucide-react";
import Link from "next/link";

const pillars = [
  {
    icon: Shield,
    title: "Security",
    description:
      "TLS chain validation, security headers, DNS and host intelligence, exposure checks, and technology fingerprinting with clear scoring.",
    bullets: [
      "Certificates and modern TLS posture",
      "HSTS, CSP, framing, and cookie flags",
      "Ports, redirects, and geo / IP context",
    ],
  },
  {
    icon: Search,
    title: "SEO",
    description:
      "On-page signals that affect discoverability: metadata, structured hints, crawl rules, and content structure checks. Optionally connect Google Search Console to layer real search performance on top.",
    bullets: [
      "Title, description, Open Graph",
      "robots.txt, sitemap, canonical",
      "H1 and heading hygiene",
      "Optional: GSC clicks, impressions, queries (verified properties)",
      "Optional: Cloudflare edge requests & cache ratio (matched zones)",
    ],
  },
  {
    icon: Gauge,
    title: "Performance",
    description:
      "When configured, PageSpeed Insights brings Core Web Vitals, lab data, and accessibility / best-practice signals into the same report.",
    bullets: [
      "Core Web Vitals and performance score",
      "Accessibility and best-practices",
      "Actionable metrics next to your URL analysis",
    ],
  },
] as const;

const workflow = [
  {
    step: "01",
    title: "Sign in",
    body: "Access the workspace with your account—run analyses against monitored sites, and keep a history of scans and reports.",
  },
  {
    step: "02",
    title: "Score by category",
    body: "Security, SEO, and performance each feed category scores and an overall score so you can compare and track over time.",
  },
  {
    step: "03",
    title: "Reports that stay",
    body: "Persisted, shareable reports plus dashboard views for targets, scans, and trends—everything in one place after you sign in.",
  },
  {
    step: "04",
    title: "Integrations (optional)",
    body: "Connect Google Search Console for queries and clicks, and Cloudflare with an API token for edge traffic, cache ratio, and security signals. Monix matches verified GSC properties and Cloudflare zones to your monitored sites; manage connections under Dashboard → Integrations.",
  },
] as const;

function useAnimProps() {
  const reduce = useReducedMotion();
  return {
    initial: reduce ? {} : { opacity: 0, y: 20 },
    whileInView: reduce ? {} : { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" as const },
    transition: { duration: 0.5 },
  };
}

export function PillarsSection() {
  const anim = useAnimProps();
  const reduce = useReducedMotion();

  return (
    <section id="pillars" className="mx-auto max-w-6xl px-6 py-24 md:py-32">
      <motion.div {...anim} className="mb-16 md:mb-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
          Coverage
        </p>
        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
          What we evaluate
        </h2>
        <p className="mt-4 max-w-2xl text-base text-white/50 md:text-lg">
          Three lenses on the same URL—the Python scan engine in{" "}
          <code className="font-mono text-[13px] text-white/60">core/</code>{" "}
          for analysis and scoring, Django for persistence and APIs, Next.js
          for the dashboard.
        </p>
      </motion.div>
      <div className="grid gap-px bg-white/10 md:grid-cols-3">
        {pillars.map((pillar, i) => (
          <motion.article
            key={pillar.title}
            initial={reduce ? {} : { opacity: 0, y: 20 }}
            whileInView={reduce ? {} : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.45 }}
            className="bg-black p-8 md:p-10"
          >
            <pillar.icon
              className="h-7 w-7 text-white/90"
              strokeWidth={1.25}
            />
            <h3 className="mt-8 text-xl font-semibold text-white">
              {pillar.title}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              {pillar.description}
            </p>
            <ul className="mt-8 space-y-3 border-t border-white/10 pt-8 text-sm text-white/40">
              {pillar.bullets.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="font-mono text-white/25">—</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

export function GscSection() {
  const anim = useAnimProps();
  return (
    <section className="border-t border-white/10 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...anim}
          className="border border-white/10 bg-linear-to-br from-emerald-500/[0.06] to-transparent p-8 md:p-10"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-12">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 text-emerald-400/90">
                <TrendingUp className="h-6 w-6" strokeWidth={1.25} />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Google Search Console
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
                Real search performance next to your scans
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/50 md:text-base">
                Connect Search Console from Integrations or while setting up
                a site. Monix stores OAuth tokens server-side, matches each
                target URL to a verified property, and syncs summary metrics
                plus top queries. Overview and Analytics show clicks,
                impressions, CTR, and average position when data is
                available—without replacing on-page SEO checks from the scan.
              </p>
            </div>
            <div className="shrink-0 md:max-w-xs md:text-right">
              <p className="text-xs leading-relaxed text-white/40">
                Requires Google Cloud OAuth credentials and a redirect URI
                that hits the Django callback. Details are in the
                documentation.
              </p>
              <Link
                href="/docs#google-search-console"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/80 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50"
              >
                Read the GSC setup guide
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function CloudflareSection() {
  const anim = useAnimProps();
  return (
    <section className="border-t border-white/10 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div
          {...anim}
          className="border border-white/10 bg-linear-to-br from-orange-500/[0.07] to-transparent p-8 md:p-10"
        >
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-12">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 text-orange-400/90">
                <Cloud className="h-6 w-6" strokeWidth={1.25} />
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
                  Cloudflare
                </span>
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
                Edge traffic next to your scans
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/50 md:text-base">
                Add an API token with zone read and analytics read. Monix
                stores it encrypted on the server, lists your zones, and
                pulls HTTP request series from Cloudflare&apos;s APIs. When a
                monitored site&apos;s hostname matches a zone, Overview,
                Sites, Analytics, and Issues show requests, cache ratio,
                threats, and country breakdowns alongside scan results.
              </p>
            </div>
            <div className="shrink-0 md:max-w-xs md:text-right">
              <p className="text-xs leading-relaxed text-white/40">
                Tokens are created in the Cloudflare dashboard; no worker
                deployment is required for this integration.
              </p>
              <Link
                href="/docs#cloudflare"
                className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white/80 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50"
              >
                Read the Cloudflare setup
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function WorkflowSection() {
  const reduce = useReducedMotion();
  const anim = useAnimProps();

  return (
    <section className="border-t border-white/10 bg-zinc-950/30 px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div {...anim} className="mb-16 md:mb-20">
          <div className="flex items-center gap-3 text-white/35">
            <Workflow className="h-5 w-5" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
              Flow
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            How it works
          </h2>
        </motion.div>
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-[15px] w-px bg-white/15 md:left-[19px]" />
          <div className="space-y-12 md:space-y-16">
            {workflow.map((w, i) => (
              <motion.div
                key={w.step}
                initial={reduce ? {} : { opacity: 0, x: -12 }}
                whileInView={reduce ? {} : { opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.45 }}
                className="relative flex gap-8 pl-10 md:gap-12 md:pl-14"
              >
                <span className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center border border-white/20 bg-black font-mono text-xs text-white/50 md:h-10 md:w-10">
                  {w.step}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white md:text-xl">
                    {w.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">
                    {w.body}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CtaSection() {
  const anim = useAnimProps();
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <motion.div {...anim} className="mb-14">
          <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
            Get into the workspace
          </h2>
          <p className="mt-4 max-w-xl text-white/50">
            Sign in to run analyses and manage sites. Documentation covers
            architecture, Supabase auth, Search Console and Cloudflare,
            how reports are stored, environment variables, and local
            development if you are integrating or self-hosting.
          </p>
        </motion.div>
        <div className="grid gap-6 md:grid-cols-2">
          <Link
            href="/login"
            className="group border border-white/15 bg-linear-to-br from-white/[0.05] to-transparent p-10 transition-colors hover:border-white/30"
          >
            <LayoutDashboard className="h-8 w-8 text-white/80" strokeWidth={1.25} />
            <h3 className="mt-8 text-xl font-semibold text-white">
              Sign in to the app
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Dashboard, sites, integrations, and scan history—everything gated
              behind authentication the way you run Monix today.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white">
              Continue to login
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/docs"
            className="group border border-white/15 bg-black p-10 transition-colors hover:border-white/30 hover:bg-white/[0.02]"
          >
            <BookOpen className="h-8 w-8 text-white/80" strokeWidth={1.25} />
            <h3 className="mt-8 text-xl font-semibold text-white">
              Documentation
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Django API, report persistence, Next.js frontend, Search Console
              and Cloudflare, environment variables, and local
              development—spelled out in one place.
            </p>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white/80 group-hover:text-white">
              Open docs
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      <section className="border-t border-white/10 px-6 pb-28 pt-8">
        <motion.div
          {...anim}
          className="mx-auto max-w-3xl border border-white/15 bg-zinc-950/50 px-8 py-16 text-center md:px-12"
        >
          <Globe2 className="mx-auto h-10 w-10 text-white/30" strokeWidth={1} />
          <h2 className="mt-8 text-2xl font-bold text-white md:text-3xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
            Sign in to start analyzing URLs and keeping reports under your
            account.
          </p>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center justify-center gap-2 border border-white bg-white px-10 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </section>
    </>
  );
}
