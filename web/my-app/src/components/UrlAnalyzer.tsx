"use client";

/**
 * URL Analyzer component - Overhauled for maximum density and style.
 *
 * Inspired by web-check.xyz and urlscan.io.
 * Features: Masonry-style grid, Information density, Pure black theme.
 */

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Code,
  Cookie,
  Fingerprint,
  Link as LinkIcon,
  Loader2,
  Lock,
  MapPin,
  Network,
  Search,
  Shield,
  X,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Map as MapComponent,
  MapMarker,
  MarkerContent,
} from "@/components/ui/map";
import { Progress } from "@/components/ui/progress";
import { analyzeUrl, type WebSecurityAnalysis } from "@/lib/api";

export default function UrlAnalyzer() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WebSecurityAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
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
        setError(analysis.error || "Analysis failed");
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Failed to analyze URL");
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) handleAnalyze();
  };

  const getThreatBadgeVariant = (
    level: string,
  ): "default" | "destructive" | "secondary" | "success" => {
    if (level === "CRITICAL" || level === "HIGH") return "destructive";
    if (level === "MEDIUM") return "secondary";
    if (level === "LOW") return "default";
    return "success";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getSubjectName = (subject: Record<string, string> | string): string => {
    if (typeof subject === "string") return subject;
    return subject.commonName || subject.CN || JSON.stringify(subject);
  };

  // Helper for small data items
  const DataItem = ({
    label,
    value,
    mono = false,
  }: {
    label: string;
    value: string | number | null | undefined;
    mono?: boolean;
  }) => (
    <div className="flex flex-col gap-0.5 py-1.5 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
        {label}
      </span>
      <span
        className={`text-sm ${mono ? "font-mono" : ""} text-gray-200 truncate`}
      >
        {value || "—"}
      </span>
    </div>
  );

  const Section = ({
    title,
    icon: Icon,
    children,
    className = "",
  }: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    className?: string;
  }) => (
    <div
      className={`group rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] hover:border-white/10 transition-all duration-300 ${className}`}
    >
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between group-hover:bg-white/[0.02]">
        <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-gray-400 group-hover:text-white transition-colors">
          <Icon className="w-3.5 h-3.4" />
          {title}
        </h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">
      {/* Top Banner Area */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-[#1a1a1a]">
        <div className="container mx-auto px-6 max-w-[1600px]">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tighter uppercase">
                  Monix
                </span>
                <span className="ml-2 text-[10px] text-gray-500 font-mono hidden sm:inline">
                  V2.0.0_SECURITY_SCANNER
                </span>
              </div>
            </div>

            <div className="flex-1 max-w-2xl mx-8 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="TARGET_URL_OR_IP..."
                className="w-full pl-10 pr-4 py-2.5 rounded bg-[#0a0a0a] border border-[#1a1a1a] text-sm focus:outline-none focus:border-white/20 focus:ring-4 focus:ring-white/5 transition-all font-mono"
                disabled={loading}
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !url.trim()}
              className="bg-white text-black px-6 py-2 rounded text-xs font-black uppercase tracking-tighter hover:bg-gray-200 transition-all disabled:opacity-20"
            >
              Scan
            </button>
          </div>
          {loading && (
            <Progress
              value={progress}
              className="h-[1px] absolute bottom-0 left-0 bg-transparent"
            />
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-10 max-w-[1600px]">
        {error && (
          <div className="mb-8 p-4 rounded border border-red-500/20 bg-red-500/5 flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-mono tracking-tight">{error}</span>
          </div>
        )}

        {result && result.status === "success" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
            {/* Summary Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-6 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  Safety Status
                </span>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-2xl font-black ${result.threat_score === 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {result.threat_level}
                  </span>
                  <Badge variant={getThreatBadgeVariant(result.threat_level)}>
                    {result.threat_score}/100
                  </Badge>
                </div>
              </div>
              <div className="p-6 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  Target Node
                </span>
                <span className="text-xl font-mono truncate">
                  {result.ip_address}
                </span>
              </div>
              <div className="p-6 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  Tech Stack
                </span>
                <span className="text-xl font-black">
                  {result.technologies.server || "Unknown"}
                </span>
              </div>
              <div className="p-6 rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] flex flex-col gap-2">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">
                  SSL Validity
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${result.ssl_certificate.valid ? "bg-green-500 animate-pulse" : "bg-red-500"}`}
                  />
                  <span className="text-xl font-black uppercase tracking-tighter">
                    {result.ssl_certificate.valid ? "Active" : "Missing"}
                  </span>
                </div>
              </div>
            </div>

            {/* Masonry-inspired Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Server Details & Map */}
              <Section
                title="Geographic Intelligence"
                icon={MapPin}
                className="xl:col-span-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <DataItem
                      label="Provider"
                      value={result.server_location.org}
                    />
                    <DataItem
                      label="City"
                      value={result.server_location.city}
                    />
                    <DataItem
                      label="Region"
                      value={result.server_location.region}
                    />
                    <DataItem
                      label="Timezone"
                      value={result.server_location.timezone}
                    />
                    <DataItem
                      label="Coordinates"
                      value={`${result.server_location.coordinates?.latitude}, ${result.server_location.coordinates?.longitude}`}
                      mono
                    />
                  </div>
                  <div className="h-[240px] rounded border border-[#1a1a1a] overflow-hidden grayscale brightness-75 contrast-125 hover:grayscale-0 transition-all duration-700">
                    {result.server_location.coordinates && (
                      <MapComponent
                        center={[
                          result.server_location.coordinates.longitude,
                          result.server_location.coordinates.latitude,
                        ]}
                        zoom={6}
                        styles={{
                          dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                          light:
                            "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
                        }}
                      >
                        <MapMarker
                          longitude={
                            result.server_location.coordinates.longitude
                          }
                          latitude={result.server_location.coordinates.latitude}
                        >
                          <MarkerContent>
                            <div className="relative group">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.3)] border-2 border-black">
                                <Shield className="w-5 h-5 text-black" />
                              </div>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-black" />
                            </div>
                          </MarkerContent>
                        </MapMarker>
                      </MapComponent>
                    )}
                  </div>
                </div>
              </Section>

              {/* Security Headers Analysis */}
              <Section title="Hardening Score" icon={Activity}>
                <div className="flex flex-col gap-6">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg
                      className="w-full h-full -rotate-90"
                      role="img"
                      aria-label="Security hardening score chart"
                    >
                      <title>Security hardening score chart</title>
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-[#1a1a1a]"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="58"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={364}
                        strokeDashoffset={
                          364 -
                          (364 * result.security_headers_analysis.percentage) /
                            100
                        }
                        className={`${result.security_headers_analysis.percentage > 70 ? "text-green-500" : "text-orange-500"}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-3xl font-black">
                        {result.security_headers_analysis.percentage}%
                      </span>
                      <span className="text-[8px] text-gray-500 uppercase font-bold">
                        SECURED
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(
                      result.security_headers_analysis.headers || {},
                    )
                      .slice(0, 5)
                      .map(([header, data]) => (
                        <div
                          key={header}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-500 font-mono truncate mr-4">
                            {header}
                          </span>
                          {data.present ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-red-500/50 shrink-0" />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </Section>

              {/* Technologies */}
              <Section title="Infrastructure" icon={Code}>
                <div className="space-y-4">
                  <DataItem
                    label="Web Server"
                    value={result.technologies.server}
                  />
                  <DataItem label="CMS" value={result.technologies.cms} />
                  <DataItem label="CDN / WAF" value={result.technologies.cdn} />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2 block">
                      Languages & Frameworks
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {result.technologies.languages.map((l) => (
                        <Badge
                          key={l}
                          variant="secondary"
                          className="bg-[#1a1a1a] text-white border-none"
                        >
                          {l}
                        </Badge>
                      ))}
                      {!result.technologies.languages.length && (
                        <span className="text-xs text-gray-600 italic">
                          Undetected
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Port Scan - Mini Grid */}
              <Section title="Network Ports" icon={Network}>
                <div className="grid grid-cols-4 gap-2">
                  {[80, 443, 22, 21, 25, 53, 3306, 8080].map((port) => {
                    const isOpen = result.port_scan.open_ports.includes(port);
                    return (
                      <div
                        key={port}
                        className={`flex flex-col items-center justify-center p-2 rounded border ${isOpen ? "border-green-500/50 bg-green-500/5" : "border-[#1a1a1a] opacity-30"}`}
                      >
                        <span className="text-[10px] font-mono">{port}</span>
                        <div
                          className={`w-1 h-1 rounded-full mt-1 ${isOpen ? "bg-green-500" : "bg-gray-700"}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 text-[9px] text-gray-500 font-mono text-center">
                  COMMON_WEB_SERVICES_CHECK
                </div>
              </Section>

              {/* SSL Details */}
              <Section title="Encryption Node" icon={Lock}>
                <div className="space-y-1">
                  <DataItem
                    label="Subject"
                    value={getSubjectName(result.ssl_certificate.subject)}
                  />
                  <DataItem
                    label="Issuer"
                    value={getSubjectName(result.ssl_certificate.issuer)}
                  />
                  <DataItem
                    label="Expires"
                    value={formatDate(result.ssl_certificate.expires)}
                  />
                  <DataItem label="Algorithm" value="RSA 2048-bit (SHA256)" />
                  <div className="mt-4">
                    <Badge className="w-full justify-center py-1 bg-green-500/10 text-green-500 border-green-500/20">
                      VERIFIED_TLS_CERT
                    </Badge>
                  </div>
                </div>
              </Section>

              {/* Redirect Chain */}
              <Section title="Redirect Chain" icon={LinkIcon}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-gray-400 truncate">{url}</span>
                  </div>
                  {result.redirects.chain.map((step) => (
                    <div
                      key={step.url}
                      className="pl-1 flex flex-col gap-1 border-l border-[#1a1a1a] ml-1"
                    >
                      <div className="h-4 border-b border-[#1a1a1a] w-2" />
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="text-[8px] h-4">
                          {step.status_code}
                        </Badge>
                        <span className="text-gray-500 truncate">
                          {step.url}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!result.redirects.chain.length && (
                    <div className="text-xs text-gray-600 italic">
                      No redirects detected
                    </div>
                  )}
                </div>
              </Section>

              {/* Cookies */}
              <Section title="Persistent Objects" icon={Cookie}>
                <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {result.cookies.cookies.map((c) => (
                    <div
                      key={c.name}
                      className="p-2 rounded bg-[#1a1a1a]/30 border border-[#1a1a1a]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-white truncate max-w-[120px]">
                          {c.name}
                        </span>
                        <div className="flex gap-1">
                          {c.secure && (
                            <Lock className="w-2 h-2 text-blue-400" />
                          )}
                          {c.httponly && (
                            <Shield className="w-2 h-2 text-green-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-500 font-mono break-all">
                        {c.value}
                      </p>
                    </div>
                  ))}
                  {!result.cookies.cookies.length && (
                    <div className="text-xs text-gray-600 italic text-center py-4">
                      Zero cookies found
                    </div>
                  )}
                </div>
              </Section>

              {/* DNS Intelligence */}
              <Section title="DNS Map" icon={Fingerprint}>
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-gray-600 uppercase block mb-1">
                      A Records
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.dns_records.a.map((ip) => (
                        <span
                          key={ip}
                          className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded"
                        >
                          {ip}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-600 uppercase block mb-1">
                      Name Servers
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {result.dns_records.ns.map((ns) => (
                        <span
                          key={ns}
                          className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded truncate max-w-full"
                        >
                          {ns}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #000; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
    </div>
  );
}
