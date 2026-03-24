"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/web", label: "Scanner" },
    { href: "/docs", label: "Docs" },
  ];

  return (
    <nav className="fixed top-8 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black px-4 py-2 shadow-2xl backdrop-blur-md">
        <Link href="/" className="mr-4 flex items-center">
          <span className="text-sm font-bold tracking-widest text-white">
            MONIX
          </span>
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <div className="ml-2 flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                  isActive ? "text-black" : "text-white/60 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-pill"
                    className="absolute inset-0 z-0 rounded-full bg-white"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
