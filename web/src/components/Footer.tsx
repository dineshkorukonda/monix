import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-black py-8 font-mono text-xs text-muted-foreground">
      <div className="mx-auto max-w-4xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>Developed by</span>
          <a
            href="https://dineshkorukonda.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00ff66] hover:underline"
          >
            dineshkorukonda.in
          </a>
          <span>•</span>
          <span>Open Website Diagnostic Tool</span>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-[#00ff66] transition-colors">
            Inspector
          </Link>
          <Link href="/docs" className="hover:text-[#00ff66] transition-colors">
            Docs
          </Link>
          <a
            href="https://github.com/dineshkorukonda/monix"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#00ff66] transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
