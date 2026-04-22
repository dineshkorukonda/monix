/**
 * TypeScript port of the Django scan pipeline (subset of Python scan_engine).
 * Produces shapes compatible with WebSecurityAnalysis in the web client.
 */

import { randomUUID } from "node:crypto";
import dns from "node:dns/promises";
import tls from "node:tls";
import { URL } from "node:url";

export type JsonRecord = Record<string, unknown>;

const UA =
  "Mozilla/5.0 (compatible; Monix/1.0; +https://monix.dev) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("http://") && !t.startsWith("https://")) {
    return `https://${t}`;
  }
  return t;
}

async function checkSsl(hostname: string, port = 443): Promise<JsonRecord> {
  const result: JsonRecord = {
    valid: false,
    subject: "",
    issuer: "",
    expires: null as string | null,
    renewed: null as string | null,
    serial_number: "",
    error: null as string | null,
  };
  return await new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: hostname,
        port,
        servername: hostname,
        rejectUnauthorized: false,
        timeout: 5000,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          if (cert && Object.keys(cert).length) {
            result.valid = !socket.authorizationError;
            result.subject = cert.subject ?? "";
            result.issuer = cert.issuer ?? "";
            result.serial_number = String(cert.serialNumber ?? "");
            if (cert.valid_to)
              result.expires = new Date(cert.valid_to).toISOString();
            if (cert.valid_from)
              result.renewed = new Date(cert.valid_from).toISOString();
          }
        } catch (e) {
          result.error = e instanceof Error ? e.message : "ssl_error";
        }
        socket.end();
        resolve(result);
      },
    );
    socket.on("error", (e: Error) => {
      result.error = e.message;
      resolve(result);
    });
    socket.setTimeout(5000, () => {
      result.error = "timeout";
      socket.destroy();
      resolve(result);
    });
  });
}

async function checkDns(domain: string): Promise<JsonRecord> {
  const out: JsonRecord = {
    a: [] as string[],
    aaaa: [],
    mx: [],
    ns: [],
    txt: [],
    error: null,
  };
  try {
    out.a = (await dns.resolve4(domain)) as string[];
  } catch {
    /* ignore */
  }
  try {
    out.aaaa = (await dns.resolve6(domain)) as string[];
  } catch {
    /* ignore */
  }
  try {
    out.mx = (await dns.resolveMx(domain)).map(
      (m) => `${m.priority} ${m.exchange}`,
    );
  } catch {
    /* ignore */
  }
  try {
    out.ns = await dns.resolveNs(domain);
  } catch {
    /* ignore */
  }
  try {
    out.txt = (await dns.resolveTxt(domain)).map((chunks) => chunks.join(""));
  } catch {
    /* ignore */
  }
  return out;
}

async function fetchFinalResponse(
  url: string,
  maxRedirects = 8,
): Promise<{
  status: number;
  headers: Record<string, string>;
  finalUrl: string;
}> {
  let current = url;
  for (let i = 0; i < maxRedirects; i++) {
    const res = await fetch(current, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
      signal: AbortSignal.timeout(12000),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).href;
      continue;
    }
    const h: Record<string, string> = {};
    res.headers.forEach((v, k) => {
      h[k.toLowerCase()] = v;
    });
    return { status: res.status, headers: h, finalUrl: current };
  }
  throw new Error("too_many_redirects");
}

const SECURITY_HEADER_KEYS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

export async function analyzeWebSecurity(
  url: string,
  includePortScan: boolean,
  includeMetadata: boolean,
): Promise<JsonRecord> {
  const u = normalizeUrl(url);
  const parsed = new URL(u);
  const domain = parsed.hostname;
  const path = parsed.pathname || "/";

  let ip: string | null = null;
  try {
    const r = await dns.lookup(domain);
    ip = r.address;
  } catch {
    /* ignore */
  }

  const results: JsonRecord = {
    status: "success",
    url: u,
    domain,
    path,
    ip_address: ip,
  };

  if (parsed.protocol === "https:") {
    results.ssl_certificate = await checkSsl(domain);
  } else {
    results.ssl_certificate = { valid: false, error: "Not HTTPS" };
  }

  results.dns_records = domain
    ? await checkDns(domain)
    : { error: "No domain" };

  let http: JsonRecord = { error: "fetch_failed" };
  try {
    const fr = await fetchFinalResponse(u);
    const sec: Record<string, string | null> = {};
    for (const k of SECURITY_HEADER_KEYS) {
      sec[k] = fr.headers[k] ?? null;
    }
    const present = SECURITY_HEADER_KEYS.filter((k) =>
      Boolean(fr.headers[k]),
    ).length;
    const pct = Math.round((present / SECURITY_HEADER_KEYS.length) * 100);
    http = {
      headers: fr.headers,
      security_headers: sec,
      status_code: fr.status,
      final_url: fr.finalUrl,
      response_time_ms: null,
    };
    results.http_headers = http;
    results.security_headers_analysis = {
      percentage: pct,
      score: pct,
      max_score: 100,
      headers: Object.fromEntries(
        SECURITY_HEADER_KEYS.map((k) => [
          k,
          { present: Boolean(fr.headers[k]), value: fr.headers[k] ?? null },
        ]),
      ),
    };
    const server = fr.headers.server || fr.headers["x-powered-by"] || "";
    results.technologies = {
      server: server || undefined,
      cms: "",
      framework: "",
      cdn: "",
      languages: [] as string[],
    };
    if (includeMetadata) {
      const htmlRes = await fetch(fr.finalUrl, {
        headers: { "User-Agent": UA },
        signal: AbortSignal.timeout(10000),
      });
      const html = await htmlRes.text();
      const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const descM = html.match(
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
      );
      results.metadata = {
        title: titleM?.[1]?.trim(),
        description: descM?.[1]?.trim(),
      };
    }
  } catch (e) {
    results.http_headers = {
      error: e instanceof Error ? e.message : "http_error",
    };
  }

  results.security_txt = { present: false };
  try {
    const st = await fetch(`https://${domain}/.well-known/security.txt`, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(5000),
    });
    if (st.ok) {
      const c = await st.text();
      results.security_txt = {
        present: true,
        content: c.slice(0, 4000),
        url: st.url,
      };
    }
  } catch {
    /* ignore */
  }

  results.server_location = ip
    ? {
        org: "",
        city: "",
        region: "",
        country: "",
        timezone: "",
        coordinates: undefined as
          | { latitude: number; longitude: number }
          | undefined,
      }
    : { error: "No IP" };

  if (ip) {
    try {
      const geo = await fetch(`https://ipinfo.io/${ip}/json`, {
        signal: AbortSignal.timeout(3000),
      });
      if (geo.ok) {
        const j = (await geo.json()) as JsonRecord;
        const loc = (j.loc as string | undefined)?.split(",");
        results.server_location = {
          org: String(j.org ?? ""),
          city: String(j.city ?? ""),
          region: String(j.region ?? ""),
          country: String(j.country ?? ""),
          timezone: String(j.timezone ?? ""),
          coordinates:
            loc && loc.length === 2
              ? { latitude: Number(loc[0]), longitude: Number(loc[1]) }
              : undefined,
        };
      }
    } catch {
      /* ignore */
    }
  }

  results.port_scan =
    includePortScan && ip
      ? {
          open_ports: [] as number[],
          closed_ports: [] as number[],
          error: "port_scan_not_implemented",
        }
      : {
          open_ports: [],
          closed_ports: [],
          error: includePortScan ? undefined : "skipped",
        };

  const findings: Array<{
    severity: "info" | "low" | "medium" | "high";
    title: string;
    detail: string;
  }> = [];
  const ssl = results.ssl_certificate as JsonRecord;
  if (!ssl?.valid) {
    findings.push({
      severity: "high",
      title: "TLS certificate",
      detail: String(ssl?.error || "invalid"),
    });
  }
  results.findings = findings;
  results.recommendations = [] as string[];
  results.scan_profile = includePortScan ? "full" : "fast";
  results.summary = {
    https: parsed.protocol === "https:",
    redirect_hops: 0,
    cookie_count: 0,
    open_port_count: 0,
    missing_header_count: 0,
    security_txt_present: Boolean((results.security_txt as JsonRecord).present),
  };

  return results;
}

export async function runSeoChecks(url: string): Promise<JsonRecord> {
  const u = normalizeUrl(url);
  const checks: Record<
    string,
    { status: "pass" | "warn" | "fail"; detail: string }
  > = {};
  let score = 0;
  try {
    const fr = await fetchFinalResponse(u);
    const htmlRes = await fetch(fr.finalUrl, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(10000),
    });
    const html = await htmlRes.text();
    const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleM?.[1]?.trim() ?? "";
    if (title.length >= 30 && title.length <= 70) {
      checks.meta_title = {
        status: "pass",
        detail: "Title length looks reasonable.",
      };
      score += 20;
    } else if (title) {
      checks.meta_title = {
        status: "warn",
        detail: "Title present but length not ideal.",
      };
      score += 10;
    } else {
      checks.meta_title = { status: "fail", detail: "Missing title." };
    }
    const descM = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    );
    const desc = descM?.[1]?.trim() ?? "";
    if (desc.length >= 120) {
      checks.meta_description = {
        status: "pass",
        detail: "Description present.",
      };
      score += 15;
    } else if (desc) {
      checks.meta_description = {
        status: "warn",
        detail: "Description short.",
      };
      score += 8;
    } else {
      checks.meta_description = {
        status: "fail",
        detail: "Missing meta description.",
      };
    }
    checks.robots_txt = { status: "warn", detail: "Not checked in fast path." };
    checks.sitemap_xml = {
      status: "warn",
      detail: "Not checked in fast path.",
    };
    checks.canonical_tag = html.includes('rel="canonical"')
      ? { status: "pass", detail: "Canonical present." }
      : { status: "warn", detail: "No canonical." };
    checks.h1_tag = /<h1[\s>]/i.test(html)
      ? { status: "pass", detail: "H1 present." }
      : { status: "warn", detail: "No H1." };
    checks.og_tags = /property=["']og:title["']/i.test(html)
      ? { status: "pass", detail: "Open Graph tags detected." }
      : { status: "warn", detail: "Limited Open Graph tags." };
    score = Math.min(100, score + 25);
  } catch (e) {
    return {
      checks: {},
      seo_score: 0,
      error: e instanceof Error ? e.message : "seo_error",
    };
  }
  return { checks, seo_score: score };
}

export async function runPerformanceChecks(url: string): Promise<JsonRecord> {
  const key = process.env.PAGESPEED_API_KEY?.trim();
  const u = normalizeUrl(url);
  const strat = async (strategy: "mobile" | "desktop") => {
    const params = new URLSearchParams({ url: u, strategy });
    if (key) params.set("key", key);
    try {
      const r = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`,
        {
          signal: AbortSignal.timeout(25000),
        },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        const msg =
          (j as { error?: { message?: string } }).error?.message ||
          r.statusText;
        return {
          performance_score: null,
          accessibility_score: null,
          best_practices_score: null,
          lcp: null,
          fid: null,
          cls: null,
          error: msg,
        };
      }
      const data = (await r.json()) as JsonRecord;
      const cats = (data.lighthouseResult as JsonRecord)?.categories as
        | Record<string, { score?: number }>
        | undefined;
      const perf =
        cats?.performance?.score != null
          ? Math.round(cats.performance.score * 100)
          : null;
      const a11y =
        cats?.accessibility?.score != null
          ? Math.round(cats.accessibility.score * 100)
          : null;
      const bp =
        cats?.["best-practices"]?.score != null
          ? Math.round(cats["best-practices"].score * 100)
          : null;
      return {
        performance_score: perf,
        accessibility_score: a11y,
        best_practices_score: bp,
        lcp: null,
        fid: null,
        cls: null,
        error: null,
      };
    } catch (e) {
      return {
        performance_score: null,
        accessibility_score: null,
        best_practices_score: null,
        lcp: null,
        fid: null,
        cls: null,
        error: e instanceof Error ? e.message : "pagespeed_error",
      };
    }
  };
  const [mobile, desktop] = await Promise.all([
    strat("mobile"),
    strat("desktop"),
  ]);
  return { mobile, desktop };
}

function statusScore(s: string): number {
  return s === "pass" ? 1 : s === "warn" ? 0.5 : 0;
}

function calculateSecurityScore(security: JsonRecord): number {
  const ssl = security.ssl_certificate as JsonRecord | undefined;
  const sslStatus = ssl?.valid ? "pass" : "fail";
  const pct = (security.security_headers_analysis as JsonRecord)?.percentage as
    | number
    | undefined;
  let hdr = "fail";
  if (typeof pct === "number") {
    if (pct >= 70) hdr = "pass";
    else if (pct >= 30) hdr = "warn";
  }
  const st = security.security_txt as JsonRecord | undefined;
  const stStatus = st?.present ? "pass" : "fail";
  const w = { ssl: 50, security_headers: 40, security_txt: 10 };
  const total = w.ssl + w.security_headers + w.security_txt;
  const weighted =
    w.ssl * statusScore(sslStatus) +
    w.security_headers * statusScore(hdr) +
    w.security_txt * statusScore(stStatus);
  return Math.round((weighted / total) * 100);
}

function calculateSeoScore(seo: JsonRecord): number {
  const s = seo.seo_score;
  return typeof s === "number" ? Math.round(s) : 0;
}

function calculatePerformanceScore(perf: JsonRecord): number {
  const m = perf.mobile as JsonRecord | undefined;
  const d = perf.desktop as JsonRecord | undefined;
  const scores = [m?.performance_score, d?.performance_score].filter(
    (x): x is number => typeof x === "number",
  );
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function calculateOverallScore(
  security: JsonRecord,
  seo: JsonRecord,
  performance: JsonRecord,
  includePerformance: boolean,
): { overall: number; security: number; seo: number; performance: number } {
  const sec = calculateSecurityScore(security);
  const se = calculateSeoScore(seo);
  const perf = includePerformance ? calculatePerformanceScore(performance) : 0;
  let overall: number;
  if (includePerformance) {
    overall = Math.round(sec * 0.5 + se * 0.3 + perf * 0.2);
  } else {
    overall = Math.round(sec * (0.5 / 0.8) + se * (0.3 / 0.8));
  }
  return { overall, security: sec, seo: se, performance: perf };
}

export async function runFullUrlAnalysis(opts: {
  url: string;
  fullScan: boolean;
  includePortScan: boolean;
  includeMetadata: boolean;
  includePerformance: boolean;
  targetId: string | null;
  persist: boolean;
}): Promise<JsonRecord> {
  let u = opts.url.trim();
  if (!u.startsWith("http://") && !u.startsWith("https://")) u = `https://${u}`;
  const full = opts.fullScan;
  let includePort = opts.includePortScan;
  let includeMeta = opts.includeMetadata;
  let includePerf = opts.includePerformance;
  if (full) {
    includePort = true;
    includeMeta = true;
    includePerf = true;
  }
  const security = await analyzeWebSecurity(u, includePort, includeMeta);
  const seo = await runSeoChecks(u);
  const performance = includePerf
    ? await runPerformanceChecks(u)
    : {
        mobile: { performance_score: null, error: "skipped_fast_scan" },
        desktop: { performance_score: null, error: "skipped_fast_scan" },
      };
  const scores = calculateOverallScore(security, seo, performance, includePerf);
  security.seo = seo;
  security.performance = performance;
  security.lighthouse_ran = includePerf;
  security.scores = scores;
  Object.assign(security, scores);
  if (opts.persist) {
    const reportId = randomUUID();
    security.report_id = reportId;
    security.report_url = `/dashboard/report/${reportId}`;
    const { queryRows } = await import("@/server/db/postgres");
    const { syncTargetSearchConsole } = await import(
      "@/server/integrations/gsc-api"
    );
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const owner = opts.targetId
      ? await resolveTargetOwner(opts.targetId)
      : null;
    await queryRows(
      `
        insert into monix_scans (
          target_id, report_id, url, score, results, is_expired, expires_at
        )
        values ($1::uuid, $2::uuid, $3, $4, $5::jsonb, false, $6::timestamptz)
      `,
      [
        opts.targetId,
        reportId,
        u,
        scores.overall,
        JSON.stringify(security),
        expires.toISOString(),
      ],
    );
    if (owner && opts.targetId) {
      await syncTargetSearchConsole(owner, opts.targetId, u);
    }
  }
  return security;
}

async function resolveTargetOwner(targetId: string): Promise<string | null> {
  const { queryMaybeOne } = await import("@/server/db/postgres");
  const row = await queryMaybeOne<{ owner_id: string }>(
    `
      select owner_id
      from monix_targets
      where id = $1::uuid
      limit 1
    `,
    [targetId],
  );
  return row?.owner_id ?? null;
}
