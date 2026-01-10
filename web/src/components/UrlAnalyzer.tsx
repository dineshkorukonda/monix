"use client";

/**
 * URL Analyzer component - Redesigned for a typography-focused, icon-free theme.
 * Uses ASCII/text symbols and follows a strict monochromatic aesthetic.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { analyzeUrl, type WebSecurityAnalysis } from "@/lib/api";
import { Map, MapMarker, MarkerContent } from "@/components/ui/map";

// --- Sub-components for better modularity ---

interface DataItemProps {
  label: string;
  value: string | number | null | undefined;
}

const DataItem = ({ label, value }: DataItemProps) => {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-white/5 last:border-0 font-mono">
      <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">
        {label}
      </span>
      <span className="text-sm text-white truncate uppercase">
        {value}
      </span>
    </div>
  );
};

interface SectionProps {
  title: string;
  symbol: string;
  children: React.ReactNode;
  className?: string;
  hasData?: boolean;
}

const Section = ({ title, symbol, children, className = "", hasData = true }: SectionProps) => {
  if (!hasData) return null;
  return (
    <div
      className={`rounded-none border border-white/10 bg-black transition-colors ${className}`}
    >
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between bg-white/5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] flex items-center gap-2 text-white">
          <span className="text-white/40">[{symbol}]</span>
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
};

// --- Main Component ---

export default function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WebSecurityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("ERROR: TARGET_UNDEFINED");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + 10));
    }, 200);

    try {
      const analysis = await analyzeUrl(url);
      clearInterval(progressInterval);
      setProgress(100);
      setResult(analysis);
      if (analysis.status === "error")
        setError(`ANALYSIS_FAILED: ${analysis.error || "UNKNOWN_ERROR"}`);
    } catch (err) {
      clearInterval(progressInterval);
      setError(`CRITICAL_FAILURE: ${err instanceof Error ? err.message : "NETWORK_ERROR"}`);
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleAnalyze();
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  const getSubjectName = (subject: Record<string, string> | string | undefined): string => {
    if (!subject) return "---";
    if (typeof subject === "string") return subject;
    return subject.commonName || subject.CN || JSON.stringify(subject);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono selection:bg-white selection:text-black">
      {/* Top Banner Area */}
      <div className="sticky top-0 z-50 bg-black border-b border-white/10">
        <div className="container mx-auto px-6 max-w-[1600px]">
          <div className="flex items-center justify-between h-20 gap-8">
            <div className="flex-1 relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">
                $
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="ENTER_TARGET_URL..."
                className="w-full pl-10 pr-4 py-3 bg-black border border-white/10 text-sm focus:outline-none focus:border-white transition-all font-mono uppercase placeholder:text-white/20"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold animate-pulse text-white/40">
                  RUNNING...
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="bg-white text-black px-10 py-3 text-xs font-black uppercase tracking-widest hover:bg-white/80 transition-all disabled:opacity-10 shrink-0"
            >
              EXECUTE_SCAN
            </button>
          </div>
          {loading && (
            <div className="px-4 pb-4">
              <Progress value={progress} />
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 max-w-[1600px]">
        {error && (
          <div className="mb-12 p-6 border border-white bg-white/5 flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white">
              ! CRITICAL_NOTICE
            </span>
            <span className="text-sm font-bold tracking-tight uppercase">{error}</span>
          </div>
        )}

        {result && result.status === "success" && (
          <div className="space-y-12 animate-in fade-in duration-700">
            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 border border-white/10 bg-black flex flex-col gap-3">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">
                  [01] STATUS_LEVEL
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-black uppercase">{result.threat_level || "UNKNOWN"}</span>
                  <span className="text-[10px] font-mono border border-white/20 px-2 py-0.5">
                    {result.threat_score ?? 0}%
                  </span>
                </div>
              </div>
              <div className="p-6 border border-white/10 bg-black flex flex-col gap-3">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">
                  [02] TARGET_IP
                </span>
                <span className="text-lg font-bold truncate">
                  {result.ip_address || "---"}
                </span>
              </div>
              <div className="p-6 border border-white/10 bg-black flex flex-col gap-3">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">
                  [03] INFRASTRUCTURE
                </span>
                <span className="text-lg font-bold uppercase">
                  {result.technologies?.server || "UNKNOWN"}
                </span>
              </div>
              <div className="p-6 border border-white/10 bg-black flex flex-col gap-3">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em]">
                  [04] SSL_AUTH
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-black uppercase ${result.ssl_certificate?.valid ? "text-white" : "text-white/20"}`}>
                    {result.ssl_certificate?.valid ? "VALID" : "INVALID"}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <Section 
                title="GEO_INTEL" 
                symbol="G" 
                className="xl:col-span-2"
                hasData={!!result.server_location && !!result.server_location.org}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <DataItem label="PROVIDER" value={result.server_location?.org} />
                    <DataItem label="LOCATION" value={result.server_location?.city ? `${result.server_location.city}, ${result.server_location.region}` : undefined} />
                    <DataItem label="TIMEZONE" value={result.server_location?.timezone} />
                    <DataItem label="COORDINATES" value={result.server_location?.coordinates ? `${result.server_location.coordinates.latitude}, ${result.server_location.coordinates.longitude}` : undefined} />
                  </div>
                  <div className="h-[240px] border border-white/10 bg-black relative">
                    {result.server_location?.coordinates && (
                      <Map
                        center={[
                          result.server_location.coordinates.longitude,
                          result.server_location.coordinates.latitude,
                        ]}
                        zoom={4}
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
                            <div className="w-4 h-4 bg-white rounded-full animate-pulse border-2 border-black" />
                          </MarkerContent>
                        </MapMarker>
                      </Map>
                    )}
                  </div>
                </div>
              </Section>

              <Section 
                title="HARDENING" 
                symbol="H"
                hasData={!!result.security_headers_analysis && result.security_headers_analysis.percentage > 0}
              >
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center justify-center py-6 border border-white/5 bg-white/[0.02]">
                    <span className="text-4xl font-black">{result.security_headers_analysis?.percentage ?? 0}%</span>
                    <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-2">SECURED</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(result.security_headers_analysis?.headers || {}).slice(0, 6).map(([header, data]) => (
                      <div key={header} className="flex items-center justify-between text-[10px] uppercase">
                        <span className="text-white/40 truncate mr-4">{header}</span>
                        <span className={data.present ? "text-white" : "text-white/20"}>
                          {data.present ? "[+]" : "[-]"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Section>

              <Section 
                title="TECH_STACK" 
                symbol="T"
                hasData={!!result.technologies && (!!result.technologies.server || !!result.technologies.cms || (result.technologies.languages?.length ?? 0) > 0)}
              >
                <div className="space-y-4">
                  <DataItem label="SERVER" value={result.technologies?.server} />
                  <DataItem label="CMS" value={result.technologies?.cms} />
                  <DataItem label="CDN" value={result.technologies?.cdn} />
                  { (result.technologies?.languages?.length ?? 0) > 0 && (
                    <div className="mt-4">
                      <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold mb-2 block">LANGUAGES</span>
                      <div className="flex flex-wrap gap-2">
                        {result.technologies?.languages.map((l) => (
                          <span key={l} className="text-[10px] border border-white/20 px-2 py-1 uppercase font-bold">
                            {l}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section 
                title="NET_PORTS" 
                symbol="P"
                hasData={!!result.port_scan && (result.port_scan.open_ports?.length ?? 0) > 0}
              >
                <div className="grid grid-cols-4 gap-2">
                  {[80, 443, 22, 21, 25, 53, 3306, 8080].map((port) => {
                    const isOpen = result.port_scan?.open_ports.includes(port) ?? false;
                    return (
                      <div key={port} className={`flex flex-col items-center justify-center p-2 border ${isOpen ? "border-white bg-white/10" : "border-white/5 opacity-20"}`}>
                        <span className="text-[10px] font-bold">{port}</span>
                        <span className="text-[8px] mt-1">{isOpen ? "ON" : "OFF"}</span>
                      </div>
                    );
                  })}
                </div>
              </Section>

              <Section 
                title="ENCRYPTION" 
                symbol="E"
                hasData={!!result.ssl_certificate && !!result.ssl_certificate.subject}
              >
                <div className="space-y-1">
                  <DataItem label="SUBJECT" value={getSubjectName(result.ssl_certificate?.subject)} />
                  <DataItem label="ISSUER" value={getSubjectName(result.ssl_certificate?.issuer)} />
                  <DataItem label="EXPIRES" value={formatDate(result.ssl_certificate?.expires)} />
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block text-center">
                      SSL_VERIFIED_NODE
                    </span>
                  </div>
                </div>
              </Section>

              <Section 
                title="REDIRECTS" 
                symbol="R"
                hasData={!!result.redirects && (result.redirects.chain?.length ?? 0) > 0}
              >
                <div className="space-y-3">
                  <div className="text-[10px] flex items-center gap-2">
                    <span className="text-white/40 font-bold">[SRC]</span>
                    <span className="truncate">{url}</span>
                  </div>
                  {result.redirects?.chain.map((step, i) => (
                    <div key={i} className="pl-4 border-l border-white/10 flex flex-col gap-1">
                      <div className="text-[10px] flex items-center gap-2">
                        <span className="text-white font-bold">[{step.status_code}]</span>
                        <span className="truncate text-white/60">{step.url}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>

              <Section 
                title="DNS_MAP" 
                symbol="D"
                hasData={!!result.dns_records && ((result.dns_records.a?.length ?? 0) > 0 || (result.dns_records.ns?.length ?? 0) > 0)}
              >
                <div className="space-y-6">
                  { (result.dns_records?.a?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-white/40 uppercase block mb-2 tracking-widest">A_RECORDS</span>
                      <div className="flex flex-col gap-1">
                        {result.dns_records?.a.map((ip) => (
                          <span key={ip} className="text-[10px] font-bold bg-white/5 px-2 py-1">
                            {ip}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  { (result.dns_records?.ns?.length ?? 0) > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-white/40 uppercase block mb-2 tracking-widest">NS_RECORDS</span>
                      <div className="flex flex-col gap-1">
                        {result.dns_records?.ns.map((ns) => (
                          <span key={ns} className="text-[10px] font-bold bg-white/5 px-2 py-1 truncate">
                            {ns}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <Section 
                title="THREAT_VECTORS" 
                symbol="!"
                hasData={!!result.threats && result.threats.length > 0}
                className="border-white/20"
              >
                <div className="space-y-3">
                  {result.threats?.map((threat, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-white/5 border border-white/10">
                      <span className="text-white font-bold text-xs mt-0.5">!</span>
                      <span className="text-[11px] uppercase font-bold tracking-tight text-white/80 leading-relaxed">
                        {threat}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; }
      `}</style>
    </div>
  );
}
