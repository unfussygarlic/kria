import type { CSSProperties } from "react";

interface Props {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Kria triangle logo — inherits color from CSS via currentColor so it
 * automatically flips between lime (dark theme) and orange (light theme).
 */
export function KriaLogo({ size = 32, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 500 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M370 70 L370 430 L120 250 L370 70 Z" fill="currentColor" />
    </svg>
  );
}
