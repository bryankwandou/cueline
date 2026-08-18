/**
 * The Cueline mark: a countdown sweep that terminates in a solid dot.
 * The arc is elapsed time; the dot is the moment the cue fires.
 */
export function Mark({
  size = 28,
  animate = false,
}: {
  size?: number;
  animate?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="16"
        cy="16"
        r="12"
        stroke="var(--border-strong)"
        strokeWidth="2.5"
      />
      <path
        d="M16 4a12 12 0 0 1 10.39 18"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={animate ? "190" : undefined}
        style={
          animate
            ? { animation: "sweep 1.6s var(--ease) both" }
            : undefined
        }
      />
      <circle cx="26.39" cy="22" r="3.4" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark size={size} />
      <span
        className="font-semibold text-fg"
        style={{ letterSpacing: "-0.035em", fontSize: size * 0.72 }}
      >
        Cueline
      </span>
    </span>
  );
}
