/**
 * Badges — grid of milestone / streak / identity badges, earned + locked.
 *
 * Redesigned 2026-08-23: SHADOW cards (no borders), TYPE tokens, S/R spacing,
 * gradient summary hero at the top, 2-column grid of shadow tiles.
 */

import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import { useBadgeStore, type Badge } from "@/stores/badgeStore";

const CATEGORY_META: Record<
  string,
  { label: string; icon: React.ComponentProps<typeof Feather>["name"]; color: string }
> = {
  milestone: { label: "Milestones",   icon: "award",  color: T.primary },
  streak:    { label: "Streaks",      icon: "zap",    color: "#FFC83D" },
  identity:  { label: "Verification", icon: "shield", color: "#60a5fa" },
};

const CATEGORY_ORDER = ["milestone", "streak", "identity"];

function BadgeTile({ badge }: { badge: Badge }) {
  const meta = CATEGORY_META[badge.category] ?? { label: badge.category, icon: "star", color: T.textMuted };
  const color = badge.earned ? meta.color : T.textMuted;

  return (
    <View style={[styles.tile, !badge.earned && styles.tileLocked]}>
      <View style={[styles.tileIcon, { backgroundColor: color + "18" }]}>
        <Feather name={meta.icon} size={22} color={color} />
        {badge.earned && <View style={[styles.earnedDot, { backgroundColor: color }]} />}
      </View>
      <Text style={[styles.tileName, !badge.earned && styles.tileNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text style={styles.tileDesc} numberOfLines={2}>
        {badge.description}
      </Text>
      {badge.earned && badge.earned_at && (
        <Text style={[styles.tileDate, { color }]}>
          {new Date(badge.earned_at).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </Text>
      )}
      {!badge.earned && (
        <View style={styles.lockedRow}>
          <Feather name="lock" size={10} color={T.textMuted} />
          <Text style={styles.lockedText}>Locked</Text>
        </View>
      )}
    </View>
  );
}

export default function BadgesScreen() {
  const insets = useSafeAreaInsets();
  const { badges, earnedCount, totalCount, isLoading, fetchBadges } = useBadgeStore();

  useEffect(() => {
    fetchBadges();
  }, []);

  const grouped = CATEGORY_ORDER.reduce<Record<string, Badge[]>>((acc, cat) => {
    acc[cat] = badges.filter((b) => b.category === cat);
    return acc;
  }, {});

  const pct = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Badges</Text>
        <View style={{ width: rw(36) }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LinearGradient
          colors={T.gradAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>BADGES EARNED</Text>
          <View style={styles.heroCountRow}>
            <Text style={styles.heroCount}>{earnedCount}</Text>
            <Text style={styles.heroOf}> / {totalCount}</Text>
          </View>
          <View style={styles.heroTrack}>
            <View style={[styles.heroFill, { width: `${pct}%` as any }]} />
          </View>
          <Text style={styles.heroFoot}>
            {pct === 100 ? "Legendary — you've collected them all." : `${pct}% of the collection`}
          </Text>
        </LinearGradient>

        {isLoading && badges.length === 0 ? (
          <Text style={styles.empty}>Loading badges…</Text>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat];
            if (!list || list.length === 0) return null;
            const meta = CATEGORY_META[cat]!;
            const earnedInCat = list.filter((b) => b.earned).length;
            return (
              <View key={cat} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name={meta.icon} size={14} color={meta.color} />
                  <Text style={[styles.sectionTitle, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.sectionCount}>
                    {earnedInCat}/{list.length}
                  </Text>
                </View>
                <View style={styles.grid}>
                  {list.map((badge) => (
                    <BadgeTile key={badge.code} badge={badge} />
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  backButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: R.thumb,
    backgroundColor: T.surface1,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  headerTitle: {
    ...TYPE.title3,
    color: T.text,
  },

  scrollContent: {
    paddingHorizontal: S.md,
    paddingBottom: S.hero,
    gap: S.md,
  },

  hero: {
    borderRadius: R.hero,
    padding: S.xl,
    alignItems: "center",
    gap: S.xs,
    ...SHADOW.lg,
  },
  heroEyebrow: {
    ...TYPE.label,
    color: "rgba(255,255,255,0.9)",
  },
  heroCountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: S.xxs,
  },
  heroCount: {
    ...TYPE.display,
    fontSize: 56,
    color: "#FFFFFF",
  },
  heroOf: {
    ...TYPE.title2,
    color: "rgba(255,255,255,0.75)",
  },
  heroTrack: {
    width: "80%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: S.sm,
  },
  heroFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  heroFoot: {
    ...TYPE.body,
    color: "rgba(255,255,255,0.9)",
    marginTop: 6,
  },

  section: {
    gap: S.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: S.xs,
  },
  sectionTitle: {
    ...TYPE.label,
    flex: 1,
  },
  sectionCount: {
    ...TYPE.caption,
    color: T.textMuted,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.xs,
  },
  tile: {
    width: "48.5%",
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.sm,
    gap: 6,
    ...SHADOW.card,
  },
  tileLocked: {
    opacity: 0.65,
  },
  tileIcon: {
    width: rw(42),
    height: rw(42),
    borderRadius: R.thumb,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  earnedDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tileName: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  tileNameLocked: {
    color: T.textMuted,
  },
  tileDesc: {
    ...TYPE.caption,
    color: T.textMuted,
  },
  tileDate: {
    ...TYPE.label,
    fontSize: 10,
    marginTop: 2,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  lockedText: {
    ...TYPE.label,
    fontSize: 10,
    color: T.textMuted,
  },

  empty: {
    ...TYPE.body,
    textAlign: "center",
    color: T.textMuted,
    marginTop: S.hero,
  },
});
