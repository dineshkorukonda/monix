"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DkSitesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/radar");
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center font-mono text-xs text-muted-foreground">
      Redirecting to /radar...
    </div>
  );
}
