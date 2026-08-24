/**
 * ArenaHero — streak + weekly delta + percentile row on the Arena tab.
 *
 * Consolidates three attention-grabbing signals:
 *   1. STREAK 🔥 — dominant amber number (Duolingo model)
 *   2. WEEKLY DELTA — trend chip vs a client-side snapshot
 *   3. PERCENTILE — "top X% in <city>" (Strava-style social proof)
 *
 * Refreshed 2026-08-23 for the new visual system: SHADOW.card instead of a
 * border, TYPE tokens, no external margins (the parent screen owns spacing).
 * Weekly delta still comes from AsyncStorage; swap for `momentum_snapshots`
 * when the server table lands (see features/arena_revamp.md).
 */
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rf, rw } from "@/constants/responsive";
import type { PercentileData } from "@/lib/api/momentum";

interface Props {
  streak: number;
  longestStreak: number;
  weeklyDelta: number | null;   // null when unknown (first Arena open ever)
  percentile: PercentileData | null;
}

export function ArenaHero({ streak, longestStreak, weeklyDelta, percentile }: Props) {
  const deltaColor =
    weeklyDelta === null
      ? T.textMuted
      : weeklyDelta > 0
      ? T.success
      : weeklyDelta < 0
      ? T.error
      : T.textMuted;

  return (
    <View style={styles.hero}>
      <View style={styles.row}>
        {/* Streak — dominant stat */}
        <View style={styles.streakBlock}>
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>{streak > 0 ? "🔥" : "🌱"}</Text>
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
          <Text style={styles.streakLabel}>
            {streak > 0 ? `Day streak · best ${longestStreak}` : "Start your first streak"}
          </Text>
        </View>

        {/* Right column — delta + percentile chips */}
        <View style={styles.chipCol}>
          {weeklyDelta !== null && (
            <View style={[styles.chip, { backgroundColor: T.surface2 }]}>
              <Feather
                name={weeklyDelta > 0 ? "trending-up" : weeklyDelta < 0 ? "trending-down" : "minus"}
                size={rw(12)}
                color={deltaColor}
              />
              <Text style={[styles.chipText, { color: deltaColor }]}>
                {weeklyDelta > 0 ? "+" : ""}{weeklyDelta} this week
              </Text>
            </View>
          )}

          {percentile && percentile.peer_count >= 5 && (
            <View style={[styles.chip, { backgroundColor: T.surface2 }]}>
              <Feather name="award" size={rw(12)} color="#FFC83D" />
              <Text style={[styles.chipText, { color: "#FFC83D" }]}>
                Top {Math.max(1, 100 - percentile.percentile + 1)}%
                {percentile.scope === "city" && percentile.city ? ` in ${percentile.city}` : " globally"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.lg,
    ...SHADOW.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
  },
  streakBlock: {
    flex: 1,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  streakEmoji: {
    fontSize: rf(36),
  },
  streakNum: {
    fontSize: rf(44),
    fontWeight: "800",
    fontFamily: "Inter_800ExtraBold",
    color: "#FFC83D",
    letterSpacing: -1.2,
  },
  streakLabel: {
    ...TYPE.body,
    color: T.textMuted,
    marginTop: 2,
  },
  chipCol: {
    gap: 6,
    alignItems: "flex-end",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
  },
  chipText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
