"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

function useItemVariants(): Variants {
  const reduce = useReducedMotion();
  if (reduce) return { hidden: {}, show: {} };
  return {
    hidden: { opacity: 0, y: 28 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 280, damping: 30 },
    },
  };
}

export function Hero() {
  const itemVariants = useItemVariants();

  return (
    <section className="relative min-h-[88vh] overflow-hidden px-6 pt-28 pb-16 md:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[64px_64px] mask-[linear-gradient(180deg,black,transparent_85%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-20%] h-[520px] w-[520px] rounded-[40%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.09),transparent_65%)] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-[-10%] h-[380px] w-[380px] bg-[radial-gradient(circle_at_center,rgba(120,120,255,0.06),transparent_70%)] blur-3xl"
      />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_minmax(260px,340px)] lg:items-center lg:gap-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.p
            variants={itemVariants}
            className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/40"
          >
            Monix · analysis workspace
          </motion.p>
          <motion.h1
            variants={itemVariants}
            className="mt-6 text-[2.35rem] font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.5rem]"
          >
            One URL.
            <br />
            <span className="text-white/75">Three lenses.</span>
            <br />
            Zero guesswork.
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="mt-8 max-w-xl text-base leading-relaxed text-white/50 md:text-lg"
          >
            Category scores for security, SEO, and performance—plus
            persisted reports, monitored sites, and optional Google Search
            Console and Cloudflare metrics when you connect accounts. Sign
            in to run analyses and keep everything organized.
          </motion.p>
          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-white bg-white px-8 py-3.5 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Sign in to Monix
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center justify-center px-6 py-3.5 text-sm font-medium text-white/60 underline decoration-white/25 decoration-1 underline-offset-4 transition-colors hover:text-white hover:decoration-white/50"
            >
              Read documentation
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.35,
            duration: 0.65,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="relative border border-white/15 bg-linear-to-br from-white/[0.06] to-transparent p-6 md:p-8"
        >
          <div className="absolute top-0 left-0 h-8 w-8 border-t-2 border-l-2 border-white/30" />
          <div className="absolute right-0 bottom-0 h-8 w-8 border-r-2 border-b-2 border-white/30" />
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
            Report snapshot
          </p>
          <div className="mt-8 space-y-6">
            {[
              { label: "Security", width: "82%" },
              { label: "SEO", width: "68%" },
              { label: "Performance", width: "74%" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs font-medium text-white/50">
                  <span>{row.label}</span>
                  <span className="font-mono text-white/35">—</span>
                </div>
                <div className="mt-2 h-1.5 w-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: row.width }}
                    transition={{
                      delay: 0.6,
                      duration: 1,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    className="h-full bg-white/70"
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-10 border-t border-white/10 pt-6 text-xs leading-relaxed text-white/35">
            Illustrative bars—your real scores appear after you run an
            analysis in the app.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
