import { verifySupabaseAccessToken } from "@/server/auth/supabase-jwt";

export async function emailFromBearer(bearerJwt: string): Promise<string> {
  const payload = await verifySupabaseAccessToken(bearerJwt);
  const email =
    (typeof payload.email === "string" && payload.email) ||
    (typeof (payload as { user_metadata?: { email?: string } }).user_metadata
      ?.email === "string" &&
      (payload as { user_metadata?: { email?: string } }).user_metadata
        ?.email) ||
    "";
  return email;
}
