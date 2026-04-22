import { randomUUID } from "node:crypto";
import { queryMaybeOne, queryOne, queryRows } from "@/server/db/postgres";

export type MonixUserRow = {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string;
  password_hash: string | null;
  reset_token_hash: string | null;
  reset_token_expires_at: string | null;
};

export async function ensureMonixUser(
  userId: string,
  email: string,
): Promise<void> {
  await queryRows(
    `
      insert into monix_users (id, email, updated_at)
      values ($1::uuid, nullif($2, ''), now())
      on conflict (id) do update
      set email = coalesce(excluded.email, monix_users.email),
          updated_at = now()
    `,
    [userId, email],
  );
}

export async function createMonixUser(input: {
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
}): Promise<MonixUserRow> {
  const fullFirst = (input.first_name ?? "").trim();
  const fullLast = (input.last_name ?? "").trim();
  return queryOne<MonixUserRow>(
    `
      insert into monix_users (
        id, email, password_hash, first_name, last_name, avatar_url, updated_at
      )
      values ($1::uuid, $2, $3, $4, $5, '', now())
      returning id, email, first_name, last_name, avatar_url, password_hash,
        reset_token_hash, reset_token_expires_at
    `,
    [
      randomUUID(),
      input.email.trim().toLowerCase(),
      input.password_hash,
      fullFirst,
      fullLast,
    ],
  );
}

export async function getMonixUserByEmail(
  email: string,
): Promise<MonixUserRow | null> {
  return queryMaybeOne<MonixUserRow>(
    `
      select id, email, first_name, last_name, avatar_url, password_hash,
        reset_token_hash, reset_token_expires_at
      from monix_users
      where lower(email) = lower($1)
      limit 1
    `,
    [email.trim().toLowerCase()],
  );
}

export async function getMonixUserById(
  userId: string,
): Promise<MonixUserRow | null> {
  return queryMaybeOne<MonixUserRow>(
    `
      select id, email, first_name, last_name, avatar_url, password_hash,
        reset_token_hash, reset_token_expires_at
      from monix_users
      where id = $1::uuid
      limit 1
    `,
    [userId],
  );
}

export async function updateMonixProfile(
  userId: string,
  patch: { first_name?: string; last_name?: string; avatar_url?: string },
): Promise<void> {
  await queryRows(
    `
      update monix_users
      set first_name = coalesce($2, first_name),
          last_name = coalesce($3, last_name),
          avatar_url = coalesce($4, avatar_url),
          updated_at = now()
      where id = $1::uuid
    `,
    [
      userId,
      patch.first_name !== undefined ? patch.first_name : null,
      patch.last_name !== undefined ? patch.last_name : null,
      patch.avatar_url !== undefined ? patch.avatar_url : null,
    ],
  );
}

export async function updateMonixPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  await queryRows(
    `
      update monix_users
      set password_hash = $2,
          reset_token_hash = null,
          reset_token_expires_at = null,
          updated_at = now()
      where id = $1::uuid
    `,
    [userId, passwordHash],
  );
}

export async function storePasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAtIso: string,
): Promise<void> {
  await queryRows(
    `
      update monix_users
      set reset_token_hash = $2,
          reset_token_expires_at = $3::timestamptz,
          updated_at = now()
      where id = $1::uuid
    `,
    [userId, tokenHash, expiresAtIso],
  );
}

export async function getMonixProfile(userId: string): Promise<{
  email: string | null;
  first_name: string;
  last_name: string;
  avatar_url: string;
} | null> {
  return queryMaybeOne<{
    email: string | null;
    first_name: string;
    last_name: string;
    avatar_url: string;
  }>(
    `
      select email, first_name, last_name, avatar_url
      from monix_users
      where id = $1::uuid
      limit 1
    `,
    [userId],
  );
}
