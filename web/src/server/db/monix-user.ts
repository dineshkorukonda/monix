import { getSupabaseAdmin } from "@/server/db/supabase-admin";

export async function ensureMonixUser(
  userId: string,
  email: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("monix_users").upsert(
    {
      id: userId,
      email: email || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMonixProfile(
  userId: string,
  patch: { first_name?: string; last_name?: string },
): Promise<void> {
  const db = getSupabaseAdmin();
  const row: Record<string, string> = { updated_at: new Date().toISOString() };
  if (patch.first_name !== undefined) row.first_name = patch.first_name;
  if (patch.last_name !== undefined) row.last_name = patch.last_name;
  const { error } = await db.from("monix_users").update(row).eq("id", userId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function getMonixProfile(userId: string): Promise<{
  email: string | null;
  first_name: string;
  last_name: string;
} | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("monix_users")
    .select("email, first_name, last_name")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
