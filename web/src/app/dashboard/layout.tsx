"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initials, setInitials] = useState("..");

  useEffect(() => {
    fetch("/api/auth/me/")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.initials) setInitials(data.initials);
      })
      .catch(() => setInitials("??"));
  }, []);

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <main className="flex flex-1 flex-col min-h-screen bg-background text-foreground overflow-hidden font-sans">
        <header className="flex h-[60px] shrink-0 items-center justify-end border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 px-6">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="h-8 w-8 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer shadow-sm hover:ring-2 hover:ring-ring hover:ring-offset-2 hover:ring-offset-background transition-all outline-none">
                {initials}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile" className="cursor-pointer">Profile Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">Workspace Preferences</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 cursor-pointer">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
