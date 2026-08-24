/**
 * NextUnlocks — "next 3 badges you're closest to earning" for Arena.
 *
 * Picks up to 3 locked badges with progress data, sorted by
 * progress_current / progress_target DESC. Skips binary badges
 * (identity/skill) that have no progress bar.
 *
 * Refreshed 2026-08-23 for the new visual system: SHADOW.card,
 * TYPE tokens, no external margins (parent owns spacing).
 */
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import { PressableScale } from "@/components/ui/PressableScale";
import type { Badge } from "@/lib/api/badges";

const CATEGORY_COLOR: Record<string, string> = {
  milestone:    T.primary,
  streak:       "#FFC83D",
  identity:     "#8097ff",
  skill:        "#a8f060",
  reliability:  "#ff7351",
  community:    T.text,
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
          const isLast = i === candidates.length - 1;
          return (
            <View
              key={badge.code}
              style={[styles.row, !isLast && { marginBottom: S.md }]}
            >
              <View style={[styles.iconRing, { backgroundColor: color + "18" }]}>
                <Feather name={icon} size={rw(16)} color={color} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
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
    gap: S.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    ...TYPE.label,
    color: T.textMuted,
  },
  seeAll: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.primary,
  },
  card: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    ...SHADOW.card,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
  },
  iconRing: {
    width: rw(38),
    height: rw(38),
    borderRadius: R.thumb,
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
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  progressText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.textMuted,
  },
  progressTrack: {
    height: 4,
    backgroundColor: T.surface2,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  hint: {
    ...TYPE.caption,
    color: T.textMuted,
  },
});
