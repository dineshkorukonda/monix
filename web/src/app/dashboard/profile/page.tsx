"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  changePassword,
  getMe,
  type UserProfile,
  updateProfile,
} from "@/lib/api";

type Status = { type: "success" | "error"; message: string } | null;

function StatusAlert({ status }: { status: Status }) {
  if (!status) return null;
  const isSuccess = status.type === "success";
  return (
    <div
      className={`flex items-center gap-2.5 text-sm rounded-md px-4 py-3 border ${
        isSuccess
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
          : "bg-destructive/10 border-destructive/20 text-destructive"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {status.message}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<Status>(null);
  const [isSavingPw, setIsSavingPw] = useState(false);

  useEffect(() => {
    getMe()
      .then((data) => {
        setProfile(data);
        setFirstName(data.first_name);
        setLastName(data.last_name);
      })
      .catch(() => {
        setNameStatus({
          type: "error",
          message: "Could not load profile. Is the Django backend running?",
        });
      });
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingName(true);
    setNameStatus(null);
    try {
      const result = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      setNameStatus({
        type: "success",
        message: `Saved! Display name is now "${result.name}".`,
      });
    } catch (err: unknown) {
      setNameStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save.",
      });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwStatus({
        type: "error",
        message: "New password must be at least 8 characters.",
      });
      return;
    }
    setIsSavingPw(true);
    setPwStatus(null);
    try {
      await changePassword(oldPassword, newPassword);
      setPwStatus({
        type: "success",
        message: "Password updated successfully.",
      });
      setOldPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      setPwStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to update password.",
      });
    } finally {
      setIsSavingPw(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          User Profile
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Update your personal account details and manage your access
          credentials.
          {profile && (
            <span className="ml-2 text-foreground/60 font-mono text-xs">
              @{profile.username}
            </span>
          )}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Display Name */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>
              This name appears across your Monix workspaces and scan reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveName} className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-3 md:max-w-md">
                <div className="flex-1">
                  <label
                    htmlFor="first-name"
                    className="text-xs font-medium text-muted-foreground mb-1.5 block"
                  >
                    First Name
                  </label>
                  <input
                    id="first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="last-name"
                    className="text-xs font-medium text-muted-foreground mb-1.5 block"
                  >
                    Last Name
                  </label>
                  <input
                    id="last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  />
                </div>
              </div>
              <StatusAlert status={nameStatus} />
              <div>
                <Button
                  type="submit"
                  disabled={isSavingName}
                  className="font-semibold shadow-sm bg-foreground text-background gap-2"
                >
                  {isSavingName && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSavingName ? "Saving..." : "Save Updates"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="bg-card border-border shadow-sm">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Update your account password. New password must be at least 8
              characters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleChangePassword}
              className="grid gap-4 md:max-w-md"
            >
              <div className="grid gap-2 text-sm font-medium">
                <label htmlFor="old-password">Current Password</label>
                <input
                  id="old-password"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <div className="grid gap-2 text-sm font-medium">
                <label htmlFor="new-password">New Password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                />
              </div>
              <StatusAlert status={pwStatus} />
              <div className="pt-1">
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={isSavingPw || !oldPassword || !newPassword}
                  className="font-semibold shadow-sm w-full md:w-auto border border-border gap-2"
                >
                  {isSavingPw && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSavingPw ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
