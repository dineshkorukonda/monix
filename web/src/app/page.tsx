"use client";

import Link from "next/link";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      <Navigation />

      {/* Hero Section */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-6 py-24 md:py-32 max-w-[1600px]">
          <div className="max-w-4xl">
            <div className="inline-block border border-white/20 px-3 py-1 text-[10px] font-bold tracking-[0.3em] mb-8">
              CORE_SYSTEM_ACTIVE
            </div>
            <div className="mb-8">
              <h1 className="text-7xl md:text-8xl font-black tracking-tighter uppercase leading-none">
                MONIX
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-2xl leading-relaxed uppercase">
              Real-time intrusion monitoring and autonomous defense for Linux infrastructure.
              High-density connection intelligence.
            </p>
            <div className="flex flex-wrap gap-6">
              <Link
                href="/web"
                className="bg-white text-black px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white/80 transition-all"
              >
                EXECUTE_WEB_SCAN
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

      {/* CLI Showcase Section */}
      <div className="border-b border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 py-24 max-w-[1600px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4">
                [SECTION_01]
              </div>
              <h2 className="text-4xl font-black tracking-tighter uppercase mb-8">
                TERMINAL_OPERATIONS
              </h2>
              <p className="text-white/60 mb-8 leading-relaxed uppercase text-sm">
                Monix is built for the terminal. Precisely engineered for DevOps
                and Security Analysts who require raw, unfiltered intelligence
                directly from the kernel.
              </p>
              <div className="space-y-4">
                {[
                  { cmd: "monix --monitor", desc: "SYSTEM_SNAPSHOT_REALTIME" },
                  { cmd: "monix --watch", desc: "INTERACTIVE_WATCH_MODE" },
                  { cmd: "monix --scan", desc: "AUTONOMOUS_THREAT_SCAN" },
                  { cmd: "monix-web <url>", desc: "INSTANT_WEB_ANALYSIS" },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-l border-white/20 pl-6 py-2">
                    <code className="text-sm font-bold text-white">{item.cmd}</code>
                    <span className="text-[10px] text-white/40 font-bold tracking-widest">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/10 bg-black p-6 font-mono text-[11px] leading-tight overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                <span className="text-white/40 tracking-widest">WATCH_MODE_v2.0</span>
                <span className="text-white/40 tracking-widest">LIVE_STREAM</span>
              </div>
              <pre className="text-white/80 whitespace-pre">
{`[STATE]      [REMOTE_TARGET]         [LOCAL_PORT]    [PROCESS]
ESTABLISHED  185.199.108.153:443     :54321          nginx
ESTABLISHED  142.250.190.46:443      :54322          node
LISTEN       0.0.0.0:80              :80             nginx
LISTEN       0.0.0.0:22              :22             sshd
SYN_RECV     45.33.32.156:59321      :443            [THREAT]

[ALERTS]
! 00:15:02 | SYN_FLOOD_DETECTED | 45.33.32.156
! 00:14:58 | PORT_SCAN_REJECTED | 192.168.1.10
- 00:14:10 | SYSTEM_HEALTH_OK   | CPU: 12%

[GEO_INTEL]
45.33.32.156 -> [USA] | LINODE_AKAMAI | NEW_JERSEY
142.250.190.46 -> [USA] | GOOGLE_CLOUD | CALIFORNIA`}
              </pre>
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
            SYSTEM_CAPABILITIES
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "INTEL_ENGINE",
              items: ["TCP_STATE_ANALYSIS", "GEOIP_RESOLUTION", "REVERSE_DNS", "PROCESS_MAPPING"]
            },
            {
              title: "THREAT_MATRIX",
              items: ["SYN_FLOOD_DEFENSE", "PORT_SCAN_ID", "IP_EXHAUSTION", "BOTNET_PATTERNS"]
            },
            {
              title: "CORE_KERNEL",
              items: ["EBPF_SUPPORT", "PROC_NET_PARSING", "LINUX_MAC_COMPAT"]
            }
          ].map((section, i) => (
            <div key={i} className="border border-white/10 p-8 hover:border-white transition-colors">
              <h3 className="text-sm font-black tracking-widest mb-6 uppercase border-b border-white/10 pb-4">
                [{section.title}]
              </h3>
              <ul className="space-y-3">
                {section.items.map((item, j) => (
                  <li key={j} className="text-[11px] text-white/60 font-bold tracking-widest flex items-center gap-2">
                    <span className="text-white/20">{" >> "}</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 bg-white/[0.01]">
        <div className="container mx-auto px-6 max-w-[1600px]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-black tracking-tighter">MONIX</span>
              <span className="text-[10px] text-white/40 tracking-[0.4em]">
                OPEN_SOURCE_SERVER_SECURITY
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-12">
              {[
                { label: "GITHUB", href: "https://github.com/dinexh/monix" },
                { label: "DOCS", href: "/docs" },
                { label: "WEB_TOOL", href: "/web" },
              ].map((link, i) => (
                <a 
                  key={i} 
                  href={link.href} 
                  className="text-[11px] font-black tracking-widest hover:text-white/60 transition-colors uppercase underline underline-offset-4"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 text-center md:text-right">
              DONE BY <a href="#" className="text-white hover:underline uppercase">dineshkorukonda</a>
            </div>
          </div>
          <div className="mt-16 text-center text-[10px] text-white/20 tracking-widest">
            (C) 2025 MONIX. SHUTDOWN: NEVER.
          </div>
        </div>
      </footer>
    </div>
  );
}
