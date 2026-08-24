"use client";

import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";

export default function WebhooksDocPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono text-xs">
      <Navigation />
      <main className="flex-1 max-w-3l mx-auto w-full px-6 pt-32 pb-20 space-y-6">
        <div className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <h1 className="text-xl font-bold font-sans text-foreground">
            Generic Webhook Alerting
          </h1>
          <p className="text-muted-foreground">
            Monix dispatches real-time JSON webhooks to your custom endpoint on
            downtime incidents and SSL certificate warnings.
          </p>
        </div>

        <div className="border border-border bg-[#0d0d0f]p-6 rounded space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Supported Events
          </h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>
              <code className="text-[00ff66]">incident.started</code> -
              Dispatched when 2 consecutive uptime checks fail
            </li>
            <li>
              <code className="text-[00ff66]">incident.resolved</code> -
              Dispatched when a previously down site recovers
            </li>
            <li>
              <code className="text-[00ff66]">certificate.expiry_warning</code>{" "}
              - Dispatched when TLS cert expires within warning threshold
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
