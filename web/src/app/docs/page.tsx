"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";

const sections = [
  {
    id: "overview",
    title: "OVERVIEW",
    body: "MONIX WEB IS A TECHNICAL WEB ANALYSIS INTERFACE BUILT OVER THE MONIX SCANNER CORE. IT PROVIDES A DETAILED OPERATOR VIEW OF THREAT SCORE, TLS STATE, HEADERS, DNS, ROUTING, COOKIES, INFRASTRUCTURE, AND TARGET GEOLOCATION.",
  },
  {
    id: "architecture",
    title: "ARCHITECTURE",
    blocks: [
      "FRONTEND: NEXT.JS APP ROUTER INTERFACE WITH MAPLIBRE VISUALS AND DENSE SCAN OUTPUT PANELS.",
      "API LAYER: FLASK ENDPOINTS FOR URL ANALYSIS, SYSTEM METRICS, CONNECTION DATA, AND DASHBOARD AGGREGATION.",
      "CORE: PYTHON SCANNERS AND ANALYZERS HANDLE TLS, DNS, HEADER SCORING, TECHNOLOGY DETECTION, TRAFFIC HEURISTICS, AND EXPOSURE CHECKS.",
    ],
  },
  {
    id: "scan-engine",
    title: "SCAN_ENGINE",
    blocks: [
      "INPUT IS NORMALIZED TO A PUBLIC URL WITH OPTIONAL DEEP COLLECTION FLAGS.",
      "TASKS RUN IN PARALLEL WHEN POSSIBLE TO REDUCE END-TO-END LATENCY.",
      "RESULTS ARE COMBINED INTO SCORE, FINDINGS, RECOMMENDATIONS, SUMMARY METRICS, AND RAW TELEMETRY.",
    ],
  },
  {
    id: "signals",
    title: "ANALYSIS_SIGNALS",
    blocks: [
      "TLS_CERTIFICATE_VALIDITY_AND_EXPIRY",
      "HTTP_SECURITY_HEADERS_AND_PERCENTAGE_SCORE",
      "DNS_AAAA_MX_NS_TXT_RECORD_MAPPING",
      "COOKIE_SECURE_HTTPONLY_SAMESITE_REVIEW",
      "REDIRECT_CHAIN_AND_FINAL_URL_RESOLUTION",
      "IP_PROVIDER_LOCATION_AND_OPEN_PORT_CONTEXT",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />

      <div className="mx-auto grid max-w-[1600px] gap-16 px-6 py-20 lg:grid-cols-12">
        <aside className="lg:col-span-3">
          <div className="sticky top-28 border-l border-white/10 pl-6">
            <div className="text-[10px] font-bold tracking-[0.4em] text-white/40">
              [DOCS_NAV]
            </div>
            <div className="mt-8 space-y-5">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="block text-[11px] font-black uppercase tracking-[0.25em] text-white/40 transition-all hover:text-white"
                >
                  {section.title}
                </a>
              ))}
            </div>
            <div className="mt-16 border-t border-white/10 pt-10">
              <Link
                href="/web"
                className="text-[11px] font-black uppercase tracking-[0.25em] text-white underline underline-offset-8"
              >
                GO_TO_WEB_TOOL
              </Link>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-9">
          <div className="mb-20">
            <div className="text-[10px] font-bold tracking-[0.4em] text-white/40">
              [SYSTEM_GUIDE]
            </div>
            <h1 className="mt-4 text-6xl font-black uppercase tracking-[-0.06em]">
              MONIX WEB DOCS
            </h1>
            <p className="mt-6 max-w-3xl text-sm uppercase leading-8 tracking-[0.18em] text-white/60">
              TECHNICAL GUIDE TO THE WEB ANALYZER, CORE SCAN ENGINE, RESPONSE
              MODEL, AND OPERATOR WORKFLOW.
            </p>
          </div>

          <div className="space-y-24">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-32"
              >
                <h2 className="mb-10 text-2xl font-black uppercase tracking-[0.18em]">
                  <span className="mr-3 text-white/20">#</span>
                  {section.title}
                </h2>

                {section.body ? (
                  <p className="max-w-4xl text-[11px] uppercase leading-8 tracking-[0.18em] text-white/60">
                    {section.body}
                  </p>
                ) : null}

                {section.blocks ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {section.blocks.map((block) => (
                      <div
                        key={block}
                        className="border border-white/10 bg-white/[0.02] p-6 transition-all hover:border-white/20 hover:bg-white/[0.03]"
                      >
                        <p className="text-[11px] uppercase leading-7 tracking-[0.18em] text-white/70">
                          {block}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
