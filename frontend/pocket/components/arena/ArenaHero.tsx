/**
 * ArenaHero — top hero card on the Arena tab (2026-08-07 revamp).
 *
 * Consolidates three attention-grabbing signals that used to be missing or
 * scattered into a single card at the top of Arena:
 *   1. STREAK 🔥 — big amber number, feels celebratory (Duolingo model)
 *   2. WEEKLY DELTA — trend chip vs a lightweight snapshot (see below)
 *   3. PERCENTILE — "top X% in Bengaluru" — social proof (Strava segments)
 *
 * The weekly delta is client-computed for now: we snapshot `worker.score`
 * to AsyncStorage each week and diff against it on next arena open. When a
 * proper backend momentum_snapshots table lands, swap the client snapshot
 * for a server field. See features/arena_revamp.md for the plan.
 */
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import type { PercentileData } from "@/lib/api/momentum";

interface Props {
  streak: number;
  longestStreak: number;
  weeklyDelta: number | null;   // null when unknown (first Arena open ever)
  percentile: PercentileData | null;
}

export function ArenaHero({ streak, longestStreak, weeklyDelta, percentile }: Props) {
  return (
    <View style={styles.hero}>
      <View style={styles.row}>
        {/* Streak — dominant stat, biggest font */}
        <View style={styles.streakBlock}>
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>{streak > 0 ? "🔥" : "🌱"}</Text>
            <Text style={styles.streakNum}>{streak}</Text>
          </View>
          <Text style={styles.streakLabel}>
            {streak > 0 ? `Day streak · best ${longestStreak}` : "Start your first streak"}
          </Text>
        </View>

        {/* Right column — delta + percentile */}
        <View style={styles.chipCol}>
          {weeklyDelta !== null && (
            <View
              style={[
                styles.deltaChip,
                {
                  backgroundColor:
                    weeklyDelta > 0
                      ? "rgba(212,255,0,0.10)"
                      : weeklyDelta < 0
                      ? "rgba(255,83,49,0.10)"
                      : "rgba(255,255,255,0.06)",
                  borderColor:
                    weeklyDelta > 0
                      ? "rgba(212,255,0,0.30)"
                      : weeklyDelta < 0
                      ? "rgba(255,83,49,0.30)"
                      : T.border,
                },
              ]}
            >
              <Feather
                name={weeklyDelta > 0 ? "trending-up" : weeklyDelta < 0 ? "trending-down" : "minus"}
                size={rw(12)}
                color={weeklyDelta > 0 ? T.primary : weeklyDelta < 0 ? T.error : T.textMuted}
              />
              <Text
                style={[
                  styles.chipText,
                  { color: weeklyDelta > 0 ? T.primary : weeklyDelta < 0 ? T.error : T.textMuted },
                ]}
              >
                {weeklyDelta > 0 ? "+" : ""}{weeklyDelta} this week
              </Text>
            </View>
          )}

          {percentile && percentile.peer_count >= 5 && (
            <View style={styles.percentileChip}>
              <Feather name="award" size={rw(12)} color="#FFC83D" />
              <Text style={styles.percentileText}>
                Top {Math.max(1, 100 - percentile.percentile + 1)}% {percentile.scope === "city" && percentile.city ? `in ${percentile.city}` : "globally"}
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
    padding: rw(18),
    borderRadius: rw(20),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    marginHorizontal: rw(16),
    marginBottom: rw(12),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
  },
  streakBlock: {
    flex: 1,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: rw(6),
  },
  streakEmoji: {
    fontSize: rf(38),
  },
  streakNum: {
    fontSize: rf(44),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFC83D",
    letterSpacing: -1,
  },
  streakLabel: {
    fontSize: rf(12),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
    marginTop: rw(2),
  },
  chipCol: {
    gap: rw(6),
    alignItems: "flex-end",
  },
  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(10),
    paddingVertical: rw(5),
    borderRadius: rw(999),
    borderWidth: 1,
  },
  percentileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(10),
    paddingVertical: rw(5),
    borderRadius: rw(999),
    backgroundColor: "rgba(255,200,61,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,200,61,0.30)",
  },
  chipText: {
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.2,
  },
  percentileText: {
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFC83D",
    letterSpacing: 0.2,
  },
});
