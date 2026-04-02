"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { describeAuthError } from "@/lib/auth-errors";
import { supabase } from "@/lib/supabase";

const fieldClassName =
  "w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500";

/**
 * Landing page for Supabase password recovery emails.
 * Add this URL to Supabase → Authentication → URL Configuration → Redirect URLs.
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(describeAuthError(err));
        return;
      }
      router.replace("/login?reset=success");
    } catch (err) {
      setError(describeAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!supabase) {
    return (
      <AuthShell>
        <p className="text-center text-sm text-zinc-500">
          Supabase is not configured.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-white">
          Set a new password
        </h1>
        <p className="text-sm text-zinc-500">
          {ready
            ? "Choose a new password for your account."
            : "Open the reset link from your email on this device. If you already did, wait a moment."}
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
          <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!ready || submitting}
          className="w-full rounded-md bg-white py-2.5 text-sm font-medium text-zinc-950 shadow-sm hover:bg-zinc-100 transition-colors disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Update password"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        <Link
          href="/login"
          className="font-medium text-zinc-300 hover:text-white transition-colors"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
