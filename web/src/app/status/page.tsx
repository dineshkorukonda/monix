"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Globe,
  Radio,
  Search,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function StatusDirectoryPage() {
  const router = useRouter();
  const [siteQuery, setSiteQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = siteQuery
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    if (!query) return;
    router.push(`/status/${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-20 space-y-12">
        {/* Header */}
        <header className="border-b border-border pb-6 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#00ff66] animate-pulse" />
            <span className="font-mono text-xs text-[#00ff66] uppercase tracking-widest">
              MONIX :: LIVE STATUS DIRECTORY
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
            Uptime Monitoring &amp; Status Pages
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            Real-time heartbeat diagnostics, automated incident detection,
            24-hour latency tracking, and TLS certificate expiry tracking.
          </p>
        </header>

        {/* Site Lookup Bar */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">
            Check a Public Status Page
          </h2>
          <p className="text-xs text-muted-foreground font-mono">
            Enter a domain or status slug to view its operational health and
            30-day incident log:
          </p>

          <form onSubmit={handleSearch} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch border border-border bg-[#0d0d0f] rounded focus-within:border-[#00ff66] transition-colors">
              <div className="flex items-center pl-4 pr-1 text-muted-foreground font-mono text-xs select-none">
                <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                SITE:
              </div>
              <input
                type="text"
                value={siteQuery}
                onChange={(e) => setSiteQuery(e.target.value)}
                placeholder="example.com or status-slug"
                className="flex-1 px-3 py-3.5 bg-transparent text-white placeholder:text-muted-foreground focus:outline-none text-sm font-mono"
              />
              <button
                type="submit"
                disabled={!siteQuery.trim()}
                className="px-6 py-3.5 bg-[#00ff66] text-black font-semibold text-xs font-mono uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed rounded-r"
              >
                View Status <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </section>

        {/* Core Monitoring Features */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white border-b border-border/80 pb-2">
            Automated Monitoring Engine
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Feature 1 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2.5">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Activity className="w-4 h-4 text-[#00ff66]" />
                <span>5-Minute Heartbeat Pings</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Automated workers ping registered targets every 5 minutes via
                cron, logging response latency, HTTP response codes, and status
                telemetry.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2.5">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-[#ffcc00]" />
                <span>2-Failure Incident Threshold</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prevents false alarms by requiring 2 consecutive failed checks
                before declaring downtime and opening an incident record.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2.5">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-[#00ff66]" />
                <span>Daily TLS Certificate Watch</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Nightly cron inspects SSL/TLS certificates across all HTTPS
                endpoints, tracking expiration dates and alerting 14 days in
                advance.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="border border-border bg-[#0d0d0f] p-5 rounded space-y-2.5">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Radio className="w-4 h-4 text-[#00ff66]" />
                <span>Real-Time Webhook Alerting</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dispatches JSON payloads immediately to your custom webhook
                endpoint on{" "}
                <code className="text-[#00ff66] font-mono text-[11px]">
                  incident.started
                </code>
                ,{" "}
                <code className="text-[#00ff66] font-mono text-[11px]">
                  incident.resolved
                </code>
                , and{" "}
                <code className="text-[#00ff66] font-mono text-[11px]">
                  certificate.expiry_warning
                </code>
                .
              </p>
            </div>
          </div>
        </section>

        {/* How to Enable Status Pages */}
        <section className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-white font-semibold">
              [SETUP] Enabling a Public Status Page
            </span>
            <span className="text-[#00ff66]">REST API</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Public status pages can be activated on any monitored target by
            updating its settings:
          </p>
          <div className="p-3.5 bg-black border border-border rounded overflow-x-auto">
            <pre className="text-white">{`PATCH /api/targets/<target-id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "public_status_page": true,
  "status_slug": "my-api",
  "webhook_url": "https://alerts.mycompany.com/webhook"
}`}</pre>
          </div>
          <p className="text-muted-foreground text-[11px]">
            Once enabled, your status page will be publicly viewable at{" "}
            <code className="text-[#00ff66]">/status/my-api</code> without
            requiring authentication.
          </p>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/inspector"
            className="flex items-center justify-between p-4 border border-border bg-[#0d0d0f] hover:border-[#00ff66] transition-colors rounded group"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white group-hover:text-[#00ff66] transition-colors flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" /> Website Inspector
              </span>
              <p className="text-[11px] text-muted-foreground">
                Run security header, SEO &amp; Core Web Vitals audit
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00ff66] transition-colors" />
          </Link>

          <Link
            href="/docs/webhooks"
            className="flex items-center justify-between p-4 border border-border bg-[#0d0d0f] hover:border-[#00ff66] transition-colors rounded group"
          >
            <div className="space-y-1">
              <span className="text-xs font-semibold text-white group-hover:text-[#00ff66] transition-colors flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" /> Webhooks Reference
              </span>
              <p className="text-[11px] text-muted-foreground">
                Webhook schemas, event payloads &amp; retry policy
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-[#00ff66] transition-colors" />
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
