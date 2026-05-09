/**
 * MomentumBadge
 * ──────────────
 * Compact inline badge showing a Momentum score.
 * Used on job cards (poster momentum) and applicant cards (worker momentum).
 *
 * Variants:
 *   "chip"  – small colored pill with score, e.g. on gig explore cards
 *   "stat"  – larger stat block used in applicant cards (replaces "Rating" stat)
 */

import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { getBand } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";

interface MomentumBadgeProps {
  score: number;
  variant?: "chip" | "stat";
  showLabel?: boolean;
}

export function MomentumBadge({ score, variant = "chip", showLabel = false }: MomentumBadgeProps) {
  const band = getBand(score);

  if (variant === "stat") {
    return (
      <View style={statStyles.container}>
        <View style={[statStyles.pill, { backgroundColor: band.bgColor }]}>
          <Text style={[statStyles.score, { color: band.color }]}>{score}</Text>
        </View>
        <Text style={statStyles.label}>Momentum</Text>
      </View>
    );
  }

  // chip variant
  return (
    <View style={[chipStyles.chip, { backgroundColor: band.bgColor }]}>
      <Feather name="zap" size={10} color={band.color} />
      <Text style={[chipStyles.score, { color: band.textColor }]}>{score}</Text>
      {showLabel && (
        <Text style={[chipStyles.label, { color: band.textColor }]}>{band.label}</Text>
      )}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(3),
    paddingHorizontal: rw(8),
    paddingVertical: rw(3),
    borderRadius: 6,
  },
  score: {
    fontSize: rf(11),
    fontWeight: "700",
  },
  label: {
    fontSize: rf(10),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});

const statStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    gap: rw(4),
  },
  pill: {
    paddingHorizontal: rw(10),
    paddingVertical: rw(3),
    borderRadius: 20,
  },
  score: {
    fontSize: rf(15),
    fontWeight: "700",
  },
  label: {
    fontSize: rf(11),
    color: T.textMuted,
  },
});
