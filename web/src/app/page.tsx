"use client";

import Image from "next/image";
import Link from "next/link";
import Navigation from "@/components/Navigation";

const features = [
  ["SSL/TLS ANALYSIS", "CERTIFICATE_CHAIN_VALIDATION"],
  ["DNS INTELLIGENCE", "A_AAAA_MX_NS_TXT_LOOKUPS"],
  ["SECURITY HEADERS", "HSTS_CSP_XFRAME_SCORING"],
  ["PORT SURVEY", "COMMON_SERVICE_EXPOSURE"],
  ["TECH DETECTION", "SERVER_CMS_FRAMEWORK_HINTS"],
  ["GEO INTEL", "IP_PROVIDER_LOCATION_MAPPING"],
];

const workflow = [
  [
    "01",
    "SUBMIT_TARGET",
    "ENTER ANY PUBLIC DOMAIN OR URL. MONIX NORMALIZES THE INPUT AND PREPARES A SERVER-SIDE SCAN.",
  ],
  [
    "02",
    "PARALLEL_ANALYSIS",
    "THE API RUNS TLS, DNS, HEADER, COOKIE, REDIRECT, GEO, AND OPTIONAL PORT TASKS CONCURRENTLY.",
  ],
  [
    "03",
    "REVIEW_OUTPUT",
    "THE UI RETURNS SCORE, FINDINGS, REMEDIATION, MAP CONTEXT, AND RAW DETAIL IN A SINGLE WORKSPACE.",
  ],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />

      <main>
        <section className="border-b border-white/10">
          <div className="mx-auto grid max-w-[1600px] gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="mb-8 inline-block border border-white/20 px-3 py-1 text-[10px] font-bold tracking-[0.3em]">
                POWERED_BY_MONIX_CORE
              </div>
              <h1 className="max-w-5xl text-6xl font-black uppercase leading-none tracking-[-0.06em] md:text-8xl">
                MONIX WEB
              </h1>
              <p className="mt-8 max-w-2xl text-base uppercase leading-8 tracking-wide text-white/60">
                COMPREHENSIVE WEB SECURITY ANALYSIS PLATFORM FOR PUBLIC TARGETS.
                REAL-TIME URL SCANNING, ROUTING INSPECTION, TLS VALIDATION, DNS
                INTELLIGENCE, AND THREAT SCORING IN ONE TECHNICAL WORKSPACE.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  href="/web"
                  className="bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-black transition-all hover:bg-white/80"
                >
                  ANALYZE_URL_NOW
                </Link>
                <Link
                  href="/docs"
                  className="border border-white px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-white transition-all hover:bg-white/10"
                >
                  VIEW_DOCUMENTATION
                </Link>
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.02]">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <span className="text-[10px] font-bold tracking-[0.28em] text-white/40">
                  LIVE_ANALYSIS_SURFACE
                </span>
                <span className="text-[10px] font-bold tracking-[0.28em] text-white/40">
                  TECHNICAL_PREVIEW
                </span>
              </div>
              <div className="relative">
                <Image
                  src="/assets/demo.png"
                  alt="Monix analysis preview"
                  width={1200}
                  height={900}
                  className="h-full w-full object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-6">
                  <p className="max-w-lg text-[11px] uppercase leading-6 tracking-[0.2em] text-white/70">
                    DETAILED ANALYZER OUTPUT WITH TELEMETRY, FINDINGS,
                    RECOMMENDATIONS, MAP CONTEXT, AND ROUTING PATH DATA.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02]">
          <div className="mx-auto max-w-[1600px] px-6 py-24">
            <div className="mb-12">
              <div className="text-[10px] font-bold tracking-[0.4em] text-white/40">
                [SECTION_01]
              </div>
              <h2 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em]">
                ANALYSIS_CAPABILITIES
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {features.map(([title, detail]) => (
                <div
                  key={title}
                  className="border border-white/10 bg-black p-6 transition-all hover:border-white/20 hover:bg-white/[0.03]"
                >
                  <p className="text-sm font-black uppercase tracking-[0.18em]">
                    {title}
                  </p>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.28em] text-white/45">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1600px] px-6 py-24">
          <div className="mb-12">
            <div className="text-[10px] font-bold tracking-[0.4em] text-white/40">
              [SECTION_02]
            </div>
            <h2 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em]">
              HOW_IT_WORKS
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {workflow.map(([step, title, body]) => (
              <div
                key={step}
                className="border border-white/10 p-8 transition-all hover:border-white/20 hover:bg-white/[0.02]"
              >
                <div className="text-5xl font-black text-white/10">{step}</div>
                <h3 className="mt-6 text-sm font-black uppercase tracking-[0.22em]">
                  {title}
                </h3>
                <p className="mt-4 text-[11px] uppercase leading-7 tracking-[0.18em] text-white/60">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
