"use client";

// Dashboard shell — 3-region layout: sidebar / header / main.
// Single Responsibility: composes layout regions only; no data fetching.

import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left sidebar */}
      <Suspense fallback={null}>
        <Sidebar />
      </Suspense>

      {/* Right pane: header + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1280px] mx-auto px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
