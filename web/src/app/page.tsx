"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";
import Image from "next/image";

export default function Home() {
  const currentYear = new Date().getFullYear();

  const features = [
    { feature: "SSL/TLS Analysis", desc: "CERTIFICATE_CHAIN_VALIDATION" },
    { feature: "DNS Intelligence", desc: "COMPLETE_RECORD_ANALYSIS" },
    { feature: "Security Headers", desc: "HSTS_CSP_XFRAME_SCORING" },
    { feature: "Port Scanning", desc: "SERVICE_DISCOVERY_MAPPING" },
    { feature: "Tech Detection", desc: "STACK_FRAMEWORK_IDENTIFICATION" },
    { feature: "Geo Intelligence", desc: "LOCATION_PROVIDER_TRACKING" },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navigation />

      {/* Hero Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-6 py-24 md:py-32 max-w-[1600px]">
          <div className="max-w-4xl">
            <div className="inline-block border border-white/20 px-3 py-1 text-[10px] font-bold tracking-[0.3em] mb-8">
              POWERED_BY_MONIX_CORE
            </div>
            <div className="mb-8">
              <h1 className="text-7xl md:text-8xl font-black tracking-tighter uppercase leading-none">
                MONIX WEB
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl leading-relaxed uppercase">
              Comprehensive web security analysis platform. Real-time URL
              scanning, SSL validation, DNS intelligence, and threat detection.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link
                href="/web"
                className="bg-white text-black px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white/80 transition-all"
              >
                ANALYZE_URL_NOW
              </Link>
              <Link
                href="/docs"
                className="bg-black text-white border border-white px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                VIEW_DOCUMENTATION
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Web Analysis Showcase Section */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-24 max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
                [SECTION_01]
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-8">
                SECURITY_ANALYSIS
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed uppercase text-sm">
                Monix Web provides comprehensive security analysis for any URL.
                Built on monix-core&apos;s battle-tested security system, delivering
                instant threat intelligence and vulnerability assessment.
              </p>
              <div className="space-y-4">
                {features.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1 border-l border-white/20 pl-6 py-2 hover:border-white transition-colors cursor-default group"
                  >
                    <span className="text-sm font-bold text-white group-hover:text-white/80 transition-colors">
                      {item.feature}
                    </span>
                    <span className="text-[10px] text-white/40 font-bold tracking-widest">
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/10 bg-black overflow-hidden shadow-2xl group hover:border-white/20 transition-all">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
                <span className="text-white/40 tracking-widest text-[10px] font-bold">
                  SCAN_RESULTS
                </span>
                <span className="text-white/40 tracking-widest text-[10px] font-bold">
                  LIVE_ANALYSIS
                </span>
              </div>
              <div className="relative">
                <Image
                  src="/assets/demo.png"
                  alt="Monix Web Security Analysis Demo"
                  width={800}
                  height={600}
                  className="w-full h-auto"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-6 py-24 max-w-[1600px]">
          <div className="text-center mb-16">
            <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
              [SECTION_02]
            </div>
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">
              HOW_IT_WORKS
            </h2>
            <p className="text-white/60 text-sm uppercase tracking-wider mt-4">
              Three steps to complete security analysis
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "SUBMIT_URL",
                desc: "Enter any URL or domain into the analyzer. Monix accepts any publicly accessible web address for scanning.",
              },
              {
                step: "02",
                title: "DEEP_ANALYSIS",
                desc: "Monix-core runs parallel security checks — SSL validation, DNS lookups, port scanning, header analysis, and threat scoring.",
              },
              {
                step: "03",
                title: "GET_REPORT",
                desc: "Receive a comprehensive security report with threat scores, vulnerability details, and actionable recommendations.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="border border-white/10 p-8 hover:border-white transition-all hover:bg-white/[0.02] group cursor-default"
              >
                <div className="text-5xl font-black text-white/10 mb-4 group-hover:text-white/20 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-sm font-black tracking-widest mb-4 uppercase">
                  {item.title}
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed uppercase group-hover:text-white/80 transition-colors">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technical Breakdown */}
      <div className="container mx-auto px-6 py-24 max-w-[1600px]">
        <div className="text-center mb-16">
          <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
            [SECTION_03]
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">
            ANALYSIS_CAPABILITIES
          </h2>
          <p className="text-white/60 text-sm uppercase tracking-wider mt-4">
            Powered by monix-core security system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "WEB_SECURITY",
              items: [
                "SSL_TLS_VALIDATION",
                "CERTIFICATE_CHAIN",
                "SECURITY_HEADERS",
                "VULNERABILITY_SCAN",
              ],
            },
            {
              title: "NETWORK_INTEL",
              items: [
                "DNS_ANALYSIS",
                "PORT_SCANNING",
                "GEOIP_TRACKING",
                "PROVIDER_MAPPING",
              ],
            },
            {
              title: "THREAT_DETECTION",
              items: [
                "RISK_SCORING",
                "TECH_DETECTION",
                "PATTERN_ANALYSIS",
                "REAL_TIME_UPDATES",
              ],
            },
          ].map((section, i) => (
            <div
              key={i}
              className="border border-white/10 p-8 hover:border-white transition-all hover:bg-white/[0.02] group cursor-default"
            >
              <h3 className="text-sm font-black tracking-widest mb-6 uppercase border-b border-white/10 pb-4 group-hover:border-white/20 transition-colors">
                [{section.title}]
              </h3>
              <ul className="space-y-3">
                {section.items.map((item, j) => (
                  <li
                    key={j}
                    className="text-[11px] text-white/60 font-bold tracking-widest flex items-center gap-2 group-hover:text-white/80 transition-colors"
                  >
                    <span className="text-white/20 group-hover:text-white/40 transition-colors">
                      {" >> "}
                    </span>{" "}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-6 py-24 max-w-[1600px]">
          <div className="text-center mb-16">
            <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
              [SECTION_04]
            </div>
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">
              USE_CASES
            </h2>
            <p className="text-white/60 text-sm uppercase tracking-wider mt-4">
              Who benefits from Monix
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "SECURITY_ENGINEERS",
                desc: "Run quick vulnerability assessments on web assets. Identify SSL misconfigurations, missing security headers, and exposed services before attackers do.",
              },
              {
                title: "DEVOPS_TEAMS",
                desc: "Validate deployment security posture. Monitor SSL certificate expiry, verify DNS configurations, and ensure production services meet security baselines.",
              },
              {
                title: "PENETRATION_TESTERS",
                desc: "Accelerate reconnaissance with automated port scanning, technology detection, and geographic intelligence. Gather comprehensive target information in seconds.",
              },
              {
                title: "SYSTEM_ADMINISTRATORS",
                desc: "Monitor server security with CLI tools. Track connections, detect intrusion attempts, and receive real-time threat alerts for Linux infrastructure.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="border border-white/10 p-8 hover:border-white transition-all hover:bg-white/[0.02] group cursor-default"
              >
                <h3 className="text-sm font-black tracking-widest mb-4 uppercase border-b border-white/10 pb-4 group-hover:border-white/20 transition-colors">
                  [{item.title}]
                </h3>
                <p className="text-[11px] text-white/60 leading-relaxed uppercase group-hover:text-white/80 transition-colors">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Source Section */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-24 max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
                [SECTION_05]
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-8">
                OPEN_SOURCE
              </h2>
              <p className="text-white/60 text-sm leading-relaxed uppercase mb-8">
                Monix is fully open source under the MIT license. Inspect every
                line of security logic, contribute improvements, or deploy your
                own instance. Transparency is fundamental to trustworthy
                security tooling.
              </p>
              <div className="flex flex-wrap gap-6">
                <a
                  href="https://github.com/dinexh/monix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white text-black px-8 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/80 transition-all"
                >
                  VIEW_ON_GITHUB
                </a>
                <a
                  href="https://dineshkorukonda.in/blogs/monix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/20 px-8 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  READ_THE_BLOG
                </a>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  label: "LICENSE",
                  value: "MIT — FREE_AND_OPEN",
                },
                {
                  label: "LANGUAGE",
                  value: "PYTHON + TYPESCRIPT",
                },
                {
                  label: "FRONTEND",
                  value: "NEXT.JS + TAILWIND_CSS",
                },
                {
                  label: "BACKEND",
                  value: "FLASK_REST_API",
                },
                {
                  label: "DEPLOYMENT",
                  value: "VERCEL + DOCKER_READY",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between border border-white/10 px-6 py-4 hover:border-white/20 transition-all group cursor-default"
                >
                  <span className="text-[10px] font-bold text-white/40 tracking-widest group-hover:text-white/60 transition-colors">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-bold tracking-widest group-hover:text-white/80 transition-colors">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* monix-core Info Section */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-16 max-w-[1600px]">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
              [POWERED_BY]
            </div>
            <h3 className="text-2xl font-black tracking-tighter uppercase mb-6">
              MONIX-CORE
            </h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              Monix Web is powered by monix-core — a battle-tested Python-based
              threat detection and analysis system. The same core logic powers
              both our web platform and CLI tools, ensuring consistency and
              reliability across the entire Monix ecosystem.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="https://dineshkorukonda.in/blogs/monix"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-white/20 px-8 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all group"
              >
                READ_MORE_ON_BLOG{" "}
                <span className="inline-block group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </a>
              <a
                href="https://github.com/dinexh/monix"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-white/20 px-8 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                VIEW_SOURCE
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 bg-white/[0.01]">
        <div className="container mx-auto px-6 max-w-[1600px]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black tracking-tighter">
                MONIX WEB
              </span>
              <span className="text-[10px] text-white/40 tracking-[0.4em]">
                WEB_SECURITY_ANALYSIS_PLATFORM
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-12">
              {[
                { label: "ANALYZE", href: "/web" },
                { label: "DOCS", href: "/docs" },
                { label: "GITHUB", href: "https://github.com/dinexh/monix" },
                { label: "BLOG", href: "https://dineshkorukonda.in" },
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    link.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  className="text-[11px] font-black tracking-widest hover:text-white/60 transition-colors uppercase underline underline-offset-4"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 text-center md:text-right">
              BY{" "}
              <a
                href="https://dineshkorukonda.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline uppercase"
              >
                dineshkorukonda
              </a>
            </div>
          </div>
          <div className="mt-16 text-center text-[10px] text-white/20 tracking-widest">
            (C) {currentYear} MONIX WEB. POWERED BY MONIX-CORE.
          </div>
        </div>
      </footer>
    </div>
  );
}
