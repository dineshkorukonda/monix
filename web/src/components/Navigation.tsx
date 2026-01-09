"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "HOME" },
    { href: "/web", label: "MONIX_WEB" },
    { href: "/docs", label: "DOCS" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 bg-black border-b border-white/10 font-mono">
      <div className="container mx-auto px-6 max-w-[1600px]">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="group flex items-center gap-4">
            <Image
              src="/logo.png"
              alt="MONIX"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
            <span className="text-xl font-bold tracking-tighter">
              [ MONIX ]
            </span>
            <span className="text-[10px] text-white/40 tracking-[0.2em] hidden sm:inline group-hover:text-white transition-colors">
              AUTONOMOUS_SERVER_DEFENSE
            </span>
          </Link>

          <div className="flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-[11px] font-bold tracking-widest transition-colors ${
                  isActive(item.href)
                    ? "text-white underline underline-offset-4"
                    : "text-white/40 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
