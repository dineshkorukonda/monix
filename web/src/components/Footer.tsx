"use client";

import { Shield, Terminal } from "lucide-react";
import Link from "next/link";

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-zinc-850 bg-[#050507] text-zinc-400 font-mono text-xs">
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
        {/* Main Simple Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Brand & Status */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#00ff66]/10 border border-[#00ff66]/40 text-[#00ff66]">
                <Terminal className="w-3.5 h-3.5" />
              </span>
              <span className="font-mono text-sm font-bold tracking-wider text-white">
                monix<span className="text-[#00ff66]">.io</span>
              </span>
            </Link>

            <span className="px-2 py-0.5 rounded bg-zinc-900 text-[10px] text-zinc-300 border border-zinc-750 font-semibold">
              v1.0.0
            </span>

            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 pl-1 border-l border-zinc-800">
              <span className="w-2 h-2 rounded-full bg-zinc-600" />
              <span>Open diagnostic platform</span>
            </div>
          </div>

          {/* Clean Navigation Links */}
          <nav className="flex flex-wrap items-center gap-4 sm:gap-5 text-xs">
            <Link href="/" className="hover:text-[#00ff66] transition-colors">
              Home
            </Link>
            <Link
              href="/inspector"
              className="hover:text-[#00ff66] transition-colors"
            >
              Inspector
            </Link>
            <Link
              href="/status"
              className="hover:text-[#00ff66] transition-colors"
            >
              Status
            </Link>
            <Link
              href="/private-sites"
              className="hover:text-[#00ff66] transition-colors flex items-center gap-1"
            >
              <span>Radar</span>
              <span className="px-1 py-0.2 text-[8px] bg-[#00ff66]/20 text-[#00ff66] rounded font-bold">
                FLEET
              </span>
            </Link>
            <Link
              href="/docs"
              className="hover:text-[#00ff66] transition-colors"
            >
              Docs
            </Link>
            <a
              href="https://github.com/dineshkorukonda/monix"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center gap-1 text-zinc-300"
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </nav>
        </div>

        {/* Minimal Bottom Bar */}
        <div className="border-t border-zinc-900 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500">
          <div className="flex items-center gap-2">
            <span>Built by</span>
            <a
              href="https://dineshkorukonda.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-200 hover:text-[#00ff66] transition-colors font-semibold"
            >
              Dinesh Korukonda
            </a>
            <span>&bull;</span>
            <span>&copy; {new Date().getFullYear()} Monix</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-zinc-400">
              <Shield className="w-3 h-3 text-[#00ff66]" />
              <span>Zero-Auth Platform</span>
            </span>
            <span>&bull;</span>
            <span>Next.js + Bun</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
