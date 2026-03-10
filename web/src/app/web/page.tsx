"use client";

import Navigation from "@/components/Navigation";
import UrlAnalyzer from "@/components/UrlAnalyzer";

export default function MonixWebPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />

      <main className="px-6 py-8">
        <div className="mx-auto max-w-[1600px] pb-10">
          <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">
            [TOOL_ACCESS_01]
          </div>
          <h1 className="mt-4 text-4xl font-black uppercase tracking-[-0.05em]">
            MONIX_WEB_ANALYZER
          </h1>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-white/40">
            DETAILED_URL_SECURITY_WORKSPACE
          </p>
        </div>

        <div className="mx-auto max-w-[1600px]">
          <UrlAnalyzer />
        </div>
      </main>
    </div>
  );
}
