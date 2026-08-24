import * as tls from "node:tls";
import { queryRows } from "@/server/db/postgres";

export interface CertificateInfo {
  valid: boolean;
  expiryAt: Date | null;
  issuer: string | null;
  daysRemaining: number | null;
  isWarning: boolean;
  error?: string;
}

export function extractHostname(url: string): string {
  const cleaned = url.replace(/^https?:\/\//, "").split("/")[0] ?? url;
  return cleaned.split(":")[0];
}

export async function checkCertificateExpiry(
  hostName: string,
  port = 443,
  warningDays = 14,
  timeoutMs_opt = 5000,
): Promise<CertificateInfo> {
  return new Promise((resolve) => {
    const host = extractHostname(hostName);
    const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":");
    let isResolved = false;

    let socket: tls.TLSSocket;
    try {
      socket = tls.connect(
        {
          host,
          port,
          servername: isIp ? undefined : host,
          rejectUnauthorized: false,
        },
        () => {
          if (isResolved) return;
          isResolved = true;
          const cert = socket.getPeerCertificate();
          socket.destroy();

          if (!cert || !cert.valid_to) {
            resolve({
              valid: false,
              expiryAt: null,
              issuer: null,
              daysRemaining: null,
              isWarning: false,
              error: "No certificate found",
            });
            return;
          }

          const expiryAt = new Date(cert.valid_to);
          const now = new Date();
          const msRemaining = expiryAt.getTime() - now.getTime();
          const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
          const isWarning = daysRemaining <= warningDays;
          const issuer =
            typeof cert.issuer === "object"
              ? cert.issuer.O || cert.issuer.CN || "Unknown"
              : String(cert.issuer || "Unknown");

          resolve({
            valid: daysRemaining > 0,
            expiryAt,
            issuer,
            daysRemaining,
            isWarning,
          });
        },
      );

      socket.setTimeout(timeoutMs_opt);
      socket.on("timeout", () => {
        if (isResolved) return;
        isResolved = true;
        socket.destroy();
        resolve({
          valid: false,
          expiryAt: null,
          issuer: null,
          daysRemaining: null,
          isWarning: false,
          error: "Connection timed out",
        });
      });

      socket.on("error", (err) => {
        if (isResolved) return;
        isResolved = true;
        socket.destroy();
        resolve({
          valid: false,
          expiryAt: null,
          issuer: null,
          daysRemaining: null,
          isWarning: false,
          error: err.message || "TLS connection failed",
        });
      });
    } catch (err: unknown) {
      resolve({
        valid: false,
        expiryAt: null,
        issuer: null,
        daysRemaining: null,
        isWarning: false,
        error: (err as Error)?.message || "TLS connection failed",
      });
    }
  });
}

export async function runCertificateExpiryChecks(dbQueryRows = queryRows) {
  const sites = await dbQueryRows<{
    id: string;
    url: string;
    cert_warning_days: number;
    webhook_url: string | null;
  }>(`
    select id, url, coalesce(cert_warning_days, 14) as cert_warning_days, webhook_url
    from public.monix_targets
    where owner_id is not null
  `);

  const results = [];
  for (const site of sites) {
    const host = extractHostname(site.url);
    const cert = await checkCertificateExpiry(
      host,
      443,
      site.cert_warning_days,
    );

    if (cert.expiryAt) {
      await dbQueryRows(
        `
          update public.monix_targets
          set 
            certificate_expiry_at = $1,
            cert_issuer = $2
          where id = $3::uuid
        `,
        [cert.expiryAt.toISOString(), cert.issuer, site.id],
      );

      // Dispatch webhook for certificate warning if configured
      if (cert.isWarning && site.webhook_url) {
        const { dispatchWebhook } = await import(
          "@/server/alerts/webhook-dispatcher"
        );
        await dispatchWebhook(site.webhook_url, {
          event: "certificate.expiry_warning",
          site: { id: site.id, url: site.url },
          timestamp: new Date().toISOString(),
          details: {
            issuer: cert.issuer,
            expiryAt: cert.expiryAt.toISOString(),
            daysRemaining: cert.daysRemaining,
            warningDaysThreshold: site.cert_warning_days,
          },
        }).catch((err) => console.error("Webhook dispatch error:", err));
      }
    }

    results.push({
      siteId: site.id,
      host,
      cert,
    });
  }
  return results;
}
