"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/docs", label: "Docs" },
  ] as const;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 md:h-16">
        <Link
          href="/"
          className="text-sm font-bold tracking-[0.2em] text-white"
        >
          MONIX
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 text-xs font-medium tracking-wide transition-colors sm:text-sm ${
                  active ? "text-white" : "text-white/45 hover:text-white/90"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="ml-2 border border-white/20 px-4 py-2 text-xs font-semibold tracking-wide text-white transition-colors hover:border-white/40 hover:bg-white/5 sm:text-sm"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
