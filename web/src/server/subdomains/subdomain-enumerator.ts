import * as dns from "node:dns/promises";
import { queryRows } from "@/server/db/postgres";

export interface DiscoveredSubdomain {
  subdomain: string;
  ips: string[];
  isLive: boolean;
  httpStatus: number | null;
}

export function extractRootDomain(hostnameOrUrl: string): string {
  const cleaned =
    hostnameOrUrl
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      ?.split(":")[0]
      ?.toLowerCase()
      ?.trim() ?? "";
  return cleaned;
}

export async function discoverPassiveSubdomains(
  domain: string,
  customFetch = fetch,
): Promise<string[]> {
  const root = extractRootDomain(domain);
  if (!root) return [];

  const subdomains = new Set<string>();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await customFetch(
      `https://crt.sh/?q=%.${encodeURIComponent(root)}&output=json`,
      {
        headers: {
          "User-Agent": "Monix-Subdomains/1.0",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const entries = (await res.json()) as Array<{
        name_value?: string;
        common_name?: string;
      }>;

      for (const entry of entries) {
        const names = [
          ...(entry.name_value ? entry.name_value.split("\n") : []),
          ...(entry.common_name ? [entry.common_name] : []),
        ];
        for (const rawName of names) {
          const name = rawName.trim().toLowerCase().replace(/^\*\./, "");
          if (name && (name === root || name.endsWith(`.${root}`))) {
            subdomains.add(name);
          }
        }
      }
    }
  } catch {
    // Passive search fallback
  }

  subdomains.add(root);
  return Array.from(subdomains);
}

export async function detectWildcardDns(
  domain: string,
  resolve4Fn = dns.resolve4,
): Promise<string[] | null> {
  const root = extractRootDomain(domain);
  const randomSub = `monix-wildcard-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${root}`;
  try {
    const ips = await resolve4Fn(randomSub);
    return ips && ips.length > 0 ? ips : null;
  } catch {
    return null;
  }
}

export async function resolveAndProbeSubdomain(
  subdomain: string,
  wildcardIps: string[] | null = null,
  resolve4Fn = dns.resolve4,
  customFetch = fetch,
): Promise<DiscoveredSubdomain | null> {
  let ips: string[] = [];
  try {
    ips = await resolve4Fn(subdomain);
  } catch {
    return null;
  }

  if (!ips || ips.length === 0) return null;

  if (wildcardIps && wildcardIps.length > 0) {
    const isWildcardMatch = ips.every((ip) => wildcardIps.includes(ip));
    if (isWildcardMatch && !subdomain.startsWith("www.")) {
      return null;
    }
  }

  let isLive = false;
  let httpStatus: number | null = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await customFetch(`https://${subdomain}`, {
      method: "HEAD",
      headers: { "User-Agent": "Monix-Liveness/1.0" },
      signal: controller.signal,
    }).catch(async () => {
      const retryController = new AbortController();
      const retryTimeout = setTimeout(() => retryController.abort(), 4000);
      return customFetch(`http://${subdomain}`, {
        method: "HEAD",
        headers: { "User-Agent": "Monix-Liveness/1.0" },
        signal: retryController.signal,
      }).finally(() => clearTimeout(retryTimeout));
    });
    clearTimeout(timeoutId);

    if (res?.status) {
      httpStatus = res.status;
      isLive = res.status < 500;
    }
  } catch {
    isLive = false;
  }

  return {
    subdomain,
    ips,
    isLive,
    httpStatus,
  };
}

export async function enumerateSubdomainsForTarget(
  targetId: string,
  targetUrl: string,
  dbQueryRows = queryRows,
  options: {
    customFetch?: typeof fetch;
    resolve4Fn?: (hostname: string) => Promise<string[]>;
  } = {},
): Promise<DiscoveredSubdomain[]> {
  const rootDomain = extractRootDomain(targetUrl);
  if (!rootDomain) return [];

  const passiveList = await discoverPassiveSubdomains(
    rootDomain,
    options.customFetch,
  );
  const wildcardIps = await detectWildcardDns(rootDomain, options.resolve4Fn);

  const results: DiscoveredSubdomain[] = [];

  for (const sub of passiveList) {
    const probed = await resolveAndProbeSubdomain(
      sub,
      wildcardIps,
      options.resolve4Fn,
      options.customFetch,
    );
    if (probed) {
      results.push(probed);
      await dbQueryRows(
        `
          insert into public.subdomains (
            target_id, subdomain, ip_addresses, http_status, is_live, last_probed_at
          )
          values ($1::uuid, $2, $3, $4, $5, now())
          on conflict (target_id, subdomain) do update set
            ip_addresses = excluded.ip_addresses,
            http_status = excluded.http_status,
            is_live = excluded.is_live,
            last_probed_at = now()
        `,
        [
          targetId,
          probed.subdomain,
          probed.ips,
          probed.httpStatus,
          probed.isLive,
        ],
      );
    }
  }

  return results;
}
