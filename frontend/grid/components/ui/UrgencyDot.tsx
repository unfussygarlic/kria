"use client";

/**
 * UrgencyDot — small pulsing dot used for "N unread" signals in the sidebar
 * and elsewhere. Not a full badge — deliberately silent when count is 0.
 *
 * Colors escalate: coral for anything ≥ 5, amber for 1–4. Zero returns null.
 */

interface Props {
  count: number;
  /** Visual size in px. Default 8. */
  size?: number;
  /** Show a numeric label next to the dot. */
  showLabel?: boolean;
  className?: string;
}

export function UrgencyDot({ count, size = 8, showLabel = false, className = "" }: Props) {
  if (count <= 0) return null;
  const critical = count >= 5;
  const color = critical ? "#ff7351" : "#FFC83D";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        aria-hidden
        className="inline-block rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: `0 0 ${size}px ${color}`,
        }}
      />
      {showLabel && (
        <span className="text-[10px] font-bold tabular-nums" style={{ color }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
}
