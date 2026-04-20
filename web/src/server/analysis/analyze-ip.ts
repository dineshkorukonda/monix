import dns from "node:dns/promises";

async function reverseDns(ip: string): Promise<string> {
  if (ip === "127.0.0.1" || ip === "0.0.0.0" || ip === "::1" || ip === "::") {
    return "";
  }
  try {
    const host = await dns.reverse(ip);
    return host[0] ?? "";
  } catch {
    return "";
  }
}

async function geoLookup(ip: string): Promise<string> {
  if (
    !ip ||
    ip.startsWith("127.") ||
    ip === "0.0.0.0" ||
    ip === "::1" ||
    ip === "::"
  ) {
    return "";
  }
  try {
    const res = await fetch(`https://ipinfo.io/${ip}/json`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return "";
    const j = (await res.json()) as Record<string, string>;
    const city = j.city ?? "";
    const country = j.country ?? "";
    const org = j.org ?? "";
    let info = city && country ? `${city}, ${country}` : country;
    if (org) info = info ? `${info} | ${org}` : org;
    return info;
  } catch {
    return "";
  }
}

export async function analyzeIpPayload(
  ip: string,
): Promise<Record<string, unknown>> {
  const geo = await geoLookup(ip);
  const hostname = await reverseDns(ip);
  return {
    ip,
    geo_info: geo,
    hostname,
    status: "success",
  };
}
