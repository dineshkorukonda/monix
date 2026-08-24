export const MAX_SCAN_REQUESTS_PER_HOUR = 5;
export const SCAN_WINDOW_MS = 60 * 60 * 1000; // 1 hour
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  ip: string;
}

interface MemoryWindow {
  windowStart: number;
  count: number;
}

const memoryStore = new Map<string, MemoryWindow>();

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim();

  return "127.0.0.1";
}

export function checkMemoryRateLimit(
  ip: string,
  limit = MAX_SCAN_REQUESTS_PER_HOUR,
  windowMs = SCAN_WINDOW_MS,
): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(ip);

  if (!entry || now - entry.windowStart >= windowMs) {
    memoryStore.set(ip, { windowStart: now, count: 1 });
    const resetSeconds = Math.max(1, Math.ceil(windowMs / 1000));
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetSeconds,
      ip,
    };
  }

  entry.count += 1;
  const elapsed = now - entry.windowStart;
  const resetSeconds = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));

  if (entry.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
      ip,
    };
  }

  return {
    allowed: true,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetSeconds,
    ip,
  };
}

export async function checkRateLimit(
  ip: string,
  limit = MAX_SCAN_REQUESTS_PER_HOUR,
  windowMs = SCAN_WINDOW_MS,
): Promise<RateLimitResult> {
  const hasDb = Boolean(
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim(),
  );

  if (!hasDb) {
    return checkMemoryRateLimit(ip, limit, windowMs);
  }

  try {
    const { queryMaybeOne, queryRows } = await import("@/server/db/postgres");
    const windowStartThreshold = new Date(Date.now() - windowMs).toISOString();

    // Clean up old records periodically
    await queryRows(
      `delete from monix_rate_limits where window_start < now() - interval '2 hours'`,
    ).catch(() => {});

    // Find current active window for IP
    const existing = await queryMaybeOne<{
      id: string;
      window_start: string;
      request_count: number;
    }>(
      `
        select id, window_start, request_count
        from monix_rate_limits
        where ip_address = $1 and window_start >= $2::timestamptz
        order by window_start desc
        limit 1
      `,
      [ip, windowStartThreshold],
    );

    if (!existing) {
      await queryRows(
        `
          insert into monix_rate_limits (ip_address, window_start, request_count)
          values ($1, now(), 1)
        `,
        [ip],
      );
      const resetSeconds = Math.max(1, Math.ceil(windowMs / 1000));
      return {
        allowed: true,
        limit,
        remaining: Math.max(0, limit - 1),
        resetSeconds,
        ip,
      };
    }

    const newCount = existing.request_count + 1;
    await queryRows(
      `
        update monix_rate_limits
        set request_count = $1
        where id = $2
      `,
      [newCount, existing.id],
    );

    const windowStartTime = new Date(existing.window_start).getTime();
    const elapsed = Date.now() - windowStartTime;
    const resetSeconds = Math.max(1, Math.ceil((windowMs - elapsed) / 1000));

    if (newCount > limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetSeconds,
        ip,
      };
    }

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - newCount),
      resetSeconds,
      ip,
    };
  } catch (error) {
    // If DB check fails, fallback to memory store
    console.warn("Postgres rate limit fallback to memory store:", error);
    return checkMemoryRateLimit(ip, limit, windowMs);
  }
}
