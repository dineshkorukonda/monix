"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/inspector", label: "Inspector" },
    { href: "/docs", label: "Docs" },
  ] as const;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-border bg-black/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-wider text-white hover:text-[#00ff66] transition-colors"
        >
          monix
        </Link>
        <nav className="flex items-center gap-4 sm:gap-6 font-mono text-xs">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors ${
                  active
                    ? "text-[#00ff66] font-semibold"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://github.com/dineshkorukonda/monix"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-white transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}
