"use client";

// ScoreRing — circular SVG progress indicator coloured by score value.
// Follows Single Responsibility: only renders a score as a ring.

export type ScoreLevel = "excellent" | "good" | "warn" | "critical" | "empty";

export function getScoreLevel(score: number | null | undefined): ScoreLevel {
  if (score == null) return "empty";
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "warn";
  return "critical";
}

const LEVEL_COLORS: Record<ScoreLevel, string> = {
  excellent: "#10b981",
  good:      "#6366f1",
  warn:      "#f59e0b",
  critical:  "#ef4444",
  empty:     "currentColor",
};

const LEVEL_LABELS: Record<ScoreLevel, string> = {
  excellent: "Excellent",
  good:      "Good",
  warn:      "Needs work",
  critical:  "Critical",
  empty:     "No data",
};

interface ScoreRingProps {
  score: number | null | undefined;
  /** Outer diameter in px — default 72 */
  size?: number;
  /** Stroke width in px — default 5 */
  strokeWidth?: number;
  /** Show score number inside the ring */
  showLabel?: boolean;
}

export function ScoreRing({
  score,
  size = 72,
  strokeWidth = 5,
  showLabel = true,
}: ScoreRingProps) {
  const level = getScoreLevel(score);
  const color = LEVEL_COLORS[level];
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = score != null ? (score / 100) * circumference : 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
        aria-label={`Score: ${score ?? "N/A"}`}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-bold tabular-nums leading-none"
            style={{ color, fontSize: size * 0.26 }}
          >
            {score ?? "—"}
          </span>
        </div>
      )}
    </div>
  );
}

export function ScoreLevelBadge({ score }: { score: number | null | undefined }) {
  const level = getScoreLevel(score);
  const styles: Record<ScoreLevel, string> = {
    excellent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    good:      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    warn:      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    critical:  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    empty:     "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wide ${styles[level]}`}>
      {LEVEL_LABELS[level]}
    </span>
  );
}
