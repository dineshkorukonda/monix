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
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6 md:h-16">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground"
        >
          MONIX
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 text-xs font-medium tracking-wide transition-colors sm:text-sm ${
                  active
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/login"
            className="ml-2 border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary sm:text-sm"
          >
            Sign in
          </Link>
        </nav>
      </div>
    </header>
  );
}
