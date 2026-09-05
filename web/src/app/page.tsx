import {
  Activity,
  ArrowRight,
  Globe,
  Radio,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
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
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse" />
            <span className="font-mono text-xs text-[#00ff66] uppercase tracking-widest">
              MONIX :: OPEN DIAGNOSTIC PLATFORM
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Website Reconnaissance &amp; Continuous Health Monitoring
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            Instant security header audits, TLS verification, SEO crawl
            directive analysis, subdomain discovery, scheduled 5-minute uptime
            checks (GitHub Actions), and webhook alerting for registered
            targets.
          </p>
          <div className="pt-3 flex flex-wrap items-center gap-3">
            <Link
              href="/inspector"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00ff66] text-black font-semibold text-xs font-mono uppercase tracking-wider rounded hover:opacity-90 transition-opacity"
            >
              Launch Inspector <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/status"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-border bg-[#0d0d0f] text-white hover:border-[#00ff66] hover:text-[#00ff66] font-semibold text-xs font-mono uppercase tracking-wider rounded transition-colors"
            >
              <Activity className="w-3.5 h-3.5" /> Status Directory
            </Link>
          </div>
        </header>

        {/* Feature Grid Section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Comprehensive Platform Capabilities
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#00ff66]" />
                <span>Security Headers &amp; TLS Chain</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Strict audit of HSTS, CSP, X-Frame-Options,
                X-Content-Type-Options, Referrer-Policy, plus certificate issuer
                and expiry telemetry.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Globe className="w-4 h-4 text-[#00ff66]" />
                <span>Native Subdomain Enumeration</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Passive Certificate Transparency log lookup via crt.sh, wildcard
                DNS filtering, and active HTTP status &amp; IP probing.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Activity className="w-4 h-4 text-[#00ff66]" />
                <span>Continuous Uptime Monitoring</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Registered targets are pinged every 5 minutes by a GitHub
                Actions workflow calling{" "}
                <code className="text-[#00ff66]">/api/cron/uptime</code>.
                Incidents open after 2 consecutive failures; 24h and 30d uptime
                come from stored check history.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Radio className="w-4 h-4 text-[#00ff66]" />
                <span>Public Status Pages</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Custom status portals at{" "}
                <code className="text-[#00ff66]">/status/[site]</code> with
                24-hour response time latency charts and 30-day incident logs.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Zap className="w-4 h-4 text-[#00ff66]" />
                <span>Certificate Expiry Alerts</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nightly TLS certificate verification with customizable 14-day
                advance expiration warnings dispatched via webhooks.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Terminal className="w-4 h-4 text-[#00ff66]" />
                <span>Real-Time Webhook Alerting</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dispatches JSON event payloads for{" "}
                <code className="text-[#00ff66]">incident.started</code>,{" "}
                <code className="text-[#00ff66]">incident.resolved</code>, and
                cert warnings with 1x auto-retry.
              </p>
            </div>
          </div>
        </section>

        {/* Detailed Feature List */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Inspection Pipeline Highlights
          </h2>
          <ul className="space-y-2 list-disc list-inside text-sm text-muted-foreground">
            <li>
              <strong className="text-white">Zero Authentication Wall</strong> —
              Instant scans from the Inspector. No sign-in or account required.
            </li>
            <li>
              <strong className="text-white">Permanent Public Artifacts</strong>{" "}
              — Every scan produces a shareable report at{" "}
              <code className="text-[#00ff66] font-mono text-xs">
                /r/[slug]
              </code>
              .
            </li>
            <li>
              <strong className="text-white">
                SEO &amp; Discoverability Checks
              </strong>{" "}
              — Meta tags, Open Graph preview tags, robots.txt, XML sitemap
              verification.
            </li>
            <li>
              <strong className="text-white">Core Web Vitals</strong> — Largest
              Contentful Paint (LCP), Cumulative Layout Shift (CLS), and lab
              metrics.
            </li>
            <li>
              <strong className="text-white">
                Rate-Limited &amp; Protected
              </strong>{" "}
              — Sliding window rate limiter (5 scans/hour/IP) preventing abuse.
            </li>
          </ul>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4 text-sm">
            <div className="space-y-1">
              <strong className="text-white block">
                Q: Is any authentication required to inspect a website?
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                No. Monix is completely unauthenticated for public inspections.
                Anyone can open the Inspector, enter any public URL, and
                instantly generate a diagnostic report.
              </p>
            </div>

            <div className="space-y-1">
              <strong className="text-white block">
                Q: How does the uptime monitoring worker operate?
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                Uptime checks run every 5 minutes via the GitHub Actions
                workflow at{" "}
                <code className="text-[#00ff66] font-mono text-xs">
                  .github/workflows/uptime-cron.yml
                </code>
                , which POSTs to{" "}
                <code className="text-[#00ff66] font-mono text-xs">
                  /api/cron/uptime
                </code>
                . An incident opens after 2 consecutive failed checks and closes
                automatically when the target recovers.
              </p>
            </div>

            <div className="space-y-1">
              <strong className="text-white block">
                Q: How do I view or configure public status pages?
              </strong>
              <p className="text-muted-foreground leading-relaxed">
                You can view public status pages at{" "}
                <code className="text-[#00ff66]">/status/[site]</code> or search
                them in the{" "}
                <Link href="/status" className="text-[#00ff66] hover:underline">
                  Status Directory
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
