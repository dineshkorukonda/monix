import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import UrlAnalyzer from "@/components/UrlAnalyzer";

// We use an asynchronous component signature to read params in Next.js App Router (if necessary)
export default async function ProjectWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-4 border-b border-white/5 pb-6">
        <Link href="/dashboard" className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-0.5">Project Workspace</h2>
          <p className="text-xs text-white/40 font-mono">Project Hash: {id}</p>
        </div>
      </div>
      
      <div className="pt-2">
        <Suspense fallback={<div className="h-40 flex items-center justify-center text-white/40">Initializing AI Analyzer Engine...</div>}>
          <UrlAnalyzer />
        </Suspense>
      </div>
    </div>
  );
}
