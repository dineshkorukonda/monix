import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-20 space-y-12">
        {/* Header */}
        <header className="border-b border-border pb-6 space-y-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            monix
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Fast, zero-auth website reconnaissance, security header auditor
            &amp; SEO directive inspector.
          </p>
        </header>

        {/* What is it? Section */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            What is it?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            <strong className="text-white">monix</strong> is an open website
            intelligence inspector. It analyzes any public URL across three
            diagnostic lenses in parallel: TLS certificate chain &amp; security
            headers (HSTS, CSP, X-Frame-Options), SEO directives (robots.txt,
            XML sitemap, Open Graph), and Core Web Vitals performance signals.
          </p>
          <div className="pt-2">
            <Link
              href="/inspector"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00ff66] text-black font-semibold text-xs font-mono uppercase tracking-wider rounded hover:opacity-90 transition-opacity"
            >
              Launch Inspector <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Diagnostic Features */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Diagnostic Features
          </h2>
          <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
            <li>
              <strong className="text-white">TLS Security Posture</strong> —
              Certificate chain verification, expiration alerts, and issuer
              telemetry.
            </li>
            <li>
              <strong className="text-white">Strict Security Headers</strong> —
              HSTS, Content-Security-Policy (CSP), X-Frame-Options,
              X-Content-Type-Options.
            </li>
            <li>
              <strong className="text-white">SEO Directives</strong> — Meta
              title/description analysis, Open Graph preview tags, robots.txt,
              XML sitemaps.
            </li>
            <li>
              <strong className="text-white">Core Web Vitals</strong> — Largest
              Contentful Paint (LCP), Cumulative Layout Shift (CLS), Total
              Blocking Time.
            </li>
            <li>
              <strong className="text-white">
                Shareable Inspection Artifacts
              </strong>{" "}
              — Permanent reports generated at{" "}
              <code className="text-[#00ff66] font-mono text-xs">
                /r/[slug]
              </code>{" "}
              with zero login wall.
            </li>
            <li>
              <strong className="text-white">Rate-Limited &amp; Free</strong> —
              Sliding window rate limiter (5 scans/hour/IP) prevents API abuse.
            </li>
          </ul>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            FAQ
          </h2>

          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <strong className="text-white block">
                Q: Is any authentication or API key required to inspect a
                website?
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                No. Monix is completely unauthenticated. Anyone can open the
                Inspector, enter any public URL, and instantly generate a
                diagnostic report.
              </p>
            </div>

            <div className="space-y-1">
              <strong className="text-white block">
                Q: How does rate limiting work?
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                Public requests are capped at 5 scans per hour per client IP
                using a sliding window in PostgreSQL to prevent spam and protect
                infrastructure.
              </p>
            </div>

            <div className="space-y-1">
              <strong className="text-white block">
                Q: Are the inspection reports permanent?
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                Yes. Every completed scan generates a 12-character unique slug
                (e.g.{" "}
                <code className="text-[#00ff66] font-mono text-xs">
                  /r/a1b2c3d4e5f6
                </code>
                ) that you can bookmark, share, or revisit anytime.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
