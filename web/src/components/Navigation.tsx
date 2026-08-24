"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Inspector" },
    { href: "/docs", label: "Docs" },
  ] as const;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 md:h-16">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground hover:opacity-80 transition-opacity"
        >
          MONIX
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-mono px-2.5 py-1 text-xs tracking-wide transition-colors ${
                  active
                    ? "text-foreground font-semibold border-b border-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
