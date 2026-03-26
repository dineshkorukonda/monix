"use client";

import { Activity, Globe, LayoutDashboard, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

const data = {
  navMain: [
    {
      title: "Overview",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Active Scans",
      url: "/dashboard/scans",
      icon: Activity,
    },
    {
      title: "Profile",
      url: "/dashboard/profile",
      icon: User,
    },
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="h-[60px] flex justify-center px-6 border-b border-sidebar-border">
        <Link href="/dashboard" className="font-bold text-xl tracking-tight text-sidebar-foreground hover:opacity-80 transition-opacity flex items-center gap-2.5">
          <div className="flex items-center justify-center p-1 bg-foreground rounded shadow-sm">
            <div className="h-3 w-3 rounded-sm bg-background" />
          </div>
          Monix Workspace
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 font-semibold mb-2 mt-4 text-xs tracking-wider px-4 uppercase">
            Platform Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="px-3 gap-1">
              {data.navMain.map((item) => {
                // A soft exact match heuristic for sidebar links to highlight properly.
                const isActive = item.url === "/dashboard" 
                  ? pathname === "/dashboard" 
                  : pathname?.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link 
                        href={item.url} 
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-medium border border-transparent ${
                          isActive 
                            ? "bg-sidebar-accent text-sidebar-accent-foreground border-border shadow-sm pointer-events-none" 
                            : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
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
      <SidebarFooter className="p-4 text-xs font-medium text-sidebar-foreground/30 text-center border-t border-sidebar-border mt-auto">
        Powered by Monix API
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
