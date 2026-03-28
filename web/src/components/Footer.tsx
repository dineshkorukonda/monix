import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-sm text-white/40">
          <span className="font-semibold text-white">Monix</span>
          <span>·</span>
          <span>Built by</span>
          <Link
            href="https://github.com/dineshkorukonda"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-white/70 transition-colors font-medium"
          >
            Dinesh Korukonda
          </Link>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <Link
            href="https://github.com/dineshkorukonda"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition-colors"
          >
            GitHub
          </Link>
          <Link
            href="/docs"
            className="text-white/40 hover:text-white transition-colors"
          >
            Docs
          </Link>
        </div>
      </div>
    </footer>
  );
}
