"use client";

import { useEffect } from "react";
import { setStoredAuthSession } from "@/lib/local-auth";

const HANDOFF_COOKIE = "monix_auth_handoff";

function readAndClearHandoffCookie(): { token: string; email: string } | null {
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${HANDOFF_COOKIE}=`));
  if (!match) return null;
  const value = match.slice(HANDOFF_COOKIE.length + 1);
  // Clear the cookie
  document.cookie = `${HANDOFF_COOKIE}=; Max-Age=0; Path=/`;
  try {
    return JSON.parse(decodeURIComponent(value)) as { token: string; email: string };
  } catch {
    return null;
  }
}

export default function AuthCompletePage() {
  useEffect(() => {
    const session = readAndClearHandoffCookie();
    if (session?.token && session?.email) {
      setStoredAuthSession({ token: session.token, email: session.email });
      window.location.replace("/dashboard");
    } else {
      window.location.replace("/login?error=google_auth_failed");
    }
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-sm text-zinc-400">Signing you in…</p>
    </div>
  );
}
