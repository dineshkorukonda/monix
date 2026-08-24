"use client";

import { ChevronRight, Plug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAccount } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handlePurge = async () => {
    if (
      !confirm(
        "Are you absolutely sure? This will permanently delete your account and all associated scan data. This action cannot be undone.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await deleteAccount();
      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to purge account data.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Platform Settings
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure your localized Monix interface and manage high-level account
          access.
        </p>
      </div>

      <div className="grid gap-8">
        {/* Experience Block */}
        <div className="grid gap-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">
                Appearance & Localization
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Color Theme</p>
                  <p className="text-sm text-muted-foreground">
                    Select how Monix strictly renders across the HUD.
                  </p>
                </div>
                <select
                  value={mounted ? theme : "system"}
                  onChange={(e) => setTheme(e.target.value)}
                  className="h-9 w-full md:w-48 rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="system">System Default</option>
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>

              <div className="w-full h-px bg-border/40" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-sm">Language Engine</p>
                  <p className="text-sm text-muted-foreground">
                    Default processing language applied to structural security
                    reports.
                  </p>
                </div>
                <select className="h-9 w-full md:w-48 rounded-md border border-input bg-background/50 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Spanish (ES)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Integrations Block */}
        <div className="grid gap-4">
          <Card className="bg-card border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plug className="w-5 h-5 text-accent" />
                  Connected Integrations
                </CardTitle>
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href="/dashboard/integrations">
                    Manage Integrations{" "}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Integrations are optional enhancements. Once you have added
                monitored sites to your account, connect Google Search Console
                for search query analytics and Cloudflare for edge traffic
                metrics.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/dashboard/integrations"
                  className="px-3.5 py-2 rounded-md border border-border bg-secondary/50 text-xs font-medium hover:bg-secondary transition-colors"
                >
                  Google Search Console
                </Link>
                <Link
                  href="/dashboard/integrations/cloudflare"
                  className="px-3.5 py-2 rounded-md border border-border bg-secondary/50 text-xs font-medium hover:bg-secondary transition-colors"
                >
                  Cloudflare API
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Danger Zone */}
        <div className="grid gap-4">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-destructive ml-1">
            Danger Zone
          </h3>
          <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
            <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-6">
              <div className="space-y-1 pb-1">
                <p className="font-semibold text-foreground">
                  Delete Workspace
                </p>
                <p className="text-sm text-muted-foreground max-w-[400px] leading-relaxed">
                  Permanently destroy this dashboard, including all active scan
                  historical data, tracked targets, and API bindings.{" "}
                  <strong className="text-foreground">
                    This cannot be undone.
                  </strong>
                </p>
                {error && (
                  <p className="text-xs text-destructive mt-2">{error}</p>
                )}
              </div>
              <Button
                variant="destructive"
                className="shrink-0 font-semibold shadow-sm"
                onClick={handlePurge}
                disabled={loading}
              >
                {loading ? "Purging..." : "Purge Account"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
