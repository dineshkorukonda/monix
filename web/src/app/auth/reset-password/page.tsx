"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { confirmPasswordReset } from "@/lib/api";
import { describeAuthError } from "@/lib/auth-errors";

const fieldClassName =
  "w-full rounded-sm border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors";

/**
 * Landing page for Monix password recovery links.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const resetToken =
      new URLSearchParams(window.location.search).get("token") || "";
    setToken(resetToken);
    setReady(Boolean(resetToken));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await confirmPasswordReset(token, password);
      router.replace("/login?reset=success");
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
          Set a new password
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {ready
            ? "Choose a new password for your account."
            : "Open the reset link from your email on this device."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          name="password"
          placeholder="New password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={!ready}
          className={fieldClassName}
        />

        {error ? (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive font-mono">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!ready || submitting}
          className="w-full rounded-sm bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>

      <p className="text-center text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border">
        <Link
          href="/login"
          className="font-medium text-foreground hover:text-accent transition-colors"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
