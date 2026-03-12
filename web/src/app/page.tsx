"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import WorldMap from "@/components/WorldMap";
import { motion, type Variants } from "framer-motion";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const features = [
  ["SSL/TLS Analysis", "Certificate chain validation"],
  ["DNS Intelligence", "A, AAAA, MX, NS, TXT lookups"],
  ["Security Headers", "HSTS, CSP, X-Frame scoring"],
  ["Port Survey", "Common service exposure checks"],
  ["Tech Detection", "Server, CMS, Framework hints"],
  ["Geo Intel", "IP provider location mapping"],
];

const workflow = [
  [
    "01",
    "Submit Target",
    "Enter any public domain or URL. Monix normalizes the input and prepares a server-side scan.",
  ],
  [
    "02",
    "Parallel Analysis",
    "The API runs TLS, DNS, header, cookie, redirect, geo, and optional port tasks concurrently.",
  ],
  [
    "03",
    "Review Output",
    "The UI returns score, findings, remediation, map context, and raw detail in a single workspace.",
  ],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      <Navigation />

      <main className="relative flex flex-col items-center pt-40 px-6">
        {/* Strictly Centered Hero Section */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-4xl text-center z-10"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
              Autonomous Web Defense.
            </h1>
            <p className="text-lg md:text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
              Comprehensive web security analysis platform for public targets.
              Real-time URL scanning, routing inspection, and threat scoring in one workspace.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/web"
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-black font-semibold rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Analyze URL Now
              </Link>
              <Link
                href="/docs"
                className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-white/20 text-white font-semibold rounded-lg hover:bg-white/5 transition-colors"
              >
                View Documentation
              </Link>
            </div>
          </motion.div>
        </motion.section>

        {/* MapCN World Map with Live Stats Overlay */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-full max-w-6xl mt-24 mb-32 border border-white/10 rounded-3xl overflow-hidden relative"
          style={{ height: "640px" }}
        >
          {/* Map fills full container */}
          <WorldMap />

          {/* Overlay: top stats bar */}
          <div className="absolute top-0 left-0 right-0 px-6 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm font-semibold text-white">Live Global Threat Map</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-white/40">Scans / hr</p>
                <p className="text-base font-bold text-white">1,482</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/40">Active targets</p>
                <p className="text-base font-bold text-white">347</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-white/40">Threats flagged</p>
                <p className="text-base font-bold text-white">61</p>
              </div>
            </div>
          </div>

          {/* Overlay: bottom location tags */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
            <div className="flex gap-3 flex-wrap">
              {["Singapore · APAC", "Frankfurt · EU", "Virginia · US", "Tokyo · JP", "London · UK"].map((loc) => (
                <span key={loc} className="text-xs font-medium text-white/50 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                  {loc}
                </span>
              ))}
            </div>
            <span className="text-xs text-white/30">MapLibre · Carto Dark</span>
          </div>
        </motion.div>

        {/* Features Sub-section */}
        <section className="w-full max-w-6xl mx-auto border-t border-white/10 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Analysis Capabilities
            </h2>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map(([title, detail], i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="p-8 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <p className="text-lg font-semibold text-white">
                  {title}
                </p>
                <p className="mt-2 text-sm text-white/50 leading-relaxed group-hover:text-white/70 transition-colors">
                  {detail}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Workflow Section */}
        <section className="w-full max-w-6xl mx-auto border-t border-white/10 pt-24 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
              How It Works
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              A straightforward process from URL input to deep dive analysis.
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3 relative">
            <div className="hidden md:block absolute top-8 left-0 w-full h-[1px] bg-white/10 pointer-events-none" />

            {workflow.map(([step, title, body], i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="relative bg-black rounded-2xl p-8 border border-white/10 hover:border-white/30 transition-colors group"
              >
                <div className="absolute top-0 right-6 -translate-y-1/2 bg-black px-2 text-2xl font-bold text-white/20 group-hover:text-white/80 transition-colors">
                  {step}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  {body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
