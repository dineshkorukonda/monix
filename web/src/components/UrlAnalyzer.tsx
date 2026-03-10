"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MapMarker,
  MarkerContent,
  Map as TargetMap,
} from "@/components/ui/map";
import { Progress } from "@/components/ui/progress";
import { analyzeUrl, type WebSecurityAnalysis } from "@/lib/api";

const sampleTargets = ["github.com", "cloudflare.com", "vercel.com"];

function Block({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-white/10 bg-white/[0.02] ${className}`}>
      <div className="border-b border-white/10 px-5 py-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-white/40">
          {title}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-white/6 py-3 text-[11px] uppercase tracking-[0.16em] last:border-b-0">
      <span className="text-white/40">{label}</span>
      <span className="max-w-[70%] break-all text-right text-white/88">
        {value === null || value === undefined || value === ""
          ? "UNAVAILABLE"
          : value}
      </span>
    </div>
  );
}

function getSubjectName(value: Record<string, string> | string | undefined) {
  if (!value) return "UNAVAILABLE";
  if (typeof value === "string") return value;
  return (
    value.commonName || value.CN || Object.values(value)[0] || "UNAVAILABLE"
  );
}

function formatDate(value?: string | null) {
  if (!value) return "UNAVAILABLE";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toISOString().split("T")[0];
}

export default function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [includePortScan, setIncludePortScan] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebSecurityAnalysis | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("ERROR: TARGET_UNDEFINED");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(8);

    const timer = setInterval(() => {
      setProgress((current) => (current >= 92 ? current : current + 8));
    }, 220);

    try {
      const analysis = await analyzeUrl(url, {
        includePortScan,
        includeMetadata,
      });
      setResult(analysis);
      if (analysis.status === "error") {
        setError(analysis.error || "ANALYSIS_FAILED");
      }
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ANALYSIS_FAILED");
    } finally {
      clearInterval(timer);
      setLoading(false);
      setTimeout(() => setProgress(0), 800);
    }
  };

  const findings = result?.findings?.length
    ? result.findings
    : result?.threats?.map((threat) => ({
        severity: "medium" as const,
        title: threat,
        detail: threat,
      })) || [];

  const dnsRows = [
    ["A_RECORDS", result?.dns_records?.a?.join(", ")],
    ["MX_RECORDS", result?.dns_records?.mx?.join(", ")],
    ["NS_RECORDS", result?.dns_records?.ns?.join(", ")],
    ["TXT_RECORDS", result?.dns_records?.txt?.join(" | ")],
  ] as const;

  return (
    <div className="space-y-6">
      <Block title="SCAN_CONSOLE">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <h2 className="text-3xl font-black uppercase tracking-[-0.04em] md:text-5xl">
              DETAILED TARGET ANALYSIS
            </h2>
            <p className="max-w-3xl text-[11px] uppercase leading-8 tracking-[0.18em] text-white/60">
              THIS WORKSPACE IS DESIGNED FOR TECHNICAL REVIEW. MONIX RETURNS
              THREAT SCORE, FINDINGS, REMEDIATION, TLS, DNS, COOKIES, ROUTING,
              OPEN PORTS, TECHNOLOGY SIGNALS, AND LOCATION CONTEXT.
            </p>
            <div className="border border-white/10 bg-black px-4 py-4">
              <input
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading) handleAnalyze();
                }}
                placeholder="ENTER_TARGET_URL..."
                className="w-full bg-transparent text-sm uppercase tracking-[0.12em] text-white outline-none placeholder:text-white/25"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleAnalyze} size="lg" disabled={loading}>
                {loading ? "RUNNING_SCAN" : "EXECUTE_SCAN"}
              </Button>
              {sampleTargets.map((target) => (
                <Button
                  key={target}
                  variant="outline"
                  size="sm"
                  onClick={() => setUrl(target)}
                >
                  {target}
                </Button>
              ))}
            </div>
            {loading ? <Progress value={progress} /> : null}
            {error ? (
              <div className="border border-red-500/30 bg-red-500/10 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-red-200">
                {error}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {[
              ["PORT_SCAN", includePortScan ? "ENABLED" : "DISABLED"],
              ["METADATA", includeMetadata ? "ENABLED" : "DISABLED"],
              ["SCAN_MODE", "DETAILED"],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/10 bg-black p-4">
                <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                  {label}
                </div>
                <div className="mt-2 text-sm uppercase tracking-[0.18em] text-white">
                  {value}
                </div>
              </div>
            ))}

            <label className="border border-white/10 bg-black p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                    PORT_SCAN
                  </div>
                  <div className="mt-2 text-[11px] uppercase leading-6 tracking-[0.16em] text-white/60">
                    INCLUDE COMMON SERVICE EXPOSURE CHECKS.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includePortScan}
                  onChange={(event) => setIncludePortScan(event.target.checked)}
                />
              </div>
            </label>

            <label className="border border-white/10 bg-black p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.28em] text-white/35">
                    METADATA
                  </div>
                  <div className="mt-2 text-[11px] uppercase leading-6 tracking-[0.16em] text-white/60">
                    INCLUDE PAGE TITLE AND DESCRIPTION EXTRACTION.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeMetadata}
                  onChange={(event) => setIncludeMetadata(event.target.checked)}
                />
              </div>
            </label>
          </div>
        </div>
      </Block>

      {result && result.status === "success" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["THREAT_LEVEL", result.threat_level || "UNKNOWN"],
              ["THREAT_SCORE", `${result.threat_score || 0}`],
              ["TARGET_IP", result.ip_address || "UNAVAILABLE"],
              ["HTTP_STATUS", `${result.http_headers?.status_code || "N/A"}`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/35">
                  {label}
                </div>
                <div className="mt-3 text-xl font-black uppercase tracking-[0.08em]">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Block title="FINDINGS">
              <div className="space-y-3">
                {findings.length > 0 ? (
                  findings.map((finding) => (
                    <div
                      key={`${finding.title}-${finding.detail}`}
                      className="border border-white/10 bg-black p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-bold uppercase tracking-[0.16em] text-white">
                          {finding.title}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
                          {finding.severity}
                        </p>
                      </div>
                      <p className="mt-3 text-[11px] uppercase leading-7 tracking-[0.16em] text-white/65">
                        {finding.detail}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    NO_FINDINGS_RETURNED
                  </p>
                )}
              </div>
            </Block>

            <Block title="RECOMMENDATIONS">
              <div className="space-y-3">
                {(result.recommendations?.length
                  ? result.recommendations
                  : ["NO_IMMEDIATE_REMEDIATION_ITEMS_GENERATED"]
                ).map((item) => (
                  <div
                    key={item}
                    className="border border-white/10 bg-black p-4"
                  >
                    <p className="text-[11px] uppercase leading-7 tracking-[0.16em] text-white/75">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </Block>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <Block title="TECHNICAL_DETAIL">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <DataRow label="URL" value={result.url} />
                <DataRow label="DOMAIN" value={result.domain} />
                <DataRow
                  label="FINAL_URL"
                  value={result.redirects?.final_url}
                />
                <DataRow label="SERVER" value={result.technologies?.server} />
                <DataRow
                  label="FRAMEWORK_OR_CMS"
                  value={
                    result.technologies?.framework || result.technologies?.cms
                  }
                />
                <DataRow label="CDN" value={result.technologies?.cdn} />
                <DataRow
                  label="LANGUAGES"
                  value={result.technologies?.languages?.join(", ")}
                />
                <DataRow label="PROVIDER" value={result.server_location?.org} />
                <DataRow
                  label="LOCATION"
                  value={
                    result.server_location?.city
                      ? `${result.server_location.city}, ${result.server_location.region}, ${result.server_location.country}`
                      : result.server_location?.country
                  }
                />
                <DataRow
                  label="TLS_SUBJECT"
                  value={getSubjectName(result.ssl_certificate?.subject)}
                />
                <DataRow
                  label="TLS_ISSUER"
                  value={getSubjectName(result.ssl_certificate?.issuer)}
                />
                <DataRow
                  label="TLS_EXPIRY"
                  value={formatDate(result.ssl_certificate?.expires)}
                />
              </div>
            </Block>

            {result.server_location?.coordinates ? (
              <Block title="TARGET_GEO" className="overflow-hidden">
                <div className="h-[420px] border border-white/10">
                  <TargetMap
                    center={[
                      result.server_location.coordinates.longitude,
                      result.server_location.coordinates.latitude,
                    ]}
                    zoom={4}
                    styles={{
                      dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                      light:
                        "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                    }}
                  >
                    <MapMarker
                      longitude={result.server_location.coordinates.longitude}
                      latitude={result.server_location.coordinates.latitude}
                    >
                      <MarkerContent>
                        <div className="h-4 w-4 rounded-full border border-black bg-white shadow-[0_0_0_10px_rgba(255,255,255,0.12)]" />
                      </MarkerContent>
                    </MapMarker>
                  </TargetMap>
                </div>
              </Block>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <Block title="HEADERS">
              <div className="space-y-2">
                {Object.entries(
                  result.security_headers_analysis?.headers || {},
                ).map(([header, data]) => (
                  <div
                    key={header}
                    className="border border-white/8 bg-black p-3"
                  >
                    <div className="text-[11px] uppercase tracking-[0.14em] text-white">
                      {header}
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.24em] text-white/40">
                      {data.present ? "PRESENT" : "MISSING"}
                    </div>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="DNS">
              <div className="space-y-3">
                {dnsRows.map(([label, value]) => (
                  <DataRow key={label} label={label} value={value} />
                ))}
              </div>
            </Block>

            <Block title="COOKIES">
              <div className="space-y-3">
                {(result.cookies?.cookies.length
                  ? result.cookies.cookies
                  : []
                ).map((cookie) => (
                  <div
                    key={`${cookie.name}-${cookie.path}`}
                    className="border border-white/8 bg-black p-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white">
                      {cookie.name}
                    </div>
                    <div className="mt-2 text-[10px] uppercase leading-6 tracking-[0.22em] text-white/45">
                      SECURE {cookie.secure ? "YES" : "NO"} / HTTPONLY{" "}
                      {cookie.httponly ? "YES" : "NO"} / SAMESITE{" "}
                      {cookie.samesite || "MISSING"}
                    </div>
                  </div>
                ))}
              </div>
            </Block>

            <Block title="ROUTING_AND_METADATA">
              <div className="space-y-3">
                {(result.redirects?.chain.length
                  ? result.redirects.chain
                  : []
                ).map((step, index) => (
                  <div
                    key={`${step.url}-${step.status_code}-${index}`}
                    className="border border-white/8 bg-black p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.26em] text-white/40">
                      STEP_{index + 1} / {step.status_code}
                    </div>
                    <div className="mt-2 break-all text-[11px] uppercase leading-7 tracking-[0.14em] text-white/70">
                      {step.url}
                    </div>
                  </div>
                ))}
                {result.metadata?.title || result.metadata?.description ? (
                  <div className="border border-white/8 bg-black p-4">
                    <div className="text-[11px] uppercase tracking-[0.16em] text-white">
                      {result.metadata?.title || "UNTITLED_PAGE"}
                    </div>
                    <div className="mt-2 text-[11px] uppercase leading-7 tracking-[0.14em] text-white/60">
                      {result.metadata?.description ||
                        "NO_DESCRIPTION_METADATA"}
                    </div>
                  </div>
                ) : null}
              </div>
            </Block>
          </div>
        </>
      ) : null}
    </div>
  );
}
