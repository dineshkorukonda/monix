import { ArrowRight, CheckCircle2, Shield } from "lucide-react";
import Link from "next/link";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-16 max-w-5xl mx-auto space-y-16">
      <div className="space-y-4 border-b border-border pb-8">
        <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
          Monix Design System
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
          Editorial & Restrained Tokens
        </h1>
        <p className="text-muted-foreground text-base max-w-2xl">
          Light-mode, typography-led visual language inspired by editorial
          technical tools.
        </p>
      </div>

      {/* Color Palette */}
      <section className="space-y-6">
        <h2 className="font-serif text-2xl">Color Palette</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded border border-border bg-background">
            <div className="font-mono text-xs text-muted-foreground">
              Background
            </div>
            <div className="font-mono text-sm font-semibold mt-1">#FAFAF8</div>
          </div>
          <div className="p-4 rounded border border-border bg-card text-foreground">
            <div className="font-mono text-xs text-muted-foreground">
              Foreground
            </div>
            <div className="font-mono text-sm font-semibold mt-1">#161513</div>
          </div>
          <div className="p-4 rounded border border-border bg-secondary">
            <div className="font-mono text-xs text-muted-foreground">
              Muted Text
            </div>
            <div className="font-mono text-sm font-semibold mt-1 text-muted-foreground">
              #6B6862
            </div>
          </div>
          <div className="p-4 rounded border border-accent bg-accent text-accent-foreground">
            <div className="font-mono text-xs opacity-80">Accent Copper</div>
            <div className="font-mono text-sm font-semibold mt-1">#B5622C</div>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="font-serif text-2xl">Typography</h2>
        <div className="border border-border divide-y divide-border bg-card rounded">
          <div className="p-6 space-y-2">
            <span className="font-mono text-xs text-muted-foreground uppercase">
              Heading Serif (Newsreader)
            </span>
            <p className="font-serif text-3xl font-medium">
              One URL. Three lenses. Zero guesswork.
            </p>
          </div>
          <div className="p-6 space-y-2">
            <span className="font-mono text-xs text-muted-foreground uppercase">
              Body Sans (Inter)
            </span>
            <p className="text-base text-muted-foreground leading-relaxed">
              Category scores for security, SEO, and performance—plus persisted
              reports and monitored sites.
            </p>
          </div>
          <div className="p-6 space-y-2">
            <span className="font-mono text-xs text-muted-foreground uppercase">
              Monospace (JetBrains Mono)
            </span>
            <p className="font-mono text-sm">
              score: 96/100 | host: monix.dev | latency: 42ms
            </p>
          </div>
        </div>
      </section>

      {/* Buttons & Interactive Elements */}
      <section className="space-y-6">
        <h2 className="font-serif text-2xl">Interactive Elements</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            type="button"
            className="px-6 py-2.5 bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            Analyze <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="px-6 py-2.5 border border-border bg-card text-foreground font-medium text-sm hover:bg-secondary transition-colors"
          >
            Secondary Action
          </button>
          <Link
            href="/"
            className="text-sm font-medium underline decoration-accent underline-offset-4 hover:opacity-80 transition-opacity"
          >
            Underlined Accent Link
          </Link>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-secondary border border-border text-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> TLS 1.3 Active
          </span>
        </div>
      </section>

      {/* Panels */}
      <section className="space-y-6">
        <h2 className="font-serif text-2xl">Flat Panel Surface</h2>
        <div className="border border-border bg-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              <h3 className="font-medium text-lg">Security Evaluation</h3>
            </div>
            <span className="font-mono text-2xl font-semibold">94/100</span>
          </div>
          <p className="text-sm text-muted-foreground">
            No drop shadows or heavy gradients. Hairline borders and calm
            typography provide structure.
          </p>
        </div>
      </section>
    </div>
  );
}
