/**
 * NextUnlocks — compact "next 3 badges you're closest to earning" for Arena.
 *
 * Picks up to 3 locked badges with progress data, sorts by
 * `progress_current / progress_target` DESC so the closest-to-unlock rise
 * to the top. Skips badges without progress data (identity/skill — binary,
 * no bar to show).
 *
 * Tap → routes to the full /badges screen. This lives on Arena so the
 * runner sees "what's next" without having to leave the tab (the earlier
 * design forced them to Home → Profile → Badges to check progress).
 */
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { PressableScale } from "@/components/ui/PressableScale";
import type { Badge } from "@/lib/api/badges";

const CATEGORY_COLOR: Record<string, string> = {
  milestone:    T.primary,
  streak:       "#FFC83D",
  identity:     "#8097ff",
  skill:        "#a8f060",
  reliability:  "#ff7351",
  community:    "#ffffff",
};

const CATEGORY_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  milestone:    "target",
  streak:       "zap",
  identity:     "shield",
  skill:        "star",
  reliability:  "check-circle",
  community:    "users",
};

interface Props {
  badges: Badge[];
}

export function NextUnlocks({ badges }: Props) {
  const candidates = useMemo(() => {
    return badges
      .filter((b) => !b.earned && b.progress_current !== null && b.progress_target !== null && b.progress_target > 0)
      .map((b) => ({
        badge: b,
        ratio: (b.progress_current ?? 0) / (b.progress_target ?? 1),
      }))
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 3);
  }, [badges]);

  if (candidates.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>NEXT UNLOCKS</Text>
        <PressableScale scale={0.97} onPress={() => router.push("/(main)/badges")}>
          <Text style={styles.seeAll}>All badges →</Text>
        </PressableScale>
      </View>

      <View style={styles.card}>
        {candidates.map(({ badge, ratio }, i) => {
          const color = CATEGORY_COLOR[badge.category] ?? T.primary;
          const icon = CATEGORY_ICON[badge.category] ?? "award";
          const pct = Math.min(100, Math.max(2, Math.round(ratio * 100)));
          return (
            <View
              key={badge.code}
              style={[styles.row, i < candidates.length - 1 && styles.rowDivider]}
            >
              <View style={[styles.iconRing, { backgroundColor: color + "18", borderColor: color + "40" }]}>
                <Feather name={icon} size={rw(16)} color={color} />
              </View>
              <View style={{ flex: 1, gap: rw(4) }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>{badge.name}</Text>
                  <Text style={styles.progressText}>
                    {badge.progress_current} / {badge.progress_target}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                {badge.unlock_hint && (
                  <Text style={styles.hint}>{badge.unlock_hint}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: rw(16),
    marginTop: rw(6),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rw(10),
  },
  eyebrow: {
    fontSize: rf(11),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textMuted,
    letterSpacing: 1.6,
  },
  seeAll: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(14),
    gap: rw(10),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    paddingBottom: rw(10),
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconRing: {
    width: rw(38),
    height: rw(38),
    borderRadius: rw(10),
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    flex: 1,
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  progressText: {
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textMuted,
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  hint: {
    fontSize: rf(11),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
  },
});
