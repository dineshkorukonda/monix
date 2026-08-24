import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-8 font-mono text-xs text-muted-foreground">
      <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-foreground tracking-wider">
            MONIX
          </span>
          <span>·</span>
          <span>Open Website Diagnostic Tool</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-foreground transition-colors">
            Inspector
          </Link>
          <Link
            href="/docs"
            className="hover:text-foreground transition-colors"
          >
            Docs
          </Link>
          <Link
            href="https://github.com/dineshkorukonda/monix"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </Link>
        </div>
      </div>
    </footer>
  );
}
