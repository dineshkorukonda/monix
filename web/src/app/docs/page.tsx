"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Navigation from "@/components/Navigation";

const sections = [
  {
    id: "overview",
    title: "Overview",
    body: "Monix Web is a technical analysis interface built over the Monix scanner core. It provides a detailed view of threat score, TLS state, headers, DNS, routing, cookies, infrastructure, and target geolocation.",
  },
  {
    id: "architecture",
    title: "Architecture",
    blocks: [
      "Frontend: Next.js App Router interface with data tables and dense scan output panels.",
      "API Layer: Flask endpoints for URL analysis, system metrics, connection data, and dashboard aggregation.",
      "Core: Python scanners and analyzers handle TLS, DNS, header scoring, tech detection, traffic heuristics, and exposure checks.",
    ],
  },
  {
    id: "scan-engine",
    title: "Scan Engine",
    blocks: [
      "Input is normalized to a public URL with optional deep collection flags.",
      "Tasks run in parallel when possible to reduce end-to-end latency.",
      "Results are combined into score, findings, recommendations, summary metrics, and raw telemetry.",
    ],
  },
  {
    id: "signals",
    title: "Analysis Signals",
    blocks: [
      "TLS Certificate validity and expiry",
      "HTTP Security Headers and percentage score",
      "DNS A, AAAA, MX, NS, TXT record mapping",
      "Cookie (Secure, HttpOnly, SameSite) review",
      "Redirect chain and final URL resolution",
      "IP provider location and open port context",
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />

      <main className="relative pt-32 px-6">
        <div className="mx-auto grid max-w-[1600px] gap-16 lg:grid-cols-12 relative z-10 pb-32">
          <aside className="lg:col-span-3">
            <div className="sticky top-32 border-l border-white/10 pl-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-block px-3 py-1 mb-4 rounded-full border border-white/20 bg-white/5 text-xs text-white/70">
                  Documentation Nav
                </div>
                <div className="mt-8 space-y-4">
                  {sections.map((section, i) => (
                    <motion.a
                      key={section.id}
                      href={`#${section.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                      className="block text-sm font-semibold text-white/40 transition-colors hover:text-white"
                    >
                      {section.title}
                    </motion.a>
                  ))}
                </div>
                <div className="mt-12 border-t border-white/10 pt-8">
                  <Link
                    href="/web"
                    className="text-sm font-semibold text-white hover:text-white/70 transition-colors"
                  >
                    Go to Scanner &rarr;
                  </Link>
                </div>
              </motion.div>
            </div>
          </aside>

          <motion.div
            className="lg:col-span-9"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="mb-20">
              <div className="inline-block px-3 py-1 mb-6 rounded-full border border-white/20 bg-white/5 text-xs text-white/70">
                System Guide
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
                Monix Platform Docs
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-white/50 leading-relaxed">
                Technical guide mapping the web analyzer, core scan engine,
                response model, and operations.
              </p>
            </div>

            <div className="space-y-24">
              {sections.map((section) => (
                <motion.section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-32"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <h2 className="mb-8 text-2xl font-bold text-white flex items-center">
                    <span className="mr-3 text-white/20">#</span>
                    {section.title}
                  </h2>

                  {section.body ? (
                    <p className="max-w-3xl text-base text-white/60 leading-relaxed mb-8">
                      {section.body}
                    </p>
                  ) : null}

                  {section.blocks ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {section.blocks.map((block, i) => (
                        <motion.div
                          key={block}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: i * 0.1 }}
                          className="p-6 rounded-2xl border border-white/10 bg-white/5 transition-colors hover:bg-white/10 group"
                        >
                          <p className="text-sm font-medium leading-relaxed text-white/70 group-hover:text-white transition-colors">
                            {block}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  ) : null}
                </motion.section>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
