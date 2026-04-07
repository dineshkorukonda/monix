import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Hero } from "./_components/hero";
import {
  PillarsSection,
  GscSection,
  CloudflareSection,
  WorkflowSection,
  CtaSection,
} from "./_components/animated-sections";
import { MapSection } from "./_components/map-section";

export const metadata: Metadata = {
  title: "Monix — Security, SEO & Performance Analysis",
  description:
    "Category scores for security, SEO, and performance in one workspace. Persisted reports, monitored sites, and optional Google Search Console and Cloudflare integrations.",
  openGraph: {
    title: "Monix — Website Intelligence",
    description: "One URL. Three lenses. Zero guesswork.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monix — Website Intelligence",
    description: "One URL. Three lenses. Zero guesswork.",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-sans">
      <Navigation />

      <main className="relative">
        <Hero />

        {/* Facts — static server-rendered section */}
        <section className="border-y border-white/10 bg-zinc-950/40 px-6 py-16 md:py-20">
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                kicker: "Scoring",
                line: "Category weights roll up into one overall score you can track.",
              },
              {
                kicker: "Reports",
                line: "Persisted output you can reopen and share when you need it.",
              },
              {
                kicker: "Workspace",
                line: "Projects, targets, and scan history after you authenticate.",
              },
              {
                kicker: "Search & edge",
                line: "Optional Search Console for clicks and queries; optional Cloudflare for edge requests and threats when zones match your sites.",
              },
            ].map((block) => (
              <div
                key={block.kicker}
                className="border border-white/10 bg-black/30 px-6 py-8"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/35">
                  {block.kicker}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/60 md:text-[15px]">
                  {block.line}
                </p>
              </div>
            ))}
          </div>
        </section>

        <PillarsSection />
        <GscSection />
        <CloudflareSection />
        <MapSection />
        <WorkflowSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
