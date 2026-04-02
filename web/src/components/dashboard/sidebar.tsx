"use client";

// Sidebar — fixed 260 px left navigation.
// Single Responsibility: renders navigation structure only.
// Open/Closed: nav items are data-driven; add items without touching logic.

import {
  AlertTriangle,
  BarChart3,
  Globe,
  LayoutDashboard,
  Plug,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Nav item definitions ──────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** How to determine active state */
  matchMode: "exact" | "prefix";
}

const PRIMARY_NAV: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchMode: "exact",
  },
  {
    label: "Sites",
    href: "/dashboard/projects",
    icon: Globe,
    matchMode: "prefix",
  },
  {
    label: "Issues",
    href: "/dashboard/issues",
    icon: AlertTriangle,
    matchMode: "exact",
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    matchMode: "exact",
  },
  {
    label: "Integrations",
    href: "/dashboard/integrations",
    icon: Plug,
    matchMode: "prefix",
  },
];

const BOTTOM_NAV: NavItem[] = [
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    matchMode: "prefix",
  },
];

// ── Sub-component: single nav item ────────────────────────────────────────────

function NavItem({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string | null;
}) {
  const isActive =
    pathname != null &&
    (item.matchMode === "exact"
      ? pathname === item.href
      : pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative group",
        isActive
          ? "bg-accent/80 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-foreground" />
      )}
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0",
          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span>{item.label}</span>
    </Link>
  );
}

// ── NavGroup label ────────────────────────────────────────────────────────────

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
      {children}
    </p>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] shrink-0 h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar overflow-hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border shrink-0">
        <span className="font-semibold text-sm text-foreground tracking-tight">
          Monix
        </span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <NavGroupLabel>Platform</NavGroupLabel>
        {PRIMARY_NAV.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom nav */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3 space-y-0.5">
        {BOTTOM_NAV.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </aside>
  );
}
