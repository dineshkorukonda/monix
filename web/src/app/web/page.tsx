"use client";

import Navigation from "@/components/Navigation";
import UrlAnalyzer from "@/components/UrlAnalyzer";
import Footer from "@/components/Footer";

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
            Run a deep-dive security analysis on any public domain. Monix will evaluate 
            TLS, DNS, headers, and infrastructure exposure in real-time.
          </p>
        </div>
        
        <UrlAnalyzer />
      </main>
      
      <Footer />
    </div>
  );
}
