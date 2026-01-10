"use client";

import Navigation from "@/components/Navigation";
import Link from "next/link";

export default function DocsPage() {
  const sections = [
    {
      id: "overview",
      title: "OVERVIEW",
      content: "MONIX IS A LIGHTWEIGHT, REAL-TIME NETWORK MONITORING AND THREAT DETECTION SYSTEM DESIGNED FOR LINUX SERVERS. IT HOOKS DIRECTLY INTO KERNEL INTERFACES OR SYSTEM APIS TO TRACK EVERY ACTIVE CONNECTION, IDENTIFY MALICIOUS PATTERNS, AND PROVIDE INSTANT VISIBILITY INTO YOUR INFRASTRUCTURE'S NETWORK ACTIVITY."
    },
    {
      id: "installation",
      title: "INSTALLATION",
      steps: [
        { title: "CLONE_REPOSITORY", cmd: "git clone https://github.com/dinexh/monix.git\ncd monix" },
        { title: "INSTALL_DEPENDENCIES", cmd: "pip install -e .", note: "ROOT_ACCESS_REQUIRED_FOR_FULL_VISIBILITY" },
        { title: "INITIALIZE_CORE", cmd: "monix --monitor" }
      ]
    },
    {
      id: "cli_commands",
      title: "CLI_COMMANDS",
      commands: [
        { cmd: "monix --monitor", desc: "SYSTEM_SNAPSHOT_STATISTICS" },
        { cmd: "monix --watch", desc: "LIVE_INTERACTIVE_DASHBOARD" },
        { cmd: "monix --scan", desc: "SECURITY_ANALYSIS_SCAN" },
        { cmd: "monix --alerts", desc: "LIST_SECURITY_NOTIFICATIONS" },
        { cmd: "monix --status", desc: "ONE_LINE_HEALTH_CHECK" },
        { cmd: "monix-web <url>", desc: "INSTANT_WEB_SECURITY_SCAN" }
      ]
    },
    {
      id: "threat_detection",
      title: "THREAT_DETECTION",
      threats: [
        { name: "SYN_FLOOD", desc: "DETECTS_ABNORMAL_HALF_OPEN_CONNECTIONS" },
        { name: "PORT_SCAN", desc: "IDENTIFIES_RAPID_PORT_PROBING" },
        { name: "HIGH_CONN", desc: "MONITORS_CONNECTION_EXHAUSTION_PATTERNS" }
      ]
    }
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
                DOCUMENTATION
              </h1>
              <p className="text-white/60 text-lg leading-relaxed uppercase">
                COMPREHENSIVE GUIDE TO MONIX CORE AND CLI TOOLS.
              </p>
            </div>

            <div className="space-y-32">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-32">
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
                            <span className="text-white/40">[{i+1}]</span> {step.title}
                          </h3>
                          <pre className="bg-white/5 border border-white/10 p-6 text-[11px] overflow-x-auto text-white/80">
                            <code>{step.cmd}</code>
                          </pre>
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
                        <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-white/5 p-6 bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
                          <code className="text-sm font-bold text-white">{cmd.cmd}</code>
                          <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">
                            {cmd.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.threats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.threats.map((threat, i) => (
                        <div key={i} className="border border-white/10 p-6 bg-black">
                          <h3 className="text-sm font-black tracking-widest mb-3 uppercase">
                            [{threat.name}]
                          </h3>
                          <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">
                            {threat.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-32 pt-20 border-t border-white/10 flex flex-col items-center gap-8">
              <h2 className="text-3xl font-black tracking-tighter uppercase">READY_TO_DEPLOY?</h2>
              <div className="flex gap-8">
                <a 
                  href="https://github.com/dinexh/monix" 
                  className="bg-white text-black px-10 py-4 text-xs font-black uppercase tracking-widest hover:bg-white/80 transition-all"
                >
                  GET_STARTED_ON_GITHUB
                </a>
              </div>
            </div>
          </main>
        </div>
      </div>

      <footer className="border-t border-white/10 py-12 mt-20">
        <div className="container mx-auto px-6 max-w-[1600px] flex justify-between items-center text-[10px] text-white/20 font-bold tracking-[0.2em] uppercase">
          <span>(C) 2025 MONIX_CORE</span>
          <span>DONE BY <a href="#" className="text-white/40 hover:text-white transition-all">dineshkorukonda</a></span>
        </div>
      </footer>
    </div>
  );
}
