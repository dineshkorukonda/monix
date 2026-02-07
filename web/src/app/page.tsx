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
                Built on monix-engine's battle-tested security engine, delivering
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

      {/* Technical Breakdown */}
      <div className="container mx-auto px-6 py-24 max-w-[1600px]">
        <div className="text-center mb-16">
          <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
            [SECTION_02]
          </div>
          <h2 className="text-4xl font-black tracking-tighter uppercase mb-4">
            ANALYSIS_CAPABILITIES
          </h2>
          <p className="text-white/60 text-sm uppercase tracking-wider mt-4">
            Powered by monix-engine security engine
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
              title: "THREAT_ENGINE",
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

      {/* monix-engine Info Section */}
      <div className="border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-16 max-w-[1600px]">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
              [POWERED_BY]
            </div>
            <h3 className="text-2xl font-black tracking-tighter uppercase mb-6">
              MONIX-CORE ENGINE
            </h3>
            <p className="text-white/60 text-sm leading-relaxed mb-8">
              Monix Web is powered by the monix-engine security engine - a
              battle-tested Python-based threat detection and analysis system.
              The same engine logic powers both our web platform and CLI tools,
              ensuring consistency and reliability across the entire Monix
              ecosystem.
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
