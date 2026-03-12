"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  MapMarker,
  MarkerContent,
  Map as TargetMap,
} from "@/components/ui/map";
import { Progress } from "@/components/ui/progress";
import { analyzeUrl, type WebSecurityAnalysis } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

const sampleTargets = ["github.com", "cloudflare.com", "vercel.com"];

function getSubjectName(value: Record<string, string> | string | undefined) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  return value.commonName || value.CN || Object.values(value)[0] || "—";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function ScoreRing({ score }: { score: number }) {
  const level = score >= 70 ? "low" : score >= 40 ? "medium" : "high";
  const color = level === "low" ? "text-white" : level === "medium" ? "text-white/70" : "text-white/50";
  const label = level === "low" ? "Low Risk" : level === "medium" ? "Medium Risk" : "High Risk";

  return (
    <div className="flex flex-col items-center justify-center p-8 border border-white/10 rounded-2xl bg-white/[0.02] gap-4">
      <div className="relative flex items-center justify-center w-28 h-28">
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke="white" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="text-center">
          <div className="text-3xl font-bold text-white">{score}</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">/ 100</div>
        </div>
      </div>
      <div>
        <div className={`text-sm font-semibold text-center ${color}`}>{label}</div>
        <div className="text-xs text-white/40 text-center mt-1">Threat Score</div>
      </div>
    </div>
  );
}

function HeaderBar({ name, present }: { name: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/70">{name}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${present ? "bg-white" : "bg-white/15"}`} />
        <span className={`text-xs font-medium ${present ? "text-white" : "text-white/30"}`}>
          {present ? "Present" : "Missing"}
        </span>
      </div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-white/5">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{title}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/40 shrink-0">{label}</span>
      <span className="text-sm text-white text-right break-all">{value || "—"}</span>
    </div>
  );
}

export default function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [includePortScan, setIncludePortScan] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WebSecurityAnalysis | null>(null);

  // Quick geo-lookup state (runs fast before full scan)
  type QuickGeo = { lat: number; lon: number; city: string; country: string; org: string; query: string };
  const [quickGeo, setQuickGeo] = useState<QuickGeo | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lookupGeo = useCallback(async (raw: string) => {
    const domain = raw.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (!domain) { setQuickGeo(null); return; }
    setGeoLoading(true);
    try {
      const res = await fetch(`https://ip-api.com/json/${domain}?fields=status,city,country,lat,lon,org,query`);
      const data = await res.json();
      if (data.status === "success") setQuickGeo(data as QuickGeo);
      else setQuickGeo(null);
    } catch { setQuickGeo(null); }
    finally { setGeoLoading(false); }
  }, []);

  // Debounce URL input for geo-lookup (600ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!url.trim()) { setQuickGeo(null); return; }
    debounceRef.current = setTimeout(() => lookupGeo(url), 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [url, lookupGeo]);

  // Prefer scan result coordinates when available
  const mapCoords = result?.server_location?.coordinates
    ? { lat: result.server_location.coordinates.latitude, lon: result.server_location.coordinates.longitude }
    : quickGeo ? { lat: quickGeo.lat, lon: quickGeo.lon } : null;

  const mapLabel = result?.server_location
    ? [
      result.server_location.city,
      result.server_location.region,
      result.server_location.country,
    ].filter(Boolean).join(", ")
    : quickGeo ? `${quickGeo.city}, ${quickGeo.country} · ${quickGeo.org}` : null;

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Please enter a URL to analyze.");
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
      const analysis = await analyzeUrl(url, { includePortScan, includeMetadata });
      setResult(analysis);
      if (analysis.status === "error") {
        setError(analysis.error || "Analysis failed. Please try again.");
      }
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
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

  const threatScore = result?.threat_score ?? 0;
  const headerEntries = Object.entries(result?.security_headers_analysis?.headers || {});
  const presentHeaders = headerEntries.filter(([, d]) => d.present).length;

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">Analyze a Target</h2>
          <p className="text-white/40 mb-8">
            Enter any public domain or URL. Monix runs comprehensive TLS, DNS, header, cookie, routing, and geo analysis.
          </p>

          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleAnalyze(); }}
              placeholder="e.g. github.com or https://example.com"
              className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/25 outline-none focus:border-white/30 transition-colors"
            />
            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className="px-8 bg-white text-black font-semibold hover:bg-neutral-200 rounded-lg"
            >
              {loading ? "Scanning…" : "Analyze"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {sampleTargets.map((target) => (
              <button
                key={target}
                onClick={() => setUrl(target)}
                className="text-xs text-white/50 border border-white/10 px-3 py-1.5 rounded-full hover:text-white hover:border-white/30 transition-colors"
              >
                {target}
              </button>
            ))}
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includePortScan} onChange={(e) => setIncludePortScan(e.target.checked)} className="accent-white" />
              <span className="text-sm text-white/50">Port scan</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={includeMetadata} onChange={(e) => setIncludeMetadata(e.target.checked)} className="accent-white" />
              <span className="text-sm text-white/50">Page metadata</span>
            </label>
          </div>

          {loading && (
            <div className="mt-6">
              <div className="flex justify-between text-xs text-white/40 mb-2">
                <span>Running analysis…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1" />
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && result.status === "success" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Top stat strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Threat Level", value: result.threat_level || "Unknown" },
                { label: "IP Address", value: result.ip_address || "—" },
                { label: "HTTP Status", value: `${result.http_headers?.status_code || "—"}` },
                { label: "Location", value: result.server_location?.country || "—" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                  <p className="text-xs text-white/40 mb-2">{label}</p>
                  <p className="text-xl font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Threat Score + Security Headers */}
            <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
              <ScoreRing score={threatScore} />

              <Card title="Security Headers">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-700"
                      style={{ width: `${headerEntries.length ? (presentHeaders / headerEntries.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-white shrink-0">
                    {presentHeaders}/{headerEntries.length} present
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-x-8">
                  {headerEntries.map(([header, data]) => (
                    <HeaderBar key={header} name={header} present={data.present} />
                  ))}
                  {headerEntries.length === 0 && (
                    <p className="text-sm text-white/30">No header data available.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Location Map — full width */}
            {result.server_location?.coordinates && (
              <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ height: "520px" }}>
                <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                  <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Server Location</p>
                  <div className="text-sm text-white/70">
                    {result.server_location.city
                      ? `${result.server_location.city}, ${result.server_location.region}, ${result.server_location.country}`
                      : result.server_location.country}
                    {result.server_location.org && (
                      <span className="ml-3 text-white/30">· {result.server_location.org}</span>
                    )}
                  </div>
                </div>
                <TargetMap
                  center={[
                    result.server_location.coordinates.longitude,
                    result.server_location.coordinates.latitude,
                  ]}
                  zoom={5}
                  styles={{
                    dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                    light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                  }}
                >
                  <MapMarker
                    longitude={result.server_location.coordinates.longitude}
                    latitude={result.server_location.coordinates.latitude}
                  >
                    <MarkerContent>
                      <div className="h-5 w-5 rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.15)] animate-pulse" />
                    </MarkerContent>
                  </MapMarker>
                </TargetMap>
              </div>
            )}

            {/* Findings + Recommendations */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Findings">
                <div className="space-y-3">
                  {findings.length > 0 ? findings.map((f) => {
                    const severity = f.severity;
                    return (
                      <div key={`${f.title}-${f.detail}`} className="rounded-xl border border-white/10 bg-black p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-semibold text-white">{f.title}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${severity === "high" ? "border-white/20 text-white" :
                            severity === "medium" ? "border-white/10 text-white/60" :
                              "border-white/5 text-white/40"
                            }`}>{severity}</span>
                        </div>
                        <p className="text-sm text-white/50 leading-relaxed">{f.detail}</p>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-white/30">No findings returned.</p>
                  )}
                </div>
              </Card>

              <Card title="Recommendations">
                <div className="space-y-3">
                  {(result.recommendations?.length
                    ? result.recommendations
                    : ["No immediate remediation items generated."]
                  ).map((item, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-black p-4 flex gap-3">
                      <span className="text-white/20 font-bold text-sm shrink-0">{String(i + 1).padStart(2, "0")}</span>
                      <p className="text-sm text-white/70 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Tech + DNS + TLS */}
            <div className="grid gap-6 lg:grid-cols-3">
              <Card title="Technology">
                <InfoRow label="Server" value={result.technologies?.server} />
                <InfoRow label="Framework / CMS" value={result.technologies?.framework || result.technologies?.cms} />
                <InfoRow label="CDN" value={result.technologies?.cdn} />
                <InfoRow label="Languages" value={result.technologies?.languages?.join(", ")} />
                <InfoRow label="Final URL" value={result.redirects?.final_url} />
              </Card>

              <Card title="TLS Certificate">
                <InfoRow label="Subject" value={getSubjectName(result.ssl_certificate?.subject)} />
                <InfoRow label="Issuer" value={getSubjectName(result.ssl_certificate?.issuer)} />
                <InfoRow label="Expires" value={formatDate(result.ssl_certificate?.expires)} />
                <InfoRow label="Valid" value={result.ssl_certificate?.valid ? "Yes" : "No"} />
              </Card>

              <Card title="DNS Records">
                <InfoRow label="A Records" value={result.dns_records?.a?.join(", ")} />
                <InfoRow label="MX Records" value={result.dns_records?.mx?.join(", ")} />
                <InfoRow label="NS Records" value={result.dns_records?.ns?.join(", ")} />
                <InfoRow label="TXT Records" value={result.dns_records?.txt?.join(" | ")} />
              </Card>
            </div>

            {/* Cookies + Routing */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card title="Cookies">
                <div className="space-y-3">
                  {result.cookies?.cookies.length ? result.cookies.cookies.map((cookie) => (
                    <div key={`${cookie.name}-${cookie.path}`} className="rounded-xl border border-white/10 bg-black p-4">
                      <div className="text-sm font-semibold text-white mb-2">{cookie.name}</div>
                      <div className="flex gap-4 text-xs">
                        {[
                          ["Secure", cookie.secure],
                          ["HttpOnly", cookie.httponly],
                          ["SameSite", cookie.samesite || "—"],
                        ].map(([key, val]) => (
                          <span key={key as string} className="text-white/40">
                            {key as string}: <span className={typeof val === "boolean" ? (val ? "text-white" : "text-white/30") : "text-white/60"}>{typeof val === "boolean" ? (val ? "Yes" : "No") : val}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )) : <p className="text-sm text-white/30">No cookies found.</p>}
                </div>
              </Card>

              <Card title="Redirect Chain">
                <div className="space-y-3">
                  {result.redirects?.chain.length ? result.redirects.chain.map((step, i) => (
                    <div key={`${step.url}-${i}`} className="rounded-xl border border-white/10 bg-black p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-white/30">Step {i + 1}</span>
                        <span className="text-xs font-semibold text-white">{step.status_code}</span>
                      </div>
                      <p className="text-sm text-white/60 break-all leading-relaxed">{step.url}</p>
                    </div>
                  )) : <p className="text-sm text-white/30">No redirects detected.</p>}

                  {(result.metadata?.title || result.metadata?.description) && (
                    <div className="rounded-xl border border-white/10 bg-black p-4 mt-3">
                      <p className="text-sm font-semibold text-white mb-1">{result.metadata?.title || "Untitled"}</p>
                      <p className="text-sm text-white/50 leading-relaxed">{result.metadata?.description || "No description."}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map Section: shows target location as soon as URL is typed */}
      <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ height: "480px" }}>
        <div className="px-5 py-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${geoLoading ? "bg-white/40 animate-pulse" : mapCoords ? "bg-white animate-pulse" : "bg-white/20"}`} />
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">
              {geoLoading ? "Locating…" : mapCoords ? "Server Location" : "Global Network — Enter a URL to locate target"}
            </p>
          </div>
          {mapLabel && (
            <p className="text-sm text-white/60">{mapLabel}</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          {mapCoords ? (
            <motion.div
              key={`${mapCoords.lat}-${mapCoords.lon}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-[calc(100%-52px)]"
            >
              <TargetMap
                center={[mapCoords.lon, mapCoords.lat]}
                zoom={5}
                styles={{
                  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                  light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                }}
              >
                <MapMarker longitude={mapCoords.lon} latitude={mapCoords.lat}>
                  <MarkerContent>
                    <div className="h-5 w-5 rounded-full bg-white shadow-[0_0_0_10px_rgba(255,255,255,0.12)] animate-pulse" />
                  </MarkerContent>
                </MapMarker>
              </TargetMap>
            </motion.div>
          ) : (
            <motion.div
              key="world"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full h-[calc(100%-52px)]"
            >
              <TargetMap
                center={[15, 26]}
                zoom={1.5}
                styles={{
                  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                  light: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
