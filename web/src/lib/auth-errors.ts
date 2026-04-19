/**
 * Map Supabase Auth errors to actionable copy for the login UI.
 * (Supabase sometimes returns JSON-like strings or generic messages.)
 */

function extractMessage(raw: string): string {
  const t = raw.trim();
  if (!t.startsWith("{")) return t;
  try {
    const j = JSON.parse(t) as {
      msg?: string;
      message?: string;
      error_description?: string;
    };
    return j.msg || j.message || j.error_description || t;
  } catch {
    return t;
  }
}

export function describeAuthError(input: unknown): string {
  let text = "";
  if (typeof input === "string") {
    text = extractMessage(input);
  } else if (input && typeof input === "object" && "message" in input) {
    text = extractMessage(String((input as { message: string }).message));
  } else {
    text = "Something went wrong. Please try again.";
  }

  const lower = text.toLowerCase();
  if (
    lower.includes("provider is not enabled") ||
    lower.includes("unsupported provider") ||
    (lower.includes("validation_failed") && lower.includes("provider"))
  ) {
    return (
      "Google sign-in is turned off for this Supabase project. " +
      "Open Supabase Dashboard → Authentication → Providers → Google, enable it, " +
      "and add your Google OAuth client ID and secret. " +
      "Also add this app’s URL under Authentication → URL Configuration → Redirect URLs."
    );
  }

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    return "Invalid email or password.";
  }

  if (lower.includes("email not confirmed")) {
    return "Confirm your email from the link we sent, then try signing in again.";
  }

  return text;
}

/** Whether to show the Google OAuth button (hide until configured in Supabase). */
export function isGoogleAuthUiEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED !== "false";
}
