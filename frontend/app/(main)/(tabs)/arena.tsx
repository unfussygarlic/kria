/**
 * Arena — Trust & Momentum Hub
 * ─────────────────────────────
 * Tabs: Seeker (worker) | Finder (poster)
 * Each tab shows the speedometer gauge + signal stats for that role.
 * Tapping the gauge opens the full Momentum Breakdown modal.
 */

import { useState, useEffect, useCallback } from "react";
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
import { MOMENTUM_ROLES, getBand } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";
import { useMomentumStore } from "@/stores/momentumStore";
import { SpeedometerGauge } from "@/components/momentum/SpeedometerGauge";
import { MomentumBreakdown } from "@/components/momentum/MomentumBreakdown";

type Role = "worker" | "poster";

export default function ArenaScreen() {
  const insets = useSafeAreaInsets();
  const [activeRole, setActiveRole] = useState<Role>("worker");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const myMomentum = useMomentumStore((s) => s.myMomentum);
  const myBreakdown = useMomentumStore((s) => s.myBreakdown);
  const isLoadingMy = useMomentumStore((s) => s.isLoadingMy);
  const isLoadingBreakdown = useMomentumStore((s) => s.isLoadingBreakdown);
  const fetchMyMomentum = useMomentumStore((s) => s.fetchMyMomentum);
  const fetchMyBreakdown = useMomentumStore((s) => s.fetchMyBreakdown);

  useEffect(() => {
    fetchMyMomentum();
  }, []);

  const handleBreakdownOpen = useCallback(() => {
    setShowBreakdown(true);
    if (!myBreakdown) fetchMyBreakdown();
  }, [myBreakdown, fetchMyBreakdown]);

  const handleRefresh = useCallback(async () => {
    await fetchMyMomentum();
  }, [fetchMyMomentum]);

  const activeScore =
    activeRole === "worker"
      ? (myMomentum?.worker.score ?? 500)
      : (myMomentum?.poster.score ?? 500);

  const activeBand = getBand(activeScore);
  const activeData = activeRole === "worker" ? myMomentum?.worker : myMomentum?.poster;

  return (
    <View style={styles.screen}>
      {/* ── Header with role tabs ── */}
      <LinearGradient colors={T.gradDark} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.tabBar}>
          {(["worker", "poster"] as Role[]).map((role) => {
            const cfg = MOMENTUM_ROLES[role];
            const isActive = activeRole === role;
            return (
              <Pressable
                key={role}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveRole(role)}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {cfg.tabLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoadingMy} onRefresh={handleRefresh} tintColor={T.primary} />
        }
      >

        {/* ── Gauge ── */}
        <View style={styles.gaugeCard}>
          {isLoadingMy && !myMomentum ? (
            <View style={styles.gaugeLoading}>
              <ActivityIndicator size="large" color={T.primary} />
              <Text style={styles.loadingText}>Calculating Momentum…</Text>
            </View>
          ) : (
            <SpeedometerGauge
              score={activeScore}
              onPress={handleBreakdownOpen}
              size={rw(260)}
            />
          )}
        </View>

        {/* ── Stats grid ── */}
        {activeData && (
          <StatsGrid role={activeRole} score={activeData.score} gigCount={activeData.gig_count} />
        )}

        {/* ── How Momentum works ── */}
        <HowItWorksCard />
      </ScrollView>

      {/* ── Breakdown modal ── */}
      <MomentumBreakdown
        visible={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        breakdown={myBreakdown}
        activeRole={activeRole}
        isLoading={isLoadingBreakdown}
      />
    </View>
  );
}

// ── Stats grid ────────────────────────────────────────────────────────────────

function StatsGrid({ role, score, gigCount }: { role: Role; score: number; gigCount: number }) {
  const band = getBand(score);

  const workerStats = [
    { label: "Gigs Done", value: gigCount.toString(), icon: "briefcase" as const },
    { label: "Score Band", value: band.label, color: band.color, icon: "award" as const },
  ];
  const posterStats = [
    { label: "Gigs Posted", value: gigCount.toString(), icon: "layers" as const },
    { label: "Score Band", value: band.label, color: band.color, icon: "award" as const },
  ];

  const stats = role === "worker" ? workerStats : posterStats;

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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(16),
    alignItems: "center",
    gap: rw(6),
  },
  value: {
    fontSize: rf(20),
    fontWeight: "700",
    color: T.text,
  },
  label: {
    fontSize: rf(11),
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(20),
    gap: rw(12),
    marginTop: rw(8),
  },
  title: {
    fontSize: rf(14),
    fontWeight: "700",
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

// ── Main styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: rw(20),
    paddingBottom: rw(40),
    gap: rw(16),
  },

  // Tab pill (dark gradient header style)
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: T.textInverse,
  },
  tabBtnText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  tabBtnTextActive: {
    color: T.text,
  },
  gaugeCard: {
    backgroundColor: T.surface,
    borderRadius: 20,
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
