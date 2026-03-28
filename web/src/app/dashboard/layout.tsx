"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  ApiError,
  logout as doLogout,
  getMe,
  type UserProfile,
} from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<Pick<
    UserProfile,
    "name" | "initials"
  > | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    getMe()
      .then((data) => {
        setUser({ name: data.name, initials: data.initials });
        setAuthChecked(true);
      })
      .catch((err) => {
        if (
          err instanceof ApiError &&
          (err.status === 401 || err.status === 403)
        ) {
          router.replace("/login");
          return;
        }

        setUser({ name: "User", initials: "??" });
        setAuthChecked(true);
      });
  }, [router]);

  const handleLogout = async () => {
    try {
      await doLogout();
    } finally {
      router.push("/login");
    }
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center text-muted-foreground text-sm">
        Validating session...
      </main>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <main className="flex flex-1 flex-col min-h-screen bg-background text-foreground overflow-hidden font-sans">
        <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 px-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer shadow-sm hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background transition-all outline-none">
                {user?.initials ?? ".."}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <p>{user?.name ?? "My Account"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    Workspace Preferences
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 cursor-pointer"
                  onClick={handleLogout}
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">{children}</div>
      </main>
    </SidebarProvider>
  );
}
