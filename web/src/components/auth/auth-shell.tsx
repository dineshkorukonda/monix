import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">
      <header className="fixed left-0 top-0 z-10 p-6">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-white hover:text-zinc-300 transition-colors"
        >
          Monix
        </Link>
      </header>
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
        <div className="w-full max-w-[360px] space-y-8">{children}</div>
      </main>
    </div>
  );
}
