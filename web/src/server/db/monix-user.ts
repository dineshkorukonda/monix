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
  google_sub: string | null;
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

export async function upsertGoogleUser(input: {
  google_sub: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}): Promise<MonixUserRow> {
  const { google_sub, email, first_name, last_name, avatar_url } = input;
  const selectFields = `id, email, first_name, last_name, avatar_url, password_hash,
      reset_token_hash, reset_token_expires_at, google_sub`;

  // 1. Find by google_sub
  const byGoogleSub = await queryMaybeOne<MonixUserRow>(
    `select ${selectFields} from monix_users where google_sub = $1 limit 1`,
    [google_sub],
  );
  if (byGoogleSub) {
    await queryRows(
      `update monix_users
       set first_name = coalesce(nullif($2, ''), first_name),
           last_name  = coalesce(nullif($3, ''), last_name),
           avatar_url = coalesce(nullif($4, ''), avatar_url),
           updated_at = now()
       where google_sub = $1`,
      [google_sub, first_name ?? "", last_name ?? "", avatar_url ?? ""],
    );
    return {
      ...byGoogleSub,
      first_name: (first_name || byGoogleSub.first_name) ?? "",
      last_name: (last_name || byGoogleSub.last_name) ?? "",
      avatar_url: (avatar_url || byGoogleSub.avatar_url) ?? "",
    };
  }

  // 2. Find by email — link google_sub to existing account
  const byEmail = await getMonixUserByEmail(email);
  if (byEmail) {
    await queryRows(
      `update monix_users
       set google_sub = $2,
           avatar_url = coalesce(nullif($3, ''), avatar_url),
           updated_at = now()
       where id = $1::uuid`,
      [byEmail.id, google_sub, avatar_url ?? ""],
    );
    return {
      ...byEmail,
      google_sub,
      avatar_url: avatar_url || byEmail.avatar_url,
    };
  }

  // 3. Create new Google-only user (no password)
  return queryOne<MonixUserRow>(
    `insert into monix_users (
       id, email, google_sub, first_name, last_name, avatar_url, updated_at
     )
     values ($1::uuid, $2, $3, $4, $5, $6, now())
     returning ${selectFields}`,
    [
      randomUUID(),
      email.trim().toLowerCase(),
      google_sub,
      (first_name ?? "").trim(),
      (last_name ?? "").trim(),
      (avatar_url ?? "").trim(),
    ],
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
