"use client";

import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import {
  ApiError,
  logout as apiLogout,
  login,
  requestPasswordReset,
  signup,
} from "@/lib/api";
import { describeAuthError, isGoogleAuthUiEnabled } from "@/lib/auth-errors";
import { getStoredAuthSession } from "@/lib/local-auth";

type AuthMode = "login" | "signup" | "reset";

const fieldClassName =
  "w-full rounded-sm border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <title>Google</title>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [passwordUpdatedBanner, setPasswordUpdatedBanner] = useState(false);

  useEffect(() => {
    const session = getStoredAuthSession();
    setSessionEmail(session?.email || null);
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("reset") === "success") {
      setPasswordUpdatedBanner(true);
      window.history.replaceState({}, "", "/login");
    }
    if (sp.get("error") === "google_auth_failed") {
      setError(
        "Google sign-in failed. Please try again or use email/password.",
      );
      window.history.replaceState({}, "", "/login");
    }
  }, []);

  const switchMode = (next: AuthMode) => {
    setError("");
    setResetEmailSent(false);
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reset") {
      setError("");
      setIsSubmitting(true);
      try {
        await requestPasswordReset(email.trim());
        setResetEmailSent(true);
      } catch (err) {
        setError(describeAuthError(err));
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signup({
          full_name: fullName.trim(),
          email: email.trim(),
          password,
        });
      } else {
        await login(email.trim(), password);
      }
      window.location.assign("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401 && mode === "login") {
          setError(describeAuthError(err.message));
        } else if (err.status === 401) {
          setError(
            "Could not create your session. Sign out below if you are already signed in, then try again.",
          );
        } else {
          setError(describeAuthError(err.message));
        }
      } else {
        setError(describeAuthError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    login: "Sign in to Monix",
    signup: "Create your account",
    reset: "Reset your password",
  };

  const subtitles: Record<AuthMode, string> = {
    login: "Manage monitored sites and access saved reports",
    signup: "Get started with automated site monitoring",
    reset: "We will email you a link to choose a new password",
  };

  return (
    <AuthShell>
      {passwordUpdatedBanner ? (
        <p className="rounded-sm border border-border bg-secondary/80 p-3 text-xs text-foreground font-mono">
          Password updated. Sign in with your new password.
        </p>
      ) : null}

      {sessionChecked && sessionEmail ? (
        <div className="rounded-sm border border-border bg-secondary/80 p-3.5 text-xs text-muted-foreground font-mono">
          <p>
            You are signed in as{" "}
            <span className="font-semibold text-foreground">
              {sessionEmail}
            </span>
            .
          </p>
          <button
            type="button"
            className="mt-2 text-accent underline underline-offset-2 hover:opacity-80 transition-opacity"
            onClick={async () => {
              try {
                await apiLogout();
              } finally {
                setSessionEmail(null);
                window.location.reload();
              }
            }}
          >
            Sign out
          </button>
        </div>
      ) : null}

      {mode === "reset" && resetEmailSent ? (
        <p className="rounded-sm border border-border bg-secondary/80 p-3 text-xs text-foreground font-mono">
          If an account exists for that email, we sent a link to set a new
          password.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
          {titles[mode]}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {subtitles[mode]}
        </p>
      </div>

      {mode !== "reset" && isGoogleAuthUiEnabled() ? (
        <div className="space-y-4">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-sm border border-border bg-card py-2.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 cursor-pointer"
            onClick={() => {
              window.location.assign("/api/auth/google/");
            }}
            disabled={isSubmitting}
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              or
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" ? (
          <input
            type="text"
            name="fullName"
            placeholder="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={fieldClassName}
            autoComplete="name"
          />
        ) : null}

        <input
          type="email"
          name="email"
          placeholder="name@example.com"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClassName}
        />

        {mode !== "reset" ? (
          <input
            type="password"
            name="password"
            placeholder="Password"
            required
            minLength={8}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={fieldClassName}
          />
        ) : null}

        {error ? (
          <p className="rounded-sm border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive font-mono">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-sm bg-accent py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting
            ? mode === "login"
              ? "Signing in…"
              : mode === "signup"
                ? "Creating account…"
                : "Sending reset link…"
            : mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground pt-2 border-t border-border">
        {mode === "login" ? (
          <>
            <button
              type="button"
              className="font-medium text-foreground hover:text-accent transition-colors cursor-pointer"
              onClick={() => switchMode("signup")}
            >
              Create account
            </button>
            <button
              type="button"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => switchMode("reset")}
            >
              Forgot password?
            </button>
          </>
        ) : mode === "signup" ? (
          <button
            type="button"
            className="font-medium text-foreground hover:text-accent transition-colors cursor-pointer"
            onClick={() => switchMode("login")}
          >
            Already have an account? Sign in
          </button>
        ) : (
          <button
            type="button"
            className="font-medium text-foreground hover:text-accent transition-colors cursor-pointer"
            onClick={() => switchMode("login")}
          >
            Back to sign in
          </button>
        )}
      </div>
    </AuthShell>
  );
}
