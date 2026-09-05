import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-4xl px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <Link
            href="/inspector"
            className="hover:text-foreground transition-colors"
          >
            Inspector
          </Link>
          <Link
            href="/status"
            className="hover:text-foreground transition-colors"
          >
            Status
          </Link>
          <Link
            href="/radar"
            className="hover:text-foreground transition-colors"
          >
            Radar
          </Link>
          <Link
            href="/docs"
            className="hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <a
            href="https://github.com/dineshkorukonda/monix"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>
        <p className="text-[11px]">&copy; {new Date().getFullYear()} Monix</p>
      </div>
    </footer>
  );
}
