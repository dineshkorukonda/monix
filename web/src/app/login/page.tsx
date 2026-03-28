"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Lock, Mail, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, login, signup } from "@/lib/api";

const DJANGO_BASE = process.env.NEXT_PUBLIC_DJANGO_URL || "http://localhost:8000";

type AuthMode = "login" | "signup" | "reset";

// Animated background nodes for the left panel
const NODE_COUNT = 18;
const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
  id: i,
  x: 10 + Math.random() * 80,
  y: 10 + Math.random() * 80,
  r: 2 + Math.random() * 3,
  delay: Math.random() * 3,
  dur: 3 + Math.random() * 4,
}));

// Connections between nearby nodes
const CONNECTIONS = [
  [0, 3], [1, 5], [2, 7], [3, 8], [4, 9], [5, 10],
  [6, 11], [7, 12], [8, 13], [9, 14], [10, 15], [11, 16],
  [12, 17], [0, 6], [1, 4], [2, 6], [3, 9], [5, 12],
];

function NetworkCanvas() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="xMidYMid slice">
      {CONNECTIONS.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="rgba(52,211,153,0.4)"
          strokeWidth="0.3"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 4 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
        />
      ))}
      {nodes.map((n) => (
        <motion.circle
          key={n.id}
          cx={n.x} cy={n.y} r={n.r}
          fill="rgba(52,211,153,0.7)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: n.dur, repeat: Infinity, delay: n.delay }}
        />
      ))}
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const switchMode = (next: AuthMode) => {
    setError("");
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reset") {
      alert("Password reset is not yet configured.");
      switchMode("login");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signup({ full_name: fullName.trim(), email: email.trim(), password });
      } else {
        await login(email.trim(), password);
      }
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(mode === "login" && err.status === 401 ? "Invalid email or password." : err.message);
      } else {
        setError("Unable to continue right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const titles: Record<AuthMode, string> = {
    login: "Welcome back",
    signup: "Create account",
    reset: "Reset password",
  };

  const subtitles: Record<AuthMode, string> = {
    login: "Sign in to your Monix workspace",
    signup: "Start monitoring your security posture",
    reset: "We'll send you a secure reset link",
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1fr_480px] bg-black">

      {/* ── Left panel: animated visual ──────────────────────── */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-black border-r border-white/[0.06]">
        <NetworkCanvas />
        {/* Glow blobs */}
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-bold tracking-tight text-white">Monix</span>
          </Link>

          {/* Headline */}
          <div className="mt-auto mb-auto space-y-6 max-w-xs">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
                Security posture,<br />
                <span className="text-emerald-400">at a glance.</span>
              </h2>
              <p className="text-sm text-white/40 mt-4 leading-6">
                Scan any URL for vulnerabilities, headers, SSL, SEO, and performance. All in one dashboard.
              </p>
            </motion.div>

            <motion.div
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {[
                "Security headers & SSL analysis",
                "SEO and performance scores",
                "Persistent reports & scan history",
                "Server location mapping",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <p className="text-xs text-white/50">{f}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <p className="text-[10px] text-white/20 mt-auto">© {new Date().getFullYear()} Monix Security</p>
        </div>
      </div>

      {/* ── Right panel: auth form ────────────────────────────── */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 bg-black">
        <div className="w-full max-w-sm space-y-8">

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 justify-center mb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Monix</span>
          </Link>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + "-head"}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <h1 className="text-2xl font-bold tracking-tight text-white">{titles[mode]}</h1>
              <p className="text-sm text-white/40 mt-1">{subtitles[mode]}</p>
            </motion.div>
          </AnimatePresence>

          {/* Google button — shown on login & signup */}
          {mode !== "reset" && (
            <div className="space-y-3">
              <a
                href={`${DJANGO_BASE}/api/auth/google/`}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-4 py-2.5 text-sm font-medium text-white transition-all"
              >
                <GoogleIcon />
                Continue with Google
              </a>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.07]" />
                <span className="text-[11px] uppercase tracking-widest text-white/25 font-semibold">or</span>
                <div className="flex-1 h-px bg-white/[0.07]" />
              </div>
            </div>
          )}

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition-all"
                  />
                </div>
              </div>

              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-widest text-white/40">Password</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => switchMode("reset")}
                        className="text-xs text-white/35 hover:text-emerald-400 transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 focus:bg-white/[0.06] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-white text-black text-sm font-bold hover:bg-white/90 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
              >
                {isSubmitting
                  ? mode === "signup" ? "Creating account…" : "Signing in…"
                  : mode === "login" ? "Sign in"
                  : mode === "signup" ? "Create account"
                  : "Send reset link"}
              </button>
            </motion.form>
          </AnimatePresence>

          {/* Mode switches */}
          <p className="text-center text-sm text-white/30">
            {mode === "login" && (
              <>Don't have an account?{" "}
                <button type="button" onClick={() => switchMode("signup")}
                  className="text-white font-semibold hover:text-emerald-400 transition-colors">
                  Sign up
                </button>
              </>
            )}
            {mode === "signup" && (
              <>Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")}
                  className="text-white font-semibold hover:text-emerald-400 transition-colors">
                  Sign in
                </button>
              </>
            )}
            {mode === "reset" && (
              <>Remember it?{" "}
                <button type="button" onClick={() => switchMode("login")}
                  className="text-white font-semibold hover:text-emerald-400 transition-colors">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
