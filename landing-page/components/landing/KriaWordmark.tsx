import { LIME } from "./constants";

interface Props {
  size?: number;   // font-size in px
  glow?: boolean;
}

export default function KriaWordmark({ size = 22, glow = false }: Props) {
  return (
    <span style={{
      fontFamily: "var(--font-comfortaa), 'Comfortaa', cursive",
      fontWeight: 700,
      fontSize: size,
      color: LIME,
      letterSpacing: "-0.01em",
      lineHeight: 1,
      textShadow: glow ? `0 0 48px rgba(212,255,0,0.55), 0 0 120px rgba(212,255,0,0.2)` : "none",
      display: "inline-block",
    }}>
      kria
    </span>
  );
}
