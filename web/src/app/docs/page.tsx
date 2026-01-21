"use client";

import Navigation from "@/components/Navigation";
import Link from "next/link";
import { useState } from "react";

export default function DocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    {
      id: "overview",
      title: "OVERVIEW",
      content:
        "MONIX WEB IS A COMPREHENSIVE WEB SECURITY ANALYSIS PLATFORM THAT PROVIDES REAL-TIME URL SCANNING, SSL CERTIFICATE VALIDATION, DNS INTELLIGENCE, AND THREAT DETECTION. BUILT ON THE MONIX-CORE SECURITY ENGINE, IT DELIVERS INSTANT VULNERABILITY ASSESSMENT AND SECURITY SCORING FOR ANY DOMAIN OR URL.",
    },
    {
      id: "architecture",
      title: "ARCHITECTURE",
      infoBoxes: [
        {
          title: "SYSTEM_DESIGN",
          content:
            "MONIX WEB FOLLOWS A CLEAN THREE-TIER ARCHITECTURE: [1] FRONTEND (NEXT.JS) - USER INTERFACE AND VISUALIZATION. [2] API LAYER (FLASK REST API) - COMMUNICATION BRIDGE BETWEEN UI AND CORE. [3] MONIX-CORE (PYTHON) - SECURITY ENGINE WITH ALL THREAT DETECTION LOGIC. THIS SEPARATION ENSURES MAINTAINABILITY, REUSABILITY, AND SINGLE SOURCE OF TRUTH FOR SECURITY OPERATIONS.",
        },
        {
          title: "DATA_FLOW",
          content:
            "USER SUBMITS URL → NEXT.JS FRONTEND SENDS REQUEST TO API → FLASK API CALLS MONIX-CORE ANALYZERS → CORE PERFORMS SSL VALIDATION, DNS LOOKUP, PORT SCAN, HEADER ANALYSIS → THREAT SCORING ENGINE CALCULATES RISK → RESULTS RETURNED THROUGH API → FRONTEND DISPLAYS INTERACTIVE VISUALIZATION. ALL PROCESSING HAPPENS SERVER-SIDE FOR SECURITY AND PERFORMANCE.",
        },
        {
          title: "CORE_MODULES",
          content:
            "MONIX-CORE CONTAINS: [ANALYZERS] THREAT DETECTION, TRAFFIC ANALYSIS. [COLLECTORS] CONNECTION DATA, SYSTEM METRICS. [SCANNERS] WEB SECURITY, PORT SCANNING. [UTILS] GEOIP LOOKUP, DNS RESOLUTION, LOGGING. ALL MODULES ARE REUSABLE ACROSS BOTH WEB AND CLI INTERFACES.",
        },
      ],
    },
    {
      id: "features",
      title: "ANALYSIS_FEATURES",
      commands: [
        { cmd: "SSL/TLS Validation", desc: "CERTIFICATE_CHAIN_EXPIRY_ISSUER" },
        { cmd: "DNS Intelligence", desc: "A_AAAA_MX_NS_TXT_CNAME_RECORDS" },
        { cmd: "Security Headers", desc: "HSTS_CSP_XFRAME_SCORING" },
        { cmd: "Port Scanning", desc: "SERVICE_DISCOVERY_MAPPING" },
        { cmd: "Tech Detection", desc: "SERVER_CMS_FRAMEWORK_ID" },
        { cmd: "Geo Intelligence", desc: "LOCATION_PROVIDER_TRACKING" },
      ],
    },
    {
      id: "security_scoring",
      title: "SECURITY_SCORING",
      threats: [
        { name: "SSL_ISSUES", desc: "INVALID_EXPIRED_WEAK_CERTIFICATES" },
        { name: "HEADER_MISSING", desc: "ABSENT_SECURITY_HEADERS" },
        { name: "DNS_ANOMALY", desc: "SUSPICIOUS_DNS_CONFIGURATION" },
        { name: "OPEN_PORTS", desc: "UNNECESSARY_SERVICE_EXPOSURE" },
      ],
    },
    {
      id: "threat_engine",
      title: "THREAT_SCORING_ENGINE",
      infoBoxes: [
        {
          title: "SCORING_ALGORITHM",
          content:
            "MONIX-CORE CALCULATES A THREAT_SCORE FROM 0 TO 100. LOWER SCORES INDICATE BETTER SECURITY HYGIENE. SCORING FACTORS: [+10] MISSING HSTS HEADER. [+8] MISSING CSP. [+5] WEAK SSL CIPHER. [+15] EXPIRED CERTIFICATE. [+10] SUSPICIOUS OPEN PORTS. [+7] MISSING X-FRAME-OPTIONS. [+12] NO DNS SECURITY RECORDS. FINAL SCORE DETERMINES THREAT LEVEL.",
        },
        {
          title: "THREAT_CLASSIFICATION",
          content:
            "[LOW: 0-14] MINIMAL RISK, GOOD SECURITY POSTURE. [MEDIUM: 15-29] MODERATE ISSUES, RECOMMENDED IMPROVEMENTS. [HIGH: 30-49] SIGNIFICANT VULNERABILITIES, IMMEDIATE ACTION NEEDED. [CRITICAL: 50+] SEVERE SECURITY GAPS, URGENT REMEDIATION REQUIRED. CLASSIFICATION USES COLOR CODING: GREEN→YELLOW→ORANGE→RED.",
        },
        {
          title: "DETECTION_METHODS",
          content:
            "MONIX-CORE EMPLOYS MULTIPLE DETECTION TECHNIQUES: [SSL/TLS] CERTIFICATE CHAIN VALIDATION, CIPHER STRENGTH ANALYSIS. [DNS] RECORD VERIFICATION, DNSSEC CHECKS. [HEADERS] SECURITY HEADER PRESENCE AND VALUES. [PORTS] SERVICE FINGERPRINTING, UNNECESSARY EXPOSURE. [CONTENT] TECHNOLOGY DETECTION, VULNERABILITY PATTERNS. ALL CHECKS RUN IN PARALLEL FOR SPEED.",
        },
      ],
    },
    {
      id: "technology_stack",
      title: "TECHNOLOGY_STACK",
      infoBoxes: [
        {
          title: "FRONTEND",
          content:
            "NEXT.JS 16 - REACT FRAMEWORK WITH SERVER COMPONENTS. TYPESCRIPT - TYPE-SAFE DEVELOPMENT. TAILWIND CSS 4 - UTILITY-FIRST STYLING. MAPLIBRE-GL - INTERACTIVE GEOLOCATION MAPS. ALL RUNNING ON BUN RUNTIME FOR MAXIMUM PERFORMANCE.",
        },
        {
          title: "BACKEND",
          content:
            "PYTHON 3.8+ - CORE LANGUAGE FOR SECURITY LOGIC. FLASK - REST API SERVER. REQUESTS - HTTP CLIENT FOR URL ANALYSIS. SOCKET - LOW-LEVEL NETWORK OPERATIONS. GEOIP2 - LOCATION INTELLIGENCE. DNSPYTHON - DNS RESOLUTION. SSL MODULE - CERTIFICATE VALIDATION.",
        },
        {
          title: "DEPLOYMENT",
          content:
            "WEB APP DEPLOYED ON VERCEL FOR GLOBAL CDN. API CAN RUN ON ANY PYTHON-COMPATIBLE SERVER. DOCKER SUPPORT FOR CONTAINERIZED DEPLOYMENT. ENVIRONMENT VARIABLES FOR CONFIGURATION. CORS ENABLED FOR FRONTEND-API COMMUNICATION. FOR SELF-HOSTING DETAILS, VISIT DINESHKORUKONDA.IN/BLOG",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navigation />

      <div className="container mx-auto px-6 py-20 max-w-[1600px]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="sticky top-32 border-l border-white/10 pl-6">
              <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-8">
                [DOCS_NAV]
              </div>
              <nav className="space-y-6">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block text-[11px] font-black tracking-widest hover:text-white transition-all text-white/40 uppercase"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
              <div className="mt-16 pt-16 border-t border-white/5">
                <Link
                  href="/web"
                  className="text-[11px] font-black tracking-widest text-white underline underline-offset-8"
                >
                  GO_TO_WEB_TOOL
                </Link>
              </div>
            </div>
          </aside>

          {/* Content */}
          <main className="lg:col-span-9 max-w-3xl">
            <div className="mb-20">
              <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
                [SYSTEM_GUIDE]
              </div>
              <h1 className="text-6xl font-black tracking-tighter uppercase mb-8">
                MONIX WEB DOCS
              </h1>
              <p className="text-white/60 text-lg leading-relaxed uppercase">
                COMPREHENSIVE GUIDE TO WEB SECURITY ANALYSIS PLATFORM.
              </p>
            </div>

            <div className="space-y-32">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  className="scroll-mt-32"
                >
                  <h2 className="text-2xl font-black tracking-tighter uppercase mb-12 flex items-center gap-4">
                    <span className="text-white/20">#</span> {section.title}
                  </h2>

                  {section.content && (
                    <p className="text-white/60 leading-relaxed uppercase text-sm">
                      {section.content}
                    </p>
                  )}

                  {section.steps && (
                    <div className="space-y-12">
                      {section.steps.map((step, i) => (
                        <div key={i} className="space-y-4">
                          <h3 className="text-sm font-black tracking-widest flex items-center gap-4">
                            <span className="text-white/40">[{i + 1}]</span>{" "}
                            {step.title}
                          </h3>
                          <div className="relative group">
                            <pre className="bg-white/5 border border-white/10 p-6 text-[11px] overflow-x-auto text-white/80 group-hover:border-white/20 transition-colors">
                              <code>{step.cmd}</code>
                            </pre>
                            <button
                              onClick={() => copyCode(step.cmd)}
                              className="absolute top-2 right-2 px-3 py-1 text-[9px] font-bold tracking-widest border border-white/20 bg-black hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
                            >
                              {copiedCode === step.cmd ? "COPIED!" : "COPY"}
                            </button>
                          </div>
                          {step.note && (
                            <span className="text-[9px] font-bold text-white/20 tracking-widest block italic uppercase">
                              ! {step.note}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {section.commands && (
                    <div className="space-y-4">
                      {section.commands.map((cmd, i) => (
                        <div
                          key={i}
                          className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 p-6 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all group cursor-default"
                        >
                          <code className="text-sm font-bold text-white group-hover:text-white/80 transition-colors">
                            {cmd.cmd}
                          </code>
                          <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase group-hover:text-white/60 transition-colors">
                            {cmd.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.threats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.threats.map((threat, i) => (
                        <div
                          key={i}
                          className="border border-white/10 p-6 bg-black hover:border-white/20 hover:bg-white/[0.02] transition-all group cursor-default"
                        >
                          <h3 className="text-sm font-black tracking-widest mb-3 uppercase group-hover:text-white/80 transition-colors">
                            [{threat.name}]
                          </h3>
                          <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase group-hover:text-white/60 transition-colors">
                            {threat.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.infoBoxes && (
                    <div className="space-y-6">
                      {section.infoBoxes.map((box, i) => (
                        <div
                          key={i}
                          className="border border-white/10 p-8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition-all group cursor-default"
                        >
                          <h3 className="text-sm font-black tracking-widest mb-4 uppercase border-b border-white/10 pb-4 group-hover:border-white/20 transition-colors">
                            [{box.title}]
                          </h3>
                          <p className="text-[11px] text-white/60 leading-relaxed uppercase group-hover:text-white/70 transition-colors">
                            {box.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-32 pt-20 border-t border-white/10 flex flex-col items-center gap-8">
              <h2 className="text-3xl font-black tracking-tighter uppercase">
                START_ANALYZING
              </h2>
              <div className="flex gap-8">
                <Link
                  href="/web"
                  className="bg-white text-black px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white/80 transition-all"
                >
                  ANALYZE_URL_NOW
                </Link>
                <a
                  href="https://github.com/dinexh/monix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white border border-white px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                >
                  VIEW_ON_GITHUB
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-white/10 py-12 mt-20">
        <div className="container mx-auto px-6 max-w-[1600px] flex justify-between items-center text-[10px] text-white/20 font-bold tracking-[0.2em] uppercase">
          <span>(C) {currentYear} MONIX WEB - POWERED BY MONIX-CORE</span>
          <span>
            BY{" "}
            <a
              href="https://dineshkorukonda.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-all"
            >
              dineshkorukonda
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
