import { useEffect } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { useBadgeStore, type Badge } from "@/stores/badgeStore";

// ── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; icon: React.ComponentProps<typeof Feather>["name"]; color: string }> = {
  milestone: { label: "Milestones",   icon: "award",    color: T.primary },
  streak:    { label: "Streaks",      icon: "zap",      color: "#FFC83D" },
  identity:  { label: "Verification", icon: "shield",   color: "#60a5fa" },
};

const CATEGORY_ORDER = ["milestone", "streak", "identity"];

// ── Badge tile ───────────────────────────────────────────────────────────────

function BadgeTile({ badge }: { badge: Badge }) {
  const meta = CATEGORY_META[badge.category] ?? { label: badge.category, icon: "star", color: T.textMuted };
  const color = badge.earned ? meta.color : T.textMuted;

  return (
    <View style={[styles.tile, badge.earned && styles.tileEarned]}>
      <View style={[styles.tileIcon, { backgroundColor: color + "1a" }]}>
        <Feather name={meta.icon} size={22} color={color} />
        {badge.earned && (
          <View style={styles.earnedDot} />
        )}
      </View>
      <Text style={[styles.tileName, !badge.earned && styles.tileNameLocked]} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text style={styles.tileDesc} numberOfLines={2}>
        {badge.description}
      </Text>
      {badge.earned && badge.earned_at && (
        <Text style={[styles.tileDate, { color }]}>
          {new Date(badge.earned_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
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

// ── Screen ───────────────────────────────────────────────────────────────────

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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>My Badges</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Summary bar */}
      <View style={styles.summary}>
        <Text style={styles.summaryCount}>
          <Text style={{ color: T.primary }}>{earnedCount}</Text>
          <Text style={styles.summaryOf}> / {totalCount}</Text>
        </Text>
        <Text style={styles.summaryLabel}>badges earned</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: totalCount > 0 ? `${Math.round((earnedCount / totalCount) * 100)}%` as any : "0%" },
            ]}
          />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {isLoading && badges.length === 0 ? (
          <Text style={styles.empty}>Loading badges…</Text>
        ) : (
          CATEGORY_ORDER.map((cat) => {
            const list = grouped[cat];
            if (!list || list.length === 0) return null;
            const meta = CATEGORY_META[cat];
            return (
              <View key={cat} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name={meta.icon} size={14} color={meta.color} />
                  <Text style={[styles.sectionTitle, { color: meta.color }]}>{meta.label}</Text>
                  <Text style={styles.sectionCount}>
                    {list.filter((b) => b.earned).length}/{list.length}
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

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.surface,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: T.text,
  },

  // ── Summary ──
  summary: {
    backgroundColor: T.surface,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 20,
    alignItems: "center",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 40,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  summaryOf: {
    fontSize: 28,
    color: T.textMuted,
  },
  summaryLabel: {
    fontSize: 13,
    color: T.textMuted,
    marginBottom: 12,
  },
  progressTrack: {
    width: "80%",
    height: 6,
    backgroundColor: T.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: T.primary,
    borderRadius: 3,
  },

  // ── Section ──
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    flex: 1,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  sectionCount: {
    fontSize: 12,
    color: T.textMuted,
  },

  // ── Grid ──
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  // ── Tile ──
  tile: {
    width: "47.5%",
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    gap: 6,
    opacity: 0.55,
  },
  tileEarned: {
    opacity: 1,
    borderColor: "rgba(212,255,0,0.18)",
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
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
    backgroundColor: T.primary,
  },
  tileName: {
    fontSize: 13,
    fontWeight: "700",
    color: T.text,
    lineHeight: 17,
  },
  tileNameLocked: {
    color: T.textMuted,
  },
  tileDesc: {
    fontSize: 11,
    color: T.textMuted,
    lineHeight: 15,
  },
  tileDate: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  lockedText: {
    fontSize: 10,
    color: T.textMuted,
  },

  empty: {
    textAlign: "center",
    color: T.textMuted,
    marginTop: 60,
    fontSize: 14,
  },
});
