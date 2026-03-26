export default function ScansPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Active Scans Engine</h2>
        <p className="text-sm text-muted-foreground mt-1">View the live pipeline of currently resolving URL inspection sweeps.</p>
      </div>
      <div className="border border-border bg-card rounded-xl p-8 text-center text-muted-foreground">
        No active scans resolving right now.
      </div>
    </div>
  );
}
