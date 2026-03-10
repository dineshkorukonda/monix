"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "HOME" },
  { href: "/web", label: "MONIX_WEB" },
  { href: "/docs", label: "DOCS" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-4">
          <span className="text-xl font-bold tracking-tighter text-white">
            [ MONIX ]
          </span>
          <span className="hidden text-[10px] tracking-[0.28em] text-white/35 transition-colors group-hover:text-white/60 sm:inline">
            AUTONOMOUS_WEB_DEFENSE
          </span>
        </Link>

        <div className="flex items-center gap-8">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] font-bold tracking-[0.24em] transition-colors ${
                  active
                    ? "text-white underline underline-offset-6"
                    : "text-white/35 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
