"use client";

import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Globe,
  Loader2,
  RefreshCw,
  Shield,
  Unlink,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  connectCloudflare,
  disconnectCloudflare,
  getCloudflareAnalytics,
  getCloudflareStatus,
  getCloudflareZones,
  type CloudflareAnalytics,
  type CloudflareStatus,
  type CloudflareZone,
} from "@/lib/api";

function useChartColors() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return {
    grid: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    axis: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.45)",
    orange: dark ? "#fb923c" : "#ea580c",
    rose: dark ? "#f87171" : "#e11d48",
    blue: dark ? "#60a5fa" : "#2563eb",
    emerald: dark ? "#34d399" : "#059669",
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
  return `${bytes} B`;
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {sub && (
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      )}
    </div>
  );
}

function RequestsChart({
  series,
}: {
  series: CloudflareAnalytics["series"];
}) {
  const c = useChartColors();
  const data = series.map((s) => ({
    date: s.date.slice(5), // MM-DD
    requests: s.requests,
    threats: s.threats,
    cached: s.cached_requests,
  }));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="cfReqGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c.orange} stopOpacity={0.3} />
              <stop offset="95%" stopColor={c.orange} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cfThreatGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={c.rose} stopOpacity={0.25} />
              <stop offset="95%" stopColor={c.rose} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            itemStyle={{ color: "var(--muted-foreground)" }}
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke={c.orange}
            strokeWidth={1.5}
            fill="url(#cfReqGrad)"
            name="Requests"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="threats"
            stroke={c.rose}
            strokeWidth={1.5}
            fill="url(#cfThreatGrad)"
            name="Threats"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CountriesChart({
  countries,
}: {
  countries: CloudflareAnalytics["top_countries"];
}) {
  const c = useChartColors();
  const data = countries.slice(0, 8).map((x) => ({
    country: x.country,
    requests: x.requests,
  }));

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%" debounce={1}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
          barSize={10}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompact}
          />
          <YAxis
            type="category"
            dataKey="country"
            width={32}
            tick={{ fontSize: 10, fill: c.axis }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
          />
          <Bar dataKey="requests" radius={[0, 4, 4, 0]} name="Requests">
            {data.map((d) => (
              <Cell key={d.country} fill={c.orange} fillOpacity={0.8} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Connect section ──────────────────────────────────────────────────────────

function ConnectSection({
  onConnected,
}: {
  onConnected: (status: CloudflareStatus) => void;
}) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    if (!token.trim()) return;
    setLoading(true);
    setError("");
    try {
      const result = await connectCloudflare(token.trim());
      onConnected({
        connected: true,
        account_name: result.account_name,
        zones_count: result.zones_count,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to connect. Check your token.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 max-w-lg">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
          <Cloud className="h-5 w-5 text-orange-400" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Connect Cloudflare</p>
          <p className="text-xs text-muted-foreground">
            Requires an API token with Analytics:Read permission.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cf-token" className="text-sm">
            API Token
          </Label>
          <Input
            id="cf-token"
            type="password"
            placeholder="Paste your Cloudflare API token…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            className="font-mono text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Create a token at{" "}
            <span className="font-mono">dash.cloudflare.com → Profile → API Tokens</span>{" "}
            with the{" "}
            <span className="font-medium">Zone:Zone:Read + Zone:Analytics:Read</span>{" "}
            permissions.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-500">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <Button
          onClick={handleConnect}
          disabled={loading || !token.trim()}
          className="w-full bg-foreground text-background hover:bg-foreground/90 border-0"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying token…
            </>
          ) : (
            <>
              <Cloud className="h-4 w-4 mr-2" />
              Connect Cloudflare
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ── Analytics section ────────────────────────────────────────────────────────

function AnalyticsSection({
  zones,
  status,
  onDisconnect,
}: {
  zones: CloudflareZone[];
  status: CloudflareStatus;
  onDisconnect: () => void;
}) {
  const [selectedZone, setSelectedZone] = useState<string>(zones[0]?.id ?? "");
  const [days, setDays] = useState(7);
  const [analytics, setAnalytics] = useState<CloudflareAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(
    async (zoneId: string, d: number) => {
      if (!zoneId) return;
      setLoading(true);
      setError("");
      try {
        const data = await getCloudflareAnalytics(zoneId, d);
        setAnalytics(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedZone) void load(selectedZone, days);
  }, [selectedZone, days, load]);

  const cacheRate = useMemo(() => {
    if (!analytics) return "—";
    const { requests, cached_requests } = analytics.totals;
    if (!requests) return "0%";
    return `${((cached_requests / requests) * 100).toFixed(1)}%`;
  }, [analytics]);

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectCloudflare();
      onDisconnect();
    } catch {
      setDisconnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
          <span className="text-foreground font-medium">
            {status.account_name ?? "Cloudflare"}
          </span>
          {status.zones_count != null && (
            <span className="text-muted-foreground">
              · {status.zones_count} zone{status.zones_count !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          {disconnecting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Unlink className="h-3.5 w-3.5" />
          )}
          Disconnect
        </Button>
      </div>

      {/* Zone + period controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Zone</Label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="h-8 rounded-md border border-border bg-background text-foreground text-sm px-2 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Period</Label>
          <div className="flex rounded-md border border-border overflow-hidden">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 h-8 text-xs font-medium transition-colors ${
                  days === d
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {!loading && analytics && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => load(selectedZone, days)}
            className="gap-1.5 text-muted-foreground h-8"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-muted/20 border border-border animate-pulse"
              />
            ))}
          </div>
          <div className="h-60 rounded-xl bg-muted/20 border border-border animate-pulse" />
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <StatCard
              label="Total Requests"
              value={formatCompact(analytics.totals.requests)}
              sub={`Last ${analytics.period_days} days`}
              icon={Zap}
              iconColor="text-orange-400"
            />
            <StatCard
              label="Cache Rate"
              value={cacheRate}
              sub={`${formatCompact(analytics.totals.cached_requests)} cached`}
              icon={RefreshCw}
              iconColor="text-emerald-500"
            />
            <StatCard
              label="Threats Blocked"
              value={formatCompact(analytics.totals.threats)}
              sub="Firewall + bot"
              icon={Shield}
              iconColor="text-rose-500"
            />
            <StatCard
              label="Bandwidth Saved"
              value={formatBytes(
                Math.round(
                  analytics.totals.bandwidth_bytes *
                    (analytics.totals.cached_requests /
                      Math.max(analytics.totals.requests, 1)),
                ),
              )}
              sub={`of ${formatBytes(analytics.totals.bandwidth_bytes)} total`}
              icon={Globe}
              iconColor="text-blue-400"
            />
          </div>

          {/* Requests + threats chart */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-sm font-semibold text-foreground">
                Requests & threats over time
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily totals for{" "}
                <span className="font-medium">{analytics.zone_name}</span>
              </p>
            </div>
            <div className="px-2 py-4">
              <RequestsChart series={analytics.series} />
            </div>
            <div className="px-5 pb-4 flex gap-4">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                Requests
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Threats
              </span>
            </div>
          </div>

          {/* Countries chart */}
          {analytics.top_countries.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  Top countries
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requests by country
                </p>
              </div>
              <div className="px-2 py-4">
                <CountriesChart countries={analytics.top_countries} />
              </div>
            </div>
          )}

          {/* HTTP status distribution */}
          {analytics.status_codes.length > 0 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground">
                  HTTP status distribution
                </p>
              </div>
              <div className="divide-y divide-border">
                {analytics.status_codes.map((s) => {
                  const total = analytics.status_codes.reduce(
                    (acc, x) => acc + x.requests,
                    0,
                  );
                  const pct = total
                    ? ((s.requests / total) * 100).toFixed(1)
                    : "0";
                  const color =
                    s.status.startsWith("2")
                      ? "bg-emerald-500"
                      : s.status.startsWith("3")
                        ? "bg-blue-400"
                        : s.status.startsWith("4")
                          ? "bg-amber-400"
                          : "bg-rose-500";
                  return (
                    <div
                      key={s.status}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span className="font-mono text-xs text-foreground w-10">
                        {s.status}
                      </span>
                      <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-muted-foreground w-12 text-right">
                        {pct}%
                      </span>
                      <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                        {formatCompact(s.requests)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CloudflarePage() {
  const [status, setStatus] = useState<CloudflareStatus | null>(null);
  const [zones, setZones] = useState<CloudflareZone[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError("");
    try {
      const s = await getCloudflareStatus();
      setStatus(s);
      if (s.connected) {
        const z = await getCloudflareZones();
        setZones(z);
      }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403))
        return;
      // If backend not configured yet, default to not connected
      setStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleConnected = (newStatus: CloudflareStatus) => {
    setStatus(newStatus);
    void loadStatus();
  };

  const handleDisconnect = () => {
    setStatus({ connected: false });
    setZones([]);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-orange-400/10 flex items-center justify-center">
            <Cloud className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Cloudflare
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Traffic analytics, security events, and cache performance.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {loadingStatus ? (
        <div className="space-y-4">
          <div className="h-36 rounded-xl bg-muted/20 border border-border animate-pulse max-w-lg" />
        </div>
      ) : status?.connected ? (
        <AnalyticsSection
          zones={zones}
          status={status}
          onDisconnect={handleDisconnect}
        />
      ) : (
        <>
          <ConnectSection onConnected={handleConnected} />
          <div className="rounded-xl border border-border bg-muted/10 p-5 max-w-lg">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              What you'll see once connected
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Total requests, cache rate, and bandwidth saved",
                "Threats and bot attacks blocked by Cloudflare firewall",
                "Daily request and threat trend charts",
                "Top countries by traffic volume",
                "HTTP status code distribution",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
