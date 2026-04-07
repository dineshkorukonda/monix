"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";

const WorldMap = dynamic(() => import("@/components/WorldMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-zinc-900" />
  ),
});

export function MapSection() {
  const reduce = useReducedMotion();
  const anim = reduce
    ? {}
    : { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } as const };

  return (
    <section className="border-t border-white/10 px-6 py-16 md:py-24">
      <div className="mx-auto max-w-6xl">
        <motion.div {...anim} className="mb-12 md:flex md:items-end md:justify-between md:gap-12">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">
              Infrastructure
            </p>
            <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
              Geo and hosting context
            </h2>
          </div>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-white/45 md:mt-0 md:text-right">
            Reports show where resolved infrastructure sits alongside DNS,
            TLS, and headers. The map is illustrative—not a live threat
            feed.
          </p>
        </motion.div>
        <motion.div
          initial={reduce ? {} : { opacity: 0, y: 24 }}
          whileInView={reduce ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="relative overflow-hidden border border-white/10"
          style={{ height: "min(480px, 65vh)" }}
        >
          <WorldMap />
          <div className="pointer-events-none absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/90 to-transparent px-6 py-4">
            <p className="text-center font-mono text-[10px] text-white/30">
              MapLibre · Carto Dark
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
