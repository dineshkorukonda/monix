"use client";

import {
  FolderKanban,
  History,
  LayoutDashboard,
  Settings,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const workspace = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
    match: "exact" as const,
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: FolderKanban,
    match: "projects" as const,
  },
  {
    title: "Scan history",
    url: "/dashboard/scans",
    icon: History,
    match: "scans" as const,
  },
];

const account = [
  { title: "Profile", url: "/dashboard/profile", icon: User },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

function navActive(
  pathname: string | null,
  url: string,
  match: "exact" | "projects" | "scans",
  fromProject: boolean,
): boolean {
  if (!pathname) return false;
  if (match === "exact") return pathname === url;
  if (match === "projects") {
    return (
      pathname === "/dashboard/projects" ||
      pathname.startsWith("/dashboard/project/") ||
      (pathname.startsWith("/dashboard/report/") && fromProject)
    );
  }
  if (match === "scans") {
    return (
      pathname === "/dashboard/scans" ||
      (pathname.startsWith("/dashboard/report/") && !fromProject)
    );
  }
  return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromProject = searchParams.get("from") === "project";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60"
        >
          <span className="hidden h-8 w-8 shrink-0 items-center justify-center border border-sidebar-border font-mono text-[11px] font-bold text-sidebar-foreground group-data-[collapsible=icon]:flex">
            M
          </span>
          <span className="truncate font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            Monix
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {workspace.map((item) => {
                const active = navActive(pathname, item.url, item.match, fromProject);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "h-9 rounded-md px-2 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-none",
                      )}
                    >
                      <Link href={item.url} className="gap-3">
                        <item.icon className="h-4 w-4 shrink-0 opacity-90" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6">
          <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {account.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      className={cn(
                        "h-9 rounded-md px-2 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground",
                      )}
                    >
                      <Link href={item.url} className="gap-3">
                        <item.icon className="h-4 w-4 shrink-0 opacity-90" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <p className="text-center text-[10px] text-sidebar-foreground/35 group-data-[collapsible=icon]:hidden">
          Monix security
        </p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
