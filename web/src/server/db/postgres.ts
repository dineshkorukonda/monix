import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function databaseUrl(): string {
  const value =
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim() || "";
  if (!value) {
    throw new Error("Set DATABASE_URL for local Postgres access.");
  }
  return value;
}

function shouldUseSsl(url: string): boolean {
  return !/(localhost|127\.0\.0\.1)/i.test(url);
}

function normalizedConnectionString(raw: string): string {
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  url.searchParams.delete("sslcert");
  url.searchParams.delete("sslkey");
  url.searchParams.delete("sslrootcert");
  return url.toString();
}

function getPool(): Pool {
  if (!pool) {
    const rawUrl = databaseUrl();
    const url = normalizedConnectionString(rawUrl);
    pool = new Pool({
      connectionString: url,
      ssl: shouldUseSsl(rawUrl) ? { rejectUnauthorized: true } : false,
      max: Number(process.env.DB_POOL_MAX) || 20,
    });
  }
  return pool;
}

export async function queryRows<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryMaybeOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await queryRows<T>(text, params);
  return rows[0] ?? null;
}

export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T> {
  const row = await queryMaybeOne<T>(text, params);
  if (!row) {
    throw new Error("Expected one row.");
  }
  return row;
}
