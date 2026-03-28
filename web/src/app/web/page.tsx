"use client";

import { Suspense } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import UrlAnalyzer from "@/components/UrlAnalyzer";

export default function PublicScannerPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      <Navigation />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-36">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Security Scanner
          </h1>
          <p className="text-white/50 text-lg max-w-2xl">
            Run a deep-dive security analysis on any public domain. Monix will
            evaluate TLS, DNS, headers, and infrastructure exposure in
            real-time.
          </p>
        </div>

        <Suspense
          fallback={
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 flex flex-col items-center justify-center text-center">
              <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4" />
              <p className="text-white/40 text-sm">
                Initializing analysis engine...
              </p>
            </div>
          }
        >
          <UrlAnalyzer />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
