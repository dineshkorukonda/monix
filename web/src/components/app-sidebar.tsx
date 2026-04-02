"use client";

import {
  BarChart3,
  Cloud,
  FolderKanban,
  History,
  LayoutDashboard,
  Plug,
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

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  activeWhen?: (pathname: string, fromProject: boolean) => boolean;
};

const workspace: NavItem[] = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: LayoutDashboard,
    activeWhen: (p) => p === "/dashboard",
  },
  {
    title: "Projects",
    url: "/dashboard/projects",
    icon: FolderKanban,
    activeWhen: (p, fromProject) =>
      p === "/dashboard/projects" ||
      p.startsWith("/dashboard/project/") ||
      (p.startsWith("/dashboard/report/") && fromProject),
  },
  {
    title: "Scan History",
    url: "/dashboard/scans",
    icon: History,
    activeWhen: (p, fromProject) =>
      p === "/dashboard/scans" ||
      (p.startsWith("/dashboard/report/") && !fromProject),
  },
];

const analyticsNav: NavItem[] = [
  {
    title: "Search Console",
    url: "/dashboard/analytics",
    icon: BarChart3,
    activeWhen: (p) => p === "/dashboard/analytics",
  },
];

const integrationsNav: NavItem[] = [
  {
    title: "Integrations",
    url: "/dashboard/integrations",
    icon: Plug,
    activeWhen: (p) => p === "/dashboard/integrations",
  },
  {
    title: "Cloudflare",
    url: "/dashboard/integrations/cloudflare",
    icon: Cloud,
    activeWhen: (p) => p.startsWith("/dashboard/integrations/cloudflare"),
  },
];

const account: NavItem[] = [
  {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User,
    activeWhen: (p) => p === "/dashboard/profile",
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
    activeWhen: (p) => p === "/dashboard/settings",
  },
];

function NavGroup({
  label,
  items,
  pathname,
  fromProject,
}: {
  label: string;
  items: NavItem[];
  pathname: string | null;
  fromProject: boolean;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const active = pathname
              ? (item.activeWhen?.(pathname, fromProject) ?? pathname === item.url)
              : false;
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
  );
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
        <NavGroup
          label="Workspace"
          items={workspace}
          pathname={pathname}
          fromProject={fromProject}
        />
        <div className="mt-6">
          <NavGroup
            label="Analytics"
            items={analyticsNav}
            pathname={pathname}
            fromProject={fromProject}
          />
        </div>
        <div className="mt-6">
          <NavGroup
            label="Integrations"
            items={integrationsNav}
            pathname={pathname}
            fromProject={fromProject}
          />
        </div>
        <div className="mt-6">
          <NavGroup
            label="Account"
            items={account}
            pathname={pathname}
            fromProject={fromProject}
          />
        </div>
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
