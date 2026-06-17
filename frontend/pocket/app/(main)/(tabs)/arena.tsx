/**
 * Arena — Trust & Momentum Hub
 * ─────────────────────────────
 * Shows momentum score pinned to the user's active session role.
 * Runner → worker score. Host → poster score.
 * No tab switcher — role is set at login.
 */

import { useEffect, useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { getBand } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { SkillGraph } from "@/components/momentum/SkillGraph";
import { MomentumBreakdown } from "@/components/momentum/MomentumBreakdown";

export default function ArenaScreen() {
  const insets = useSafeAreaInsets();
  const activeRole = useAuthStore((s) => s.activeRole);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const myMomentum = useMomentumStore((s) => s.myMomentum);
  const myBreakdown = useMomentumStore((s) => s.myBreakdown);
  const isLoadingMy = useMomentumStore((s) => s.isLoadingMy);
  const isLoadingBreakdown = useMomentumStore((s) => s.isLoadingBreakdown);
  const fetchMyMomentum = useMomentumStore((s) => s.fetchMyMomentum);
  const fetchMyBreakdown = useMomentumStore((s) => s.fetchMyBreakdown);
  const fetchSignalMeta = useMomentumStore((s) => s.fetchSignalMeta);

  useEffect(() => {
    fetchSignalMeta();
    fetchMyMomentum();
    fetchMyBreakdown();
  }, []);

  const handleBreakdownOpen = useCallback(() => {
    setShowBreakdown(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchMyMomentum(), fetchMyBreakdown()]);
  }, [fetchMyMomentum, fetchMyBreakdown]);

  const activeScore = myMomentum?.worker.score ?? 0;
  const activeData = myMomentum?.worker;
  const roleLabel = activeRole === "host" ? L.HOST : L.RUNNER;

  return (
    <View style={styles.screen}>
      {/* ── Header — role label, no tab switcher ── */}
      <LinearGradient colors={T.gradDark} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.roleRow}>
          <Feather
            name={activeRole === "host" ? "layers" : "briefcase"}
            size={rw(14)}
            color={T.textMuted}
          />
          <Text style={styles.roleLabel}>{roleLabel} · Momentum</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoadingMy} onRefresh={handleRefresh} tintColor={T.secondary} />
        }
      >
        {/* ── Skill Graph ── */}
        <View style={styles.gaugeCard}>
          {isLoadingMy && !myMomentum ? (
            <View style={styles.gaugeLoading}>
              <ActivityIndicator size="large" color={T.primary} />
              <Text style={styles.loadingText}>Calculating Momentum…</Text>
            </View>
          ) : (
            <SkillGraph
              score={activeScore}
              signals={myBreakdown?.signals ?? []}
              onPress={handleBreakdownOpen}
              size={rw(240)}
            />
          )}
        </View>

        {/* ── Stats grid ── */}
        {activeData && (
          <StatsGrid score={activeData.score} gigCount={activeData.gig_count} />
        )}

        {/* ── How Momentum works ── */}
        <HowItWorksCard />

        {/* ── Coming soon ── */}
        <ComingSoonCard />
      </ScrollView>

      {/* ── Breakdown modal ── */}
      <MomentumBreakdown
        visible={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        breakdown={myBreakdown}
        isLoading={isLoadingBreakdown}
      />
    </View>
  );
}

// ── Stats grid ────────────────────────────────────────────────────────────────

function StatsGrid({ score, gigCount }: { score: number; gigCount: number }) {
  const band = getBand(score);

  const stats = [
    { label: L.GIGS_DONE, value: gigCount.toString(), icon: "briefcase" as const },
    { label: L.SCORE_BAND, value: band.label, color: band.color, icon: "award" as const },
  ];

  return (
    <View style={statsStyles.grid}>
      {stats.map((s) => (
        <View key={s.label} style={statsStyles.card}>
          <Feather name={s.icon} size={rw(18)} color={s.color ?? T.primary} />
          <Text style={[statsStyles.value, s.color ? { color: s.color } : undefined]}>
            {s.value}
          </Text>
          <Text style={statsStyles.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

const statsStyles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rw(8),
  },
  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: rw(14),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(16),
    alignItems: "center",
    gap: rw(6),
  },
  value: {
    fontSize: rf(20),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  label: {
    fontSize: rf(11),
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
    textAlign: "center",
  },
});

// ── How it works card ─────────────────────────────────────────────────────────

function HowItWorksCard() {
  const points = [
    { icon: "trending-up" as const, text: "Good gigs build it slowly." },
    { icon: "zap-off" as const, text: "No-shows and disputes drop it fast." },
    { icon: "refresh-cw" as const, text: "Recovery only through good behaviour — no passive reset." },
    { icon: "lock" as const, text: "Individual signals are private. Only you see the breakdown." },
  ];

  return (
    <View style={howStyles.card}>
      <Text style={howStyles.title}>How Momentum works</Text>
      {points.map((p) => (
        <View key={p.text} style={howStyles.row}>
          <Feather name={p.icon} size={rw(14)} color={T.primary} />
          <Text style={howStyles.text}>{p.text}</Text>
        </View>
      ))}
    </View>
  );
}

const howStyles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(20),
    gap: rw(12),
    marginTop: rw(8),
  },
  title: {
    fontSize: rf(14),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    marginBottom: rw(4),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rw(10),
  },
  text: {
    flex: 1,
    fontSize: rf(13),
    color: T.textSub,
    lineHeight: rf(19),
  },
});

// ── Coming soon card ──────────────────────────────────────────────────────────

const UPCOMING_FEATURES = [
  { icon: "activity" as const,   text: "Activity feed — every gig, rating, and badge in one timeline" },
  { icon: "bar-chart-2" as const, text: "Leaderboards — see how you rank in your city" },
  { icon: "target" as const,     text: "Milestones — streaks, early bird, top-tier badges" },
  { icon: "users" as const,      text: "Crew — form teams and apply to gigs together" },
];

function ComingSoonCard() {
  return (
    <View style={csStyles.card}>
      {/* Header */}
      <View style={csStyles.header}>
        <View style={csStyles.badge}>
          <Text style={csStyles.badgeText}>COMING SOON</Text>
        </View>
        <Text style={csStyles.title}>Your Activity Hub</Text>
        <Text style={csStyles.subtitle}>
          We're building a richer Arena experience. Here's what's coming next.
        </Text>
      </View>

      {/* Feature rows */}
      <View style={csStyles.list}>
        {UPCOMING_FEATURES.map((f) => (
          <View key={f.text} style={csStyles.row}>
            <View style={csStyles.iconWrap}>
              <Feather name={f.icon} size={rw(14)} color={T.primary} />
            </View>
            <Text style={csStyles.rowText}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const csStyles = StyleSheet.create({
  card: {
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.primary + "30",
    overflow: "hidden",
    marginTop: rw(8),
  },
  header: {
    backgroundColor: T.primary + "0C",
    paddingHorizontal: rw(20),
    paddingTop: rw(20),
    paddingBottom: rw(16),
    gap: rw(6),
    borderBottomWidth: 1,
    borderBottomColor: T.primary + "20",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: T.primary + "18",
    borderRadius: 6,
    paddingHorizontal: rw(8),
    paddingVertical: rw(3),
    borderWidth: 1,
    borderColor: T.primary + "35",
    marginBottom: rw(4),
  },
  badgeText: {
    fontSize: rf(9),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: rf(16),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  subtitle: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    lineHeight: rf(19),
  },
  list: {
    backgroundColor: T.surface,
    paddingHorizontal: rw(20),
    paddingVertical: rw(16),
    gap: rw(14),
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rw(12),
  },
  iconWrap: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(8),
    backgroundColor: T.primary + "12",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  rowText: {
    flex: 1,
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    lineHeight: rf(19),
  },
});

// ── Main styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    paddingHorizontal: rw(20),
    paddingBottom: rw(16),
    justifyContent: "flex-end",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  roleLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: rw(20),
    paddingBottom: rw(40),
    gap: rw(16),
  },
  gaugeCard: {
    backgroundColor: T.surface,
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    paddingVertical: rw(28),
    paddingHorizontal: rw(16),
  },
  gaugeLoading: {
    height: rw(200),
    alignItems: "center",
    justifyContent: "center",
    gap: rw(12),
  },
  loadingText: {
    fontSize: rf(13),
    color: T.textMuted,
  },
});
