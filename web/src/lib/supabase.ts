import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  // Back-compat with existing env naming in this repo
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  "";

const canInit =
  typeof window !== "undefined" &&
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey);

if (!canInit && typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

// On the server (prerender/build), Supabase client is intentionally not created.
export const supabase = canInit
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
