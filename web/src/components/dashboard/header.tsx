"use client";

// DashboardHeader — 64 px top bar with site selector, search, actions.
// Single Responsibility: top-of-page chrome only.

import { Bell, LogOut, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMe, getTargets, logout, type Target, type UserProfile } from "@/lib/api";

// ── Site selector ─────────────────────────────────────────────────────────────

function SiteSelector() {
  const [sites, setSites] = useState<Target[]>([]);

  useEffect(() => {
    getTargets()
      .then(setSites)
      .catch(() => {});
  }, []);

  if (sites.length === 0) return null;

  return (
    <div className="relative hidden sm:flex items-center">
      <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <select
        className="pl-8 pr-6 h-8 rounded-md border border-border bg-background text-sm text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer max-w-[180px]"
        defaultValue=""
        onChange={(e) => {
          const site = sites.find((s) => s.id === e.target.value);
          if (site) {
            window.location.href = `/dashboard/site/${site.id}`;
          }
        }}
      >
        <option value="" disabled>
          Select a site…
        </option>
        {sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── User avatar button ────────────────────────────────────────────────────────

function UserMenu() {
  const [user, setUser] = useState<Pick<UserProfile, "name" | "initials" | "avatar_url"> | null>(null);

  useEffect(() => {
    getMe()
      .then((data) =>
        setUser({
          name: data.name,
          initials: data.initials,
          avatar_url: data.avatar_url ?? null,
        }),
      )
      .catch(() => {});
  }, []);

  return (
    <Link
      href="/dashboard/profile"
      className="h-8 w-8 rounded-full bg-accent border border-border flex items-center justify-center text-xs font-bold text-foreground hover:bg-muted transition-all overflow-hidden"
      title={user?.name ?? "Account"}
    >
      {user?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.avatar_url}
          alt={user.name ?? "Profile"}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        user?.initials ?? ".."
      )}
    </Link>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

export function DashboardHeader() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
    } finally {
      router.replace("/login");
      setSigningOut(false);
    }
  };

  return (
    <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20">
      {/* Left: site selector */}
      <div className="flex items-center gap-3">
        <SiteSelector />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <Button
          asChild
          size="sm"
          className="gap-1.5 bg-foreground text-background hover:bg-foreground/90 border-0 hidden sm:inline-flex"
        >
          <Link href="/dashboard/sites">
            <Plus className="h-3.5 w-3.5" />
            Run Scan
          </Link>
        </Button>

        <button
          type="button"
          className="h-8 w-8 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleLogout}
          disabled={signingOut}
          className="h-8 px-2.5 gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">
            {signingOut ? "Signing out…" : "Logout"}
          </span>
        </Button>

        <UserMenu />
      </div>
    </header>
  );
}
