/**
 * SkillGraph — Radar/spider chart for Momentum signals.
 *
 * Axes are driven by signalMeta from the store — adding a signal file on the
 * backend automatically adds an axis here after the next fetch.
 * Signals with no data render as dimmed empty axis.
 */

import { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";

import { T } from "@/constants/colors";
import { getBand, SIGNAL_META } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";
import { useMomentumStore } from "@/stores/momentumStore";
import type { BreakdownItem, SignalMeta } from "@/lib/api/momentum";

interface SkillGraphProps {
  score: number;
  signals: BreakdownItem[];
  onPress?: () => void;
  size?: number;
}

function polarToXY(cx: number, cy: number, r: number, angleRad: number) {
  return {
    x: cx + r * Math.sin(angleRad),
    y: cy - r * Math.cos(angleRad),
  };
}

export const SkillGraph = memo(function SkillGraph({ score, signals, onPress, size = rw(260) }: SkillGraphProps) {
  const band = getBand(score);
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.32;
  const labelR = size * 0.46;

  // Use live signal metadata; fall back to static SIGNAL_META keys so the
  // graph renders even before the API call completes.
  const signalMeta = useMomentumStore((s) => s.signalMeta);
  const axisKeys: string[] = useMemo(
    () =>
      signalMeta.length > 0
        ? signalMeta.map((m) => m.key)
        : Object.keys(SIGNAL_META),
    [signalMeta]
  );
  const metaMap = useMemo(() => {
    const m: Record<string, SignalMeta | { short_label: string }> = {};
    signalMeta.forEach((s) => { m[s.key] = s; });
    // fill in fallbacks for static keys
    Object.entries(SIGNAL_META).forEach(([k, v]) => {
      if (!m[k]) m[k] = { short_label: v.shortLabel };
    });
    return m;
  }, [signalMeta]);

  const N = axisKeys.length;

  const signalMap = useMemo(() => {
    const map: Record<string, BreakdownItem> = {};
    signals.forEach((s) => { map[s.key] = s; });
    return map;
  }, [signals]);

  const rings = [0.25, 0.5, 0.75, 1.0];

  const ringPolygons = rings.map((scale) =>
    axisKeys.map((_, i) => {
      const angle = (2 * Math.PI * i) / N;
      const p = polarToXY(cx, cy, maxR * scale, angle);
      return `${p.x},${p.y}`;
    }).join(" ")
  );

  const dataPoints = axisKeys.map((key, i) => {
    const item = signalMap[key];
    const val = item?.has_data ? item.bar_value : 0;
    const angle = (2 * Math.PI * i) / N;
    return polarToXY(cx, cy, maxR * val, angle);
  });
  const polygonStr = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const hasAnyData = signals.some((s) => s.has_data);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, { width: size, height: size + rw(20) }, pressed && styles.pressed]}
    >
      <Svg width={size} height={size}>
        {/* Concentric rings */}
        {ringPolygons.map((pts, i) => (
          <Polygon
            key={i}
            points={pts}
            fill="none"
            stroke={T.border}
            strokeWidth={1}
            opacity={0.6}
          />
        ))}

        {/* Axis spokes */}
        {axisKeys.map((_, i) => {
          const angle = (2 * Math.PI * i) / N;
          const end = polarToXY(cx, cy, maxR, angle);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={end.x}
              y2={end.y}
              stroke={T.border}
              strokeWidth={1}
              opacity={0.5}
            />
          );
        })}

        {/* Data polygon */}
        {hasAnyData && (
          <Polygon
            points={polygonStr}
            fill={band.color}
            fillOpacity={0.18}
            stroke={band.color}
            strokeWidth={1.5}
          />
        )}

        {/* Data dots */}
        {axisKeys.map((key, i) => {
          const item = signalMap[key];
          if (!item?.has_data) return null;
          const angle = (2 * Math.PI * i) / N;
          const p = polarToXY(cx, cy, maxR * item.bar_value, angle);
          return <Circle key={key} cx={p.x} cy={p.y} r={3.5} fill={band.color} />;
        })}

        {/* Axis labels */}
        {axisKeys.map((key, i) => {
          const angle = (2 * Math.PI * i) / N;
          const p = polarToXY(cx, cy, labelR, angle);
          const item = signalMap[key];
          const meta = metaMap[key];
          const shortLabel = meta && "short_label" in meta ? meta.short_label : key;
          return (
            <SvgText
              key={key}
              x={p.x}
              y={p.y + rf(4)}
              textAnchor="middle"
              fill={T.textMuted}
              fontSize={rf(8.5)}
              fontWeight="600"
              opacity={item?.has_data ? 0.75 : 0.35}
            >
              {shortLabel.toUpperCase()}
            </SvgText>
          );
        })}

        {/* Center score */}
        <SvgText
          x={cx}
          y={cy - rf(6)}
          textAnchor="middle"
          fill={band.color}
          fontSize={rf(28)}
          fontWeight="800"
        >
          {score}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + rf(14)}
          textAnchor="middle"
          fill={band.textColor}
          fontSize={rf(10)}
          fontWeight="600"
          opacity={0.8}
        >
          {band.label.toUpperCase()}
        </SvgText>
      </Svg>

      {onPress && (
        <Text style={styles.tapHint}>Tap for breakdown</Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  pressed: {
    opacity: 0.8,
  },
  tapHint: {
    fontSize: rf(11),
    color: T.textMuted,
    marginTop: rw(4),
    opacity: 0.55,
  },
});
