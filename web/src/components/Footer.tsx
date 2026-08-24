import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
          <span className="font-mono font-medium text-foreground">Monix</span>
          <span>·</span>
          <span>Open website intelligence</span>
        </div>

        <div className="flex items-center gap-6 text-xs sm:text-sm">
          <Link
            href="https://github.com/dineshkorukonda"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
          <Link
            href="/docs"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
