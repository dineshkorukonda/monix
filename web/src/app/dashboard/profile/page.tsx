"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  return (
    <div className="space-y-8 max-w-4xl pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">User Profile</h2>
        <p className="text-muted-foreground mt-1 text-sm">Update your personal account details and secure your access credentials here.</p>
      </div>
      
      <div className="grid gap-6">
        {/* Name Change Block */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>
              This is the name that will be displayed across your Monix workspaces and scan reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                defaultValue="Dinesh Korukonda"
                className="flex h-10 w-full md:max-w-md rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
              />
              <div>
                <Button className="font-semibold shadow-sm bg-foreground text-background">Save Updates</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Block */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Update your account password. Ensure your new password is at least 12 characters long.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:max-w-md">
              <div className="grid gap-2 text-sm font-medium">
                <label>Current Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <div className="grid gap-2 text-sm font-medium">
                <label>New Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <div className="pt-2">
                <Button variant="secondary" className="font-semibold shadow-sm w-full md:w-auto border border-border">Update Password</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
