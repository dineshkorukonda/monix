"use client";

import Navigation from "@/components/Navigation";
import UrlAnalyzer from "@/components/UrlAnalyzer";
import { motion } from "framer-motion";

const scanFeatures = [
  {
    title: "TLS / SSL",
    desc: "Certificate validity, chain of trust, expiry date, and issuer details.",
  },
  {
    title: "DNS Records",
    desc: "A, AAAA, MX, NS, and TXT record mapping for the target domain.",
  },
  {
    title: "Security Headers",
    desc: "HSTS, CSP, X-Frame-Options, X-Content-Type, and Referrer-Policy scoring.",
  },
  {
    title: "Geo-Intelligence",
    desc: "Server IP location, provider (AS), city, region, and country resolution.",
  },
  {
    title: "Port Survey",
    desc: "Common service exposure checks—SSH, FTP, RDP, and more.",
  },
  {
    title: "Tech Stack",
    desc: "Server, framework, CMS, CDN, and language fingerprinting.",
  },
  {
    title: "Cookie Audit",
    desc: "Secure, HttpOnly, SameSite flags reviewed per cookie.",
  },
  {
    title: "Redirect Chain",
    desc: "Full redirect chain traced, each hop's status code recorded.",
  },
];

export default function MonixWebPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />

      <main className="px-6 py-32 relative flex flex-col items-center gap-24">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-4xl text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Web Analyzer
          </h1>
          <p className="text-lg text-white/50 max-w-2xl mx-auto">
            Detailed URL security workspace. Review TLS, headers, DNS, and server details.
          </p>
        </motion.div>

        {/* Analyzer */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
          className="w-full max-w-[1400px] mx-auto"
        >
          <UrlAnalyzer />
        </motion.div>

        {/* What We Scan */}
        <section className="w-full max-w-[1400px] border-t border-white/10 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white mb-3">What we scan</h2>
            <p className="text-white/40 max-w-xl">
              Every scan runs these checks in parallel and combines the result into a single threat score.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {scanFeatures.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.4 }}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.05] transition-colors"
              >
                <p className="font-semibold text-white mb-2">{f.title}</p>
                <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How scoring works */}
        <section className="w-full max-w-[1400px] border-t border-white/10 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid md:grid-cols-2 gap-12 items-center"
          >
            <div>
              <h2 className="text-3xl font-bold text-white mb-4">How scoring works</h2>
              <p className="text-white/50 leading-relaxed mb-6">
                Each scan produces a threat score from 0–100. A higher score means more risk signals detected.
                The score is computed from the weighted sum of header coverage, TLS health, cookie hygiene,
                exposed ports, and active findings.
              </p>
              <div className="space-y-3">
                {[
                  ["0 – 39", "High risk — multiple critical signals"],
                  ["40 – 69", "Medium risk — some issues found"],
                  ["70 – 100", "Low risk — mostly secure configuration"],
                ].map(([range, label]) => (
                  <div key={range} className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-white w-20 shrink-0">{range}</span>
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-sm text-white/50">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 space-y-5">
              {[
                ["Header coverage", 65],
                ["TLS health", 90],
                ["Cookie hygiene", 50],
                ["Port exposure", 80],
                ["Final score", 72],
              ].map(([label, pct]) => (
                <div key={label as string}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-white/60">{label}</span>
                    <span className="font-semibold text-white">{pct}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
