"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import Footer from "@/components/Footer";
import Navigation from "@/components/Navigation";
import type { StatusPageData } from "@/server/uptime/status-page-data";

function ResponseTimeChart({
  data,
}: {
  data: StatusPageData["responseTimeHistory24h"];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-muted-foreground text-xs font-mono">
        [NO_RESPONSE_TIME_DATA_AVAILABLE]
      </div>
    );
  }

  const validPoints = data
    .map((d, i) => ({ x: d.responseTimeMs ?? 0, i, src: d }))
    .filter((p) => p.x !== null);

  if (validPoints.length === 0) {
    return (
      <div className="h-36 flex items-center justify-center text-muted-foreground text-xs font-mono">
        [NO_RESPONSE_TIME_DATA_AVAILABLE]
      </div>
    );
  }

  const maxVal = Math.max(...validPoints.map((p) => p.x), 100);
  const minVal = 0;
  const height = 140;
  const width = 700;
  const padding = 10;

  const pointsStr = validPoints
    .map((p, idx) => {
      const x =
        validPoints.length > 1
          ? padding + (idx / (validPoints.length - 1)) * (width - padding * 2)
          : width / 2;
      const y =
        height -
        padding -
        ((p.x - minVal) / (maxVal - minVal || 1)) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const lastPoint = validPoints[validPoints.length - 1];
  const lastX =
    validPoints.length > 1 ? padding + (width - padding * 2) : width / 2;
  const lastY =
    height -
    padding -
    (((lastPoint?.x ?? 0) - minVal) / (maxVal - minVal || 1)) *
      (height - padding * 2);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 stroke-current"
      >
        <title>Response Time Chart</title>
        <line
          x1={padding}
          y1={height - padding}
          x2={width - padding}
          y2={height - padding}
          stroke="#27272a"
          strokeWidth="1"
        />
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          stroke="#27272a"
          strokeDasharray="2,4"
          strokeWidth="1"
        />

        <polyline
          fill="none"
          stroke="#00ff66"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsStr}
        />

        <circle cx={lastX} cy={lastY} r="3.5" fill="#00ff66" />
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1 font-mono">
        <span>-24h</span>
        <span>Max: {maxVal}ms</span>
        <span>Now</span>
      </div>
    </div>
  );
}

export default function PublicStatusPage({
  params,
}: {
  params: Promise<{ site: string }>;
}) {
  const resolvedParams = use(params);
  const siteIdentifier = resolvedParams.site;

  const [statusData, setStatusData] = useState<StatusPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/status/${encodeURIComponent(siteIdentifier)}`,
        );
        if (!res.ok) {
          if (isMounted) setNotFound(true);
          return;
        }
        const data = (await res.json()) as StatusPageData;
        if (isMounted) {
          setStatusData(data);
          setNotFound(false);
        }
      } catch {
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [siteIdentifier]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-mono text-xs">
        <Navigation />
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-32 pb-20 space-y-4">
          <div className="border border-border p-6 bg-[#0d0d0f] animate-pulse h-32 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-border p-6 bg-[#0d0d0f] animate-pulse h-64 rounded" />
            <div className="border border-border p-6 bg-[#0d0d0f] animate-pulse h-64 rounded" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !statusData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-mono">
        <Navigation />
        <main className="flex-1 max-w-2xl mx-auto w-full px-6 pt-40 pb-20 text-center space-y-6">
          <p className="text-xs text-destructive uppercase tracking-widest font-mono">
            [404_NOT_FOUND]
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white font-sans">
            Status Page Not Found
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed font-mono">
            The site provided does not exist or its status page is private.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00ff66] text-black text-xs font-mono font-semibold rounded hover:opacity-90 transition-opacity"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return Home
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-mono text-xs selection:bg-[#00ff66] selection:text-black">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 pt-24 pb-20 space-y-6">
        <div className="border border-border bg-[#0d0d0f] p-4 rounded space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <span>{site.name}</span>
              <span className="text-muted-foreground font-normal text-xs">
                ::status
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <span>URL :</span>
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00ff66] hover:underline"
              >
                {site.url}
              </a>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 border border-border bg-[#18181b] rounded">
            {isUp ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#00ff66]" />
                <span className="font-semibold text-[#00ff66] uppercase">
                  OPERATIONAL
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="font-semibold text-destructive uppercase">
                  DOWNTIME DETECTED
                </span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <div className="border border-border bg-[#0d0d0f] p-3.5 rounded">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              UPTIME (24H)
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {site.uptimePercentage24h}%
            </p>
          </div>
          <div className="border border-border bg-[#0d0d0f] p-3.5 rounded">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              UPTIME (30D)
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {site.uptimePercentage30d}%
            </p>
          </div>
          <div className="border border-border bg-[#0d0d0f] p-3.5 rounded">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              CURRENT LATENCY
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {site.currentResponseTimeMs != null
                ? `${site.currentResponseTimeMs}ms`
                : "--"}
            </p>
          </div>
          <div className="border border-border bg-[#0d0d0f] p-3.5 rounded">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              HTTP CODE
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {site.currentStatusCode ?? "--"}
            </p>
          </div>
          <div className="border border-border bg-[#0d0d0f] p-3.5 rounded">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              SSL CERTIFICATE
            </p>
            <p
              className={`text-lg font-bold mt-1 ${
                site.certWarning ? "text-destructive" : "text-foreground"
              }`}
            >
              {site.certDaysRemaining != null
                ? `${site.certDaysRemaining}d left`
                : "--"}
            </p>
          </div>
        </div>

        <div className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-foreground uppercase tracking-widest">
              Response Time History (Last 24h)
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {statusData.responseTimeHistory24h.length} checks
            </span>
          </div>
          <ResponseTimeChart data={statusData.responseTimeHistory24h} />
        </div>

        <div className="border border-border bg-[#0d0d0f] p-6 rounded space-y-4">
          <h2 className="text-xs font-semibold text-foreground uppercase tracking-widest">
            Incident Log (Last 30 days)
          </h2>

          {statusData.incidents.length === 0 ? (
            <p className="text-muted-foreground text-xs py-4">
              No incidents reported in the last 30 days. All systems
              operational.
            </p>
          ) : (
            <div className="space-y-2">
              {statusData.incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="border border-border p-3 bg-[#18181b] rounded flex flex-col sm:flex-row justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-foreground">
                      {incident.cause || "Service Downtime"}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      Started: {new Date(incident.startedAt).toUTCString()}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        incident.status === "resolved"
                          ? "bg-[#00ff66]/15 text-[#00ff66]"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {incident.status === "resolved" ? "RESOLVED" : "ONGOING"}
                    </span>
                    {incident.durationSeconds != null && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                        Duration: {Math.round(incident.durationSeconds / 60)}m
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
