"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Radio, Zap } from "lucide-react";
import Link from "next/link";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function WebhooksDocPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono text-xs selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-28 pb-20 space-y-8">
        {/* Header */}
        <div className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00ff66] animate-pulse" />
            <span className="text-[#00ff66] uppercase tracking-widest text-[11px] font-semibold">
              MONIX :: WEBHOOK ALERT REFERENCE
            </span>
          </div>
          <h1 className="text-2xl font-bold font-sans text-white">
            Webhook Alerts &amp; Event Notifications
          </h1>
          <p className="text-muted-foreground leading-relaxed text-sm font-sans">
            Monix dispatches real-time HTTPS POST JSON webhooks to your alerting
            endpoints (Slack webhooks, Discord, PagerDuty, or custom backend
            services) whenever a monitored site enters downtime, recovers, or
            approaches TLS certificate expiration.
          </p>
        </div>

        {/* Configuration */}
        <div className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white">
            Configuring a Target Webhook
          </h2>
          <p className="text-muted-foreground">
            Set your alerting URL via the REST API for any registered target:
          </p>
          <div className="p-4 bg-black border border-border rounded overflow-x-auto">
            <pre className="text-white">{`PATCH /api/targets/<target-id>
Authorization: Bearer <token>
Content-Type: application/json

{
  "webhook_url": "https://api.yourdomain.com/webhooks/monix",
  "cert_warning_days": 14
}`}</pre>
          </div>
        </div>

        {/* Event Payloads */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white border-b border-border pb-2">
            Event Schemas &amp; Payloads
          </h2>

          {/* Event 1: incident.started */}
          <div className="border border-border bg-[#0d0d0f] rounded overflow-hidden">
            <div className="border-b border-border bg-[#18181b] px-4 py-2.5 flex items-center justify-between">
              <span className="text-destructive font-semibold flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5" /> incident.started
              </span>
              <span className="text-muted-foreground text-[10px]">
                Fired on 2 consecutive check failures
              </span>
            </div>
            <div className="p-4 bg-black overflow-x-auto text-[11px]">
              <pre className="text-muted-foreground">
                {JSON.stringify(
                  {
                    event: "incident.started",
                    target_id: "7b4c9e82-1234-4567-89ab-cdef01234567",
                    url: "https://api.example.com/health",
                    incident_id: "9f8e7d6c-5432-1098-ba98-fedcba098765",
                    started_at: "2026-08-24T12:00:00.000Z",
                    status_code: 503,
                    cause: "HTTP 503 Service Unavailable",
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>

          {/* Event 2: incident.resolved */}
          <div className="border border-border bg-[#0d0d0f] rounded overflow-hidden">
            <div className="border-b border-border bg-[#18181b] px-4 py-2.5 flex items-center justify-between">
              <span className="text-[#00ff66] font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> incident.resolved
              </span>
              <span className="text-muted-foreground text-[10px]">
                Fired when downed site returns 2xx/3xx
              </span>
            </div>
            <div className="p-4 bg-black overflow-x-auto text-[11px]">
              <pre className="text-muted-foreground">
                {JSON.stringify(
                  {
                    event: "incident.resolved",
                    target_id: "7b4c9e82-1234-4567-89ab-cdef01234567",
                    url: "https://api.example.com/health",
                    incident_id: "9f8e7d6c-5432-1098-ba98-fedcba098765",
                    started_at: "2026-08-24T12:00:00.000Z",
                    ended_at: "2026-08-24T12:15:00.000Z",
                    duration_seconds: 900,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>

          {/* Event 3: certificate.expiry_warning */}
          <div className="border border-border bg-[#0d0d0f] rounded overflow-hidden">
            <div className="border-b border-border bg-[#18181b] px-4 py-2.5 flex items-center justify-between">
              <span className="text-[#ffcc00] font-semibold flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> certificate.expiry_warning
              </span>
              <span className="text-muted-foreground text-[10px]">
                Fired nightly when cert days &lt;= threshold
              </span>
            </div>
            <div className="p-4 bg-black overflow-x-auto text-[11px]">
              <pre className="text-muted-foreground">
                {JSON.stringify(
                  {
                    event: "certificate.expiry_warning",
                    target_id: "7b4c9e82-1234-4567-89ab-cdef01234567",
                    url: "https://api.example.com",
                    certificate_expiry_at: "2026-09-02T00:00:00.000Z",
                    days_remaining: 9,
                    cert_issuer: "Let's Encrypt Authority X3",
                    cert_warning_days: 14,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
        </div>

        {/* Retry & Timeout Policy */}
        <div className="border border-border bg-[#0d0d0f] p-6 rounded space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-white">
            Delivery &amp; Retry Guarantee
          </h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              • <strong className="text-white">Timeout</strong>: 5 seconds per
              HTTP request.
            </li>
            <li>
              • <strong className="text-white">Retry Policy</strong>: Automatic
              1x retry on non-2xx response code or network connection error.
            </li>
            <li>
              • <strong className="text-white">User-Agent</strong>:{" "}
              <code className="text-[#00ff66]">Monix-Webhook/1.0</code>
            </li>
            <li>
              • <strong className="text-white">Content-Type</strong>:{" "}
              <code className="text-[#00ff66]">application/json</code>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div className="pt-2 flex items-center justify-between">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Documentation
          </Link>
          <Link
            href="/inspector"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#00ff66] text-black font-semibold rounded hover:opacity-90 transition-opacity"
          >
            Open Inspector
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
