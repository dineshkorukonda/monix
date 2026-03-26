"use client";

import {
  Activity,
  ArrowRight,
  Globe,
  Plus,
  Server,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Target } from "@/lib/api";

export default function DashboardOverviewPage() {
  const [projects, setProjects] = useState<Target[]>([]);

  useEffect(() => {
    fetch("/api/targets/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch targets");
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => {
        setProjects([
          {
            id: "django-offline",
            name: "Backend Offline",
            url: "localhost:8000",
            environment: "Disconnected",
            ip: "127.0.0.1",
            location: "Disconnected",
            activity:
              "Django backend is unreachable. Start the backend to view live targets.",
            status: "Warning",
            lastScan: "Never",
            score: 0,
          },
        ]);
      });
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Monitored Targets
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Select a target to view its complete security report engine.
          </p>
        </div>
        <Button
          asChild
          className="font-semibold gap-2 shadow-sm bg-foreground text-background hover:bg-foreground/90"
        >
          <Link href="/dashboard/new">
            <Plus className="h-4 w-4" />
            Add Target
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/dashboard/project/${project.id}?url=${encodeURIComponent(project.url)}`}
            className="flex flex-col justify-between h-full bg-card text-card-foreground border border-border hover:border-foreground/30 transition-all shadow-sm rounded-xl p-5 group cursor-pointer"
          >
            <div className="space-y-5">
              {/* Top Row: Avatar & Name */}
              <div className="flex justify-between items-start">
                <div className="flex gap-3.5 items-center">
                  <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold shadow-sm">
                    {project.name.charAt(0)}
                  </div>
                  <div className="truncate pr-4">
                    <h3 className="text-[15px] font-semibold tracking-tight truncate group-hover:underline underline-offset-2">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {project.url}
                    </p>
                  </div>
                </div>
                <div className="h-8 w-8 rounded-full border border-border/50 flex flex-col items-center justify-center bg-muted/30 group-hover:bg-foreground group-hover:text-background transition-colors shrink-0">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              {/* Middle Row: Network Intelligence badge */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1.5 items-center px-2 py-1 bg-muted/60 rounded text-xs text-foreground font-medium border border-border/50">
                  <Server className="h-3 w-3 text-muted-foreground" />
                  {project.ip}
                </div>
                <div className="flex gap-1.5 items-center px-2 py-1 bg-muted/60 rounded text-xs text-muted-foreground font-medium border border-border/50">
                  <Globe className="h-3 w-3" />
                  {project.location}
                </div>
              </div>

              {/* Bottom Row: Recent Security Activity */}
              <div className="pt-1">
                <p className="text-[13px] font-medium leading-snug flex gap-1.5 items-start">
                  <ShieldAlert
                    className={`h-4 w-4 shrink-0 mt-0.5 ${project.status === "Warning" ? "text-amber-500" : "text-emerald-500"}`}
                  />
                  <span className="truncate whitespace-normal line-clamp-2">
                    {project.activity}
                  </span>
                </p>
                <div className="flex items-center justify-between mt-2.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                    <Activity className="h-3 w-3 text-muted-foreground/70" />
                    Latest scan {project.lastScan}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
