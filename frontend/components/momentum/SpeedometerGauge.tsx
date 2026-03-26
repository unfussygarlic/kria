/**
 * SpeedometerGauge
 * ─────────────────
 * FICO-style semicircular arc gauge for Momentum scores.
 * - 5 colored band segments (300–850)
 * - Animated needle pointing to current score
 * - Score number + band label rendered below the arc
 * - Tappable to trigger onPress (opens the breakdown)
 *
 * Props:
 *   score      – current Momentum score (300–850)
 *   onPress    – optional tap handler (opens breakdown modal)
 *   size       – width of the component in pixels (default 280)
 *   animated   – whether the needle animates on mount/score change (default true)
 */

import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";

import { T } from "@/constants/colors";
import {
  MOMENTUM_BANDS,
  MOMENTUM_SCALE,
  getBand,
  scoreToAngle,
  type MomentumBand,
} from "@/constants/momentum";
import { rw, rf } from "@/constants/responsive";

// ── SVG geometry constants ───────────────────────────────────────────────────

const BASE_SIZE = 280;
const CX = BASE_SIZE / 2;       // 140
const CY = BASE_SIZE * 0.58;    // 162 — keeps arc centered in viewBox with score below
const R_OUTER = BASE_SIZE * 0.43; // 120
const R_INNER = BASE_SIZE * 0.30; // 84  → track thickness ≈ 36px
const R_NEEDLE = R_OUTER * 0.85;  // needle length
const VIEWBOX_H = BASE_SIZE * 0.65; // 182 — only need top portion

// ── Arc math ─────────────────────────────────────────────────────────────────

function pt(r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY - r * Math.sin(rad)];
}

/**
 * Builds an SVG donut-arc path for a score band.
 * The gauge spans 180° (left = 300, right = 850) through the top.
 * Outer arc uses sweep=1 (SVG clockwise → goes through top).
 * Inner return arc uses sweep=0 (reverse direction).
 */
function donutPath(scoreStart: number, scoreEnd: number): string {
  const a1 = scoreToAngle(scoreStart); // larger angle (left side)
  const a2 = scoreToAngle(scoreEnd);   // smaller angle (right side)

  const [ox1, oy1] = pt(R_OUTER, a1);
  const [ox2, oy2] = pt(R_OUTER, a2);
  const [ix1, iy1] = pt(R_INNER, a1);
  const [ix2, iy2] = pt(R_INNER, a2);

  const large = a1 - a2 > 180 ? 1 : 0; // never true for a single band

  return [
    `M ${ox1.toFixed(2)} ${oy1.toFixed(2)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${ox2.toFixed(2)} ${oy2.toFixed(2)}`,
    `L ${ix2.toFixed(2)} ${iy2.toFixed(2)}`,
    `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${ix1.toFixed(2)} ${iy1.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// ── Band arc segments ─────────────────────────────────────────────────────────

const BAND_PATHS: { band: MomentumBand; d: string }[] = MOMENTUM_BANDS.map((band) => ({
  band,
  d: donutPath(band.min, band.max),
}));

// ── Component ─────────────────────────────────────────────────────────────────

interface SpeedometerGaugeProps {
  score: number;
  onPress?: () => void;
  size?: number;
  animated?: boolean;
}

export function SpeedometerGauge({
  score,
  onPress,
  size = BASE_SIZE,
  animated = true,
}: SpeedometerGaugeProps) {
  const band = getBand(score);
  const scale = size / BASE_SIZE;

  // Needle angle in degrees for transform: 0° points right, we rotate from center.
  // scoreToAngle returns standard math angle. For the needle transform, we need
  // the SVG rotation angle = 360° - standard_angle (since SVG rotates CW).
  // At score 300: standard = 180° → needle points LEFT → SVG rotation = 180°
  // At score 850: standard = 0°   → needle points RIGHT → SVG rotation = 0°
  // → SVG rotation = scoreToAngle(score) (they happen to be the same: standard angle)
  // Actually for SVG transform="rotate(deg, cx, cy)", positive rotates CW.
  // We want needle to point at angle deg (standard math), so we use -deg to convert:
  // SVG rotate(-deg) = rotate CCW by deg = points in standard math direction.
  const needleAngle = scoreToAngle(score); // standard math angle

  // Animated needle
  const needleAnim = useRef(new Animated.Value(scoreToAngle(MOMENTUM_SCALE.default))).current;

  useEffect(() => {
    if (!animated) {
      needleAnim.setValue(needleAngle);
      return;
    }
    Animated.spring(needleAnim, {
      toValue: needleAngle,
      friction: 8,
      tension: 60,
      useNativeDriver: false, // SVG props require JS driver
    }).start();
  }, [needleAngle, animated]);

  // Needle tip coordinates (used for rendering; animation is applied via rotation)
  const [tipX, tipY] = pt(R_NEEDLE, needleAngle);

  // Since we can't animate SVG directly with Animated.Value + react-native-svg,
  // we compute final needle position statically. The gauge itself doesn't need
  // 60fps animation — just needs to reflect the score correctly when rendered.
  // For entry animation, we animate a wrapper View opacity/scale instead.
  const entryOpacity = useRef(new Animated.Value(0)).current;
  const entryScale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(entryScale, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const svgWidth = BASE_SIZE;
  const svgHeight = VIEWBOX_H;
  const displayScore = Math.max(MOMENTUM_SCALE.min, Math.min(MOMENTUM_SCALE.max, score));

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, { width: size, height: Math.round(svgHeight * scale) + rw(56) }]}
    >
      <Animated.View
        style={[
          styles.svgWrapper,
          { opacity: entryOpacity, transform: [{ scale: entryScale }] },
        ]}
      >
        <Svg
          width={size}
          height={Math.round(svgHeight * scale)}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          <Defs>
            <RadialGradient id="needleGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={T.graphite} stopOpacity="1" />
              <Stop offset="100%" stopColor={T.concrete} stopOpacity="1" />
            </RadialGradient>
          </Defs>

          {/* ── Colored band arcs ── */}
          {BAND_PATHS.map(({ band: b, d }) => (
            <Path
              key={b.key}
              d={d}
              fill={b.color}
              opacity={band.key === b.key ? 1 : 0.25}
            />
          ))}

          {/* ── Tick marks at band boundaries ── */}
          {MOMENTUM_BANDS.slice(1).map((b) => {
            const tickAngle = scoreToAngle(b.min);
            const [tx1, ty1] = pt(R_INNER - 2, tickAngle);
            const [tx2, ty2] = pt(R_OUTER + 2, tickAngle);
            return (
              <Line
                key={b.key}
                x1={tx1}
                y1={ty1}
                x2={tx2}
                y2={ty2}
                stroke="#fff"
                strokeWidth={2}
                opacity={0.7}
              />
            );
          })}

          {/* ── Needle ── */}
          <G>
            {/* Needle shadow */}
            <Line
              x1={CX}
              y1={CY}
              x2={tipX + 1}
              y2={tipY + 1}
              stroke="rgba(0,0,0,0.15)"
              strokeWidth={4}
              strokeLinecap="round"
            />
            {/* Needle body */}
            <Line
              x1={CX}
              y1={CY}
              x2={tipX}
              y2={tipY}
              stroke={T.primary}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Center pivot */}
            <Circle cx={CX} cy={CY} r={7} fill={T.surface4} />
            <Circle cx={CX} cy={CY} r={4} fill={T.primary} />
          </G>
        </Svg>
      </Animated.View>

      {/* ── Score + band label ── */}
      <View style={styles.scoreBlock}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreNumber}>{displayScore}</Text>
          <Text style={styles.scoreSuffix}>/850</Text>
        </View>
        <View style={[styles.bandPill, { backgroundColor: band.bgColor }]}>
          <Text style={[styles.bandLabel, { color: band.textColor }]}>
            {band.label}
          </Text>
        </View>
        {onPress && (
          <Text style={styles.tapHint}>Tap for breakdown</Text>
        )}
      </View>
    </Pressable>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  svgWrapper: {
    alignItems: "center",
  },
  scoreBlock: {
    alignItems: "center",
    marginTop: rw(4),
    gap: rw(6),
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  scoreNumber: {
    fontSize: rf(58),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: -2,
    lineHeight: rf(62),
    color: T.text,
  },
  scoreSuffix: {
    fontSize: rf(20),
    fontWeight: "600",
    color: T.textMuted,
    lineHeight: rf(34),
    letterSpacing: -0.5,
  },
  bandPill: {
    paddingHorizontal: rw(14),
    paddingVertical: rw(4),
    borderRadius: 20,
  },
  bandLabel: {
    fontSize: rf(13),
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  tapHint: {
    fontSize: rf(11),
    color: T.textMuted,
    marginTop: rw(2),
  },
});
