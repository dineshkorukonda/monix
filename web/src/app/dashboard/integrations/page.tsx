"use client";

import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Info,
  Loader2,
  Plug,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CloudflareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.928 8.85c-.328-3.08-2.906-5.461-6.155-5.461-2.457 0-4.582 1.4-5.59 3.455C2.33 7.4.156 9.873.156 12.87c0 3.385 2.748 6.136 6.138 6.136h12.552c2.753 0 4.985-2.236 4.985-4.992 0-2.316-1.579-4.275-3.738-4.839-1.166 0-3.165-.325-3.165-.325z"
        fill="#F38020"
      />
    </svg>
  );
}

import {
  ApiError,
  type CloudflareStatus,
  getCloudflareStatus,
  getGscConnectAuthorizationUrl,
  getGscStatus,
  invalidateApiCache,
} from "@/lib/api";

interface GscStatus {
  connected: boolean;
}

function IntegrationCard({
  icon,
  iconBg,
  name,
  description,
  status,
  href,
  metrics,
  connectHref,
  onConnect,
  isConnecting,
}: {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
  status: "connected" | "disconnected" | "loading";
  href: string;
  metrics?: { label: string; value: string }[];
  connectHref?: string;
  onConnect?: () => void;
  isConnecting?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
          >
            {icon}
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {status === "loading" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
              Checking…
            </span>
          )}
          {status === "connected" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Connected
            </span>
          )}
          {status === "disconnected" && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              Not connected
            </span>
          )}
        </div>
      </div>

      {status === "connected" && metrics && metrics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-lg bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {m.label}
              </p>
              <p className="text-sm font-semibold text-foreground tabular-nums mt-0.5">
                {m.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mt-auto">
        {status === "connected" ? (
          <Button
            asChild
            size="sm"
            variant="outline"
            className="gap-1.5 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-colors"
          >
            <Link href={href}>
              Manage / Disconnect
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : onConnect ? (
          <Button
            size="sm"
            onClick={onConnect}
            disabled={isConnecting}
            className="bg-foreground hover:bg-foreground/90 text-background border-0 gap-1.5"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Connecting…
              </>
            ) : (
              <>
                Connect
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        ) : (
          <Button
            asChild
            size="sm"
            className="bg-foreground hover:bg-foreground/90 text-background border-0 gap-1.5"
          >
            <Link href={connectHref ?? href}>
              Connect
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

function ComingSoonCard({
  icon,
  iconBg,
  name,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  name: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-5 opacity-60 select-none">
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm">{name}</p>
            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Soon
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [gscStatus, setGscStatus] = useState<GscStatus | null>(null);
  const [cfStatus, setCfStatus] = useState<CloudflareStatus | null>(null);
  const [error, setError] = useState("");
  const [banner, setBanner] = useState<"gsc_connected" | "gsc_error" | null>(
    null,
  );
  const [isConnectingGsc, setIsConnectingGsc] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const gscParam = sp.get("gsc");
    if (gscParam === "connected") {
      setBanner("gsc_connected");
      invalidateApiCache("gsc:status");
      window.history.replaceState({}, "", "/dashboard/integrations");
    } else if (gscParam === "error") {
      setBanner("gsc_error");
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const [gsc, cf] = await Promise.allSettled([
          getGscStatus({ force: banner === "gsc_connected" }),
          getCloudflareStatus(),
        ]);
        if (gsc.status === "fulfilled") setGscStatus(gsc.value);
        if (cf.status === "fulfilled") setCfStatus(cf.value);
        else setCfStatus({ connected: false });
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403))
          return;
        setError("Failed to load integration status.");
      }
    })();
  }, [banner]);

  const handleConnectGsc = async () => {
    setIsConnectingGsc(true);
    try {
      const resp = await getGscConnectAuthorizationUrl();
      window.location.href = resp.authorization_url;
    } catch {
      setError("Failed to start Google Search Console connection.");
      setIsConnectingGsc(false);
    }
  };

  const gscLoading = gscStatus === null;
  const cfLoading = cfStatus === null;

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Integrations
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external services to enrich your Monix dashboard with traffic,
          SEO, and performance data.
        </p>
      </div>

      {banner === "gsc_connected" && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Google Search Console connected successfully.
        </div>
      )}

      {banner === "gsc_error" && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Google Search Console connection failed. Please try again.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Integration Instructions */}
      <div className="rounded-xl border border-border bg-accent/30 p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              How integrations work
            </h3>
            <ul className="list-disc list-outside ml-4 mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>
                <strong>Google Search Console:</strong> First, ensure you are an
                owner/user of the Property on GSC. Click Connect and
                authenticate. Monix will automatically fetch CTR and keyword
                query data for matching target domains.
              </li>
              <li>
                <strong>Cloudflare:</strong> Providing an API token allows Monix
                to fetch cached status and performance logs directly from your
                DNS zones.
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Active integrations
        </h3>
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-1">
          <IntegrationCard
            icon={<GoogleIcon className="h-5 w-5" />}
            iconBg="bg-indigo-500/10"
            name="Google Search Console"
            description="Search clicks, impressions, CTR, and keyword positions for verified properties."
            status={
              gscLoading
                ? "loading"
                : gscStatus?.connected
                  ? "connected"
                  : "disconnected"
            }
            href="/dashboard/analytics"
            onConnect={handleConnectGsc}
            isConnecting={isConnectingGsc}
            metrics={
              gscStatus?.connected
                ? [
                    { label: "Source", value: "GSC" },
                    { label: "Status", value: "Synced" },
                  ]
                : undefined
            }
          />
          <IntegrationCard
            icon={<CloudflareIcon className="h-5 w-5" />}
            iconBg="bg-orange-400/10"
            name="Cloudflare"
            description="Traffic analytics, threat blocking, cache performance, and zone management."
            status={
              cfLoading
                ? "loading"
                : cfStatus?.connected
                  ? "connected"
                  : "disconnected"
            }
            href="/dashboard/integrations/cloudflare"
            connectHref="/dashboard/integrations/cloudflare"
            metrics={
              cfStatus?.connected
                ? [
                    { label: "Account", value: cfStatus.account_name ?? "—" },
                    {
                      label: "Zones",
                      value: String(cfStatus.zones_count ?? 0),
                    },
                  ]
                : undefined
            }
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Coming soon
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ComingSoonCard
            icon={<Search className="h-5 w-5 text-purple-400" />}
            iconBg="bg-purple-400/10"
            name="Semrush"
            description="Domain authority, backlinks, and organic keyword data."
          />
          <ComingSoonCard
            icon={<ExternalLink className="h-5 w-5 text-sky-400" />}
            iconBg="bg-sky-400/10"
            name="Ahrefs"
            description="Backlink profiles and keyword research insights."
          />
          <ComingSoonCard
            icon={<Plug className="h-5 w-5 text-emerald-400" />}
            iconBg="bg-emerald-400/10"
            name="Uptime Robot"
            description="Uptime monitoring and incident history."
          />
        </div>
      </div>
    </div>
  );
}
