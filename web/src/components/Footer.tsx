"use client";

import {
  Activity,
  ArrowUpRight,
  Github,
  Globe,
  Shield,
  Terminal,
  Zap,
} from "lucide-react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-850 bg-[#050507] text-zinc-400 font-mono text-xs">
      {/* Top Banner Accent */}
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#00ff66]/30 to-transparent" />

      <div className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66]">
                <Terminal className="w-3.5 h-3.5" />
              </span>
              <span className="font-mono text-sm font-bold tracking-wider text-white">
                monix<span className="text-[#00ff66]">.io</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-400 border border-zinc-700/50">
                v2.4.0
              </span>
            </div>

            <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
              Open website diagnostics &amp; fleet uptime monitoring platform.
              Zero auth wall, instant security audits, SSL tracking, and public
              status pages.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="inline-block w-2 h-2 rounded-full bg-[#00ff66] animate-pulse" />
              <span className="text-zinc-300">
                All Monitoring Nodes Operational
              </span>
            </div>
          </div>

          {/* Links Column 1: Core Platform */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>Platform</span>
            </div>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="hover:text-[#00ff66] transition-colors flex items-center gap-1"
                >
                  <span>Home Scanner</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/inspector"
                  className="hover:text-[#00ff66] transition-colors"
                >
                  Security Inspector
                </Link>
              </li>
              <li>
                <Link
                  href="/status"
                  className="hover:text-[#00ff66] transition-colors"
                >
                  Public Status Directory
                </Link>
              </li>
              <li>
                <Link
                  href="/dk-sites"
                  className="hover:text-[#00ff66] text-zinc-300 transition-colors flex items-center gap-1"
                >
                  <span>Private Radar</span>
                  <span className="px-1.5 py-0.2 text-[9px] bg-[#00ff66]/20 text-[#00ff66] rounded font-bold">
                    DK
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 2: Resources & Docs */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>Resources</span>
            </div>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/docs"
                  className="hover:text-[#00ff66] transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/docs/webhooks"
                  className="hover:text-[#00ff66] transition-colors"
                >
                  Webhook Alerting
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="hover:text-[#00ff66] transition-colors"
                >
                  REST API &amp; CLI
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="hover:text-[#00ff66] transition-colors"
                >
                  SSL Tracking Guide
                </Link>
              </li>
            </ul>
          </div>

          {/* Links Column 3: Developer */}
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-zinc-200 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>Connect</span>
            </div>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/dineshkorukonda/monix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#00ff66] transition-colors flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub Repo</span>
                  <ArrowUpRight className="w-3 h-3 text-zinc-600" />
                </a>
              </li>
              <li>
                <a
                  href="https://dineshkorukonda.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00ff66] hover:underline transition-colors flex items-center gap-1.5"
                >
                  <span>dineshkorukonda.in</span>
                  <ArrowUpRight className="w-3 h-3 text-[#00ff66]" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-850 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Built by</span>
            <a
              href="https://dineshkorukonda.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-[#00ff66] transition-colors font-semibold"
            >
              Dinesh Korukonda
            </a>
            <span>•</span>
            <span>All rights reserved &copy; {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-500">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-[#00ff66]" />
              <span>Zero-Auth Platform</span>
            </span>
            <span>•</span>
            <span>Next.js 16 + Bun + Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
