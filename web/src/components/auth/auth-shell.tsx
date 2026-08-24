import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-[#E8E6E1] selection:text-foreground">
      <header className="fixed left-0 top-0 z-10 p-6">
        <Link
          href="/"
          className="font-mono text-sm font-semibold tracking-[0.2em] text-foreground hover:opacity-80 transition-opacity"
        >
          MONIX
        </Link>
      </header>
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-[400px] border border-border bg-card p-8 space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
