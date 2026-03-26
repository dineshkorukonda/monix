"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthMode = "login" | "signup" | "reset";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "reset") {
      alert("Password reset link sent to your email.");
      setMode("login");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2 bg-background font-sans">
      {/* Left side: Immersive Visual Canvas */}
      <div className="hidden lg:flex flex-col justify-center items-center overflow-hidden bg-muted relative">
        <div className="absolute inset-0 bg-sidebar">
          {/* Enhanced geometric mesh canvas */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 backdrop-blur-3xl"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:48px_48px] opacity-[0.15]"></div>
          {/* Abstract interactive visual representation */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse"></div>
          <div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/20 rounded-full blur-[80px] animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <Link
          href="/"
          className="absolute top-10 left-10 z-10 flex items-center font-bold text-3xl tracking-tighter text-foreground hover:opacity-80 transition-opacity"
        >
          Monix.
        </Link>
      </div>

      {/* Right side: Auth Form */}
      <div className="flex flex-col items-center justify-center px-6 md:px-10 lg:px-16 h-screen overflow-y-auto">
        <div className="w-full max-w-sm mx-auto space-y-8">
          <div className="flex flex-col space-y-2 text-center lg:text-left">
            <Link
              href="/"
              className="lg:hidden mb-6 font-bold text-2xl tracking-tighter text-foreground text-center"
            >
              Monix.
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {mode === "login" && "Welcome back"}
              {mode === "signup" && "Create an account"}
              {mode === "reset" && "Reset your password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "login" &&
                "Enter your credentials to access your workspaces."}
              {mode === "signup" &&
                "Enter your details to register your new monix profile."}
              {mode === "reset" &&
                "We will email you a secure link to reset your key."}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-6"
            >
              <div className="space-y-5">
                {/* Full name only injected for Sign Up */}
                {mode === "signup" && (
                  <div className="space-y-2.5">
                    <Label htmlFor="fullname">Full Name</Label>
                    <Input
                      id="fullname"
                      placeholder="John Doe"
                      required
                      className="bg-input/30 border-border h-11"
                    />
                  </div>
                )}

                {/* Email is globally ubiquitous */}
                <div className="space-y-2.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    className="bg-input/30 border-border h-11"
                  />
                </div>

                {/* Password removed for Reset Mode */}
                {mode !== "reset" && (
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="password">Password</Label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => setMode("reset")}
                          className="text-sm text-primary hover:underline hover:text-foreground transition-all font-medium"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      required
                      className="bg-input/30 border-border h-11"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full font-semibold transition-all h-11 text-[15px] shadow-sm active:scale-[0.98]"
              >
                {mode === "login" && "Sign In"}
                {mode === "signup" && "Create Account"}
                {mode === "reset" && "Send Reset Link"}
              </Button>

              {/* Mode Transition Links */}
              <div className="text-center text-sm text-muted-foreground mt-6 space-y-4">
                {mode === "login" && (
                  <div>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className="text-foreground hover:underline font-medium"
                    >
                      Sign up
                    </button>
                  </div>
                )}
                {mode === "signup" && (
                  <div>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-foreground hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </div>
                )}
                {mode === "reset" && (
                  <div>
                    Remember your password?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-foreground hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </div>
                )}
              </div>
            </motion.form>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
