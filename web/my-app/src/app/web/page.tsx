"use client";

import UrlAnalyzer from "@/components/UrlAnalyzer";
import Navigation from "@/components/Navigation";

/**
 * Monix Web - URL Security Analyzer
 *
 * This page hosts the redesigned URL security analysis tool.
 * High-density, icon-free, monochromatic interface.
 */
export default function MonixWebPage() {
  return (
    <div className="bg-black min-h-screen">
      <Navigation />
      <div className="py-8">
        <div className="container mx-auto px-6 max-w-[1600px] mb-12">
          <div className="text-[10px] font-bold text-white/40 tracking-[0.4em] mb-4 uppercase">
            [TOOL_ACCESS_01]
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-4">
            MONIX_WEB_ANALYZER
          </h1>
          <p className="text-white/40 text-sm font-bold tracking-widest uppercase">
            V2.0_SECURITY_SCANNER_CONNECTED
          </p>
        </div>
        <UrlAnalyzer />
      </div>
      
      {/* Mini Footer */}
      <footer className="border-t border-white/10 py-12 bg-black">
        <div className="container mx-auto px-6 max-w-[1600px] flex justify-between items-center">
          <span className="text-[10px] text-white/20 font-bold tracking-widest uppercase">
            (C) 2025 MONIX_SECURITY
          </span>
          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase">
            DONE BY <a href="#" className="text-white hover:underline transition-all">dineshkorukonda</a>
          </span>
        </div>
      </footer>
    </div>
  );
}
