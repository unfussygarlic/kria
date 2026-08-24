/**
 * Arena — Momentum / Trust hub.
 *
 * Redesigned 2026-08-23 to match the new visual system (SHADOW.card, no
 * borders, TYPE tokens, S/R spacing, one gradient hero moment). Preserves
 * the Momentum computation flow + LevelUpModal celebration + the shared
 * sub-components (ArenaHero, SkillGraph, NextUnlocks, MomentumBreakdown)
 * from the earlier revamp.
 *
 * Layout (top → bottom):
 *   1. Header — compact title + role subline
 *   2. Momentum hero — gradient card with big score in band color + band chip
 *   3. Streak / delta / percentile row (ArenaHero)
 *   4. Skill graph card
 *   5. Stats bento (Gigs done + Score band)
 *   6. Next unlocks (top 3 locked badges)
 *   7. How Momentum works
 *   8. Coming soon
 */

import { useEffect, useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { L } from "@/constants/labels";
import { scrollRegistry } from "@/lib/scrollRegistry";
import { getBand } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { SkillGraph } from "@/components/momentum/SkillGraph";
import { MomentumBreakdown } from "@/components/momentum/MomentumBreakdown";
import { ArenaHero } from "@/components/arena/ArenaHero";
import { NextUnlocks } from "@/components/arena/NextUnlocks";
import { useBadgeStore } from "@/stores/badgeStore";
import { readWeeklyDelta } from "@/lib/momentumSnapshot";

// Ordered by rank so we can distinguish promotions from demotions.
const BAND_ORDER = ["Newcomer", "Building", "Reliable", "Trusted", "Elite", "Legend"];

export default function ArenaScreen() {
  const insets = useSafeAreaInsets();
  const activeRole = useAuthStore((s) => s.activeRole);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [levelUp, setLevelUp] = useState<{ to: string; color: string } | null>(null);
  const prevBandRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRegistry.register("arena", () => scrollRef.current?.scrollTo({ y: 0, animated: true }));
    return () => { scrollRegistry.unregister("arena"); };
  }, []);

  const myMomentum = useMomentumStore((s) => s.myMomentum);
  const myBreakdown = useMomentumStore((s) => s.myBreakdown);
  const myPercentile = useMomentumStore((s) => s.myPercentile);
  const isLoadingMy = useMomentumStore((s) => s.isLoadingMy);
  const isLoadingBreakdown = useMomentumStore((s) => s.isLoadingBreakdown);
  const fetchMyMomentum = useMomentumStore((s) => s.fetchMyMomentum);
  const fetchMyBreakdown = useMomentumStore((s) => s.fetchMyBreakdown);
  const fetchMyPercentile = useMomentumStore((s) => s.fetchMyPercentile);
  const profile = useAuthStore((s) => s.profile);

  const [weeklyDelta, setWeeklyDelta] = useState<number | null>(null);

  const badges = useBadgeStore((s) => s.badges);
  const fetchBadges = useBadgeStore((s) => s.fetchBadges);

  useEffect(() => {
    fetchMyMomentum();
    fetchMyBreakdown();
    fetchMyPercentile();
    fetchBadges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (myMomentum?.worker.score !== undefined) {
      readWeeklyDelta(myMomentum.worker.score).then(setWeeklyDelta);
    }
  }, [myMomentum?.worker.score]);

  const handleBreakdownOpen = useCallback(() => setShowBreakdown(true), []);

  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchMyMomentum(), fetchMyBreakdown(), fetchMyPercentile()]);
  }, [fetchMyMomentum, fetchMyBreakdown, fetchMyPercentile]);

  const activeScore = myMomentum?.worker.score ?? 0;
  const activeData = myMomentum?.worker;
  const roleLabel = activeRole === "host" ? L.HOST : L.RUNNER;
  const band = activeData ? getBand(activeScore) : null;

  // Detect band promotions mid-session — first load seeds the baseline.
  useEffect(() => {
    if (!activeData) return;
    const b = getBand(activeScore);
    if (prevBandRef.current === null) {
      prevBandRef.current = b.label;
      return;
    }
    if (prevBandRef.current !== b.label) {
      const oldIdx = BAND_ORDER.indexOf(prevBandRef.current);
      const newIdx = BAND_ORDER.indexOf(b.label);
      if (newIdx > oldIdx) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setLevelUp({ to: b.label, color: b.color });
      }
      prevBandRef.current = b.label;
    }
  }, [activeData, activeScore]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoadingMy} onRefresh={handleRefresh} tintColor={T.primary} />
        }
      >
        {/* ─── Header ─────────────────────────────────────────────────── */}
        {/* Arena is reached via tap-through from Home / Profile (it's a
            hidden tab, not in the primary bar), so we render our own back
            button — tab routes don't auto-add one. */}
        <View style={styles.header}>
          {router.canGoBack() && (
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={10}
            >
              <Feather name="arrow-left" size={20} color={T.text} />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>{roleLabel} · Momentum</Text>
            <Text style={styles.headerTitle}>Your track record</Text>
          </View>
        </View>

        {/* ─── Momentum hero (gradient) ──────────────────────────────── */}
        <Pressable onPress={handleBreakdownOpen} style={styles.heroWrap}>
          <LinearGradient
            colors={T.gradAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroLabel}>MOMENTUM SCORE</Text>
            {isLoadingMy && !myMomentum ? (
              <View style={{ height: rw(70), justifyContent: "center" }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : (
              <>
                <Text style={styles.heroScore}>{activeScore}</Text>
                <View style={styles.heroBandRow}>
                  {band && (
                    <View style={styles.heroBandChip}>
                      <View style={[styles.heroBandDot, { backgroundColor: band.color }]} />
                      <Text style={styles.heroBandText}>{band.label}</Text>
                    </View>
                  )}
                  <Text style={styles.heroSub}>Tap to see the breakdown</Text>
                </View>
              </>
            )}
          </LinearGradient>
        </Pressable>

        {/* ─── Streak / weekly delta / percentile ─────────────────────── */}
        <ArenaHero
          streak={profile?.streak_count ?? 0}
          longestStreak={profile?.longest_streak ?? 0}
          weeklyDelta={weeklyDelta}
          percentile={myPercentile}
        />

        {/* ─── Skill graph card ──────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skill signals</Text>
          {isLoadingMy && !myMomentum ? (
            <View style={styles.gaugeLoading}>
              <ActivityIndicator size="large" color={T.primary} />
              <Text style={styles.loadingText}>Calculating Momentum…</Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: S.sm }}>
              <SkillGraph
                score={activeScore}
                signals={myBreakdown?.signals ?? []}
                onPress={handleBreakdownOpen}
                size={rw(240)}
              />
            </View>
          )}
        </View>

        {/* ─── Stats bento ───────────────────────────────────────────── */}
        {activeData && <StatsBento score={activeData.score} gigCount={activeData.gig_count} />}

        {/* ─── Next unlocks ──────────────────────────────────────────── */}
        <NextUnlocks badges={badges} />

        {/* ─── How Momentum works ────────────────────────────────────── */}
        <HowItWorksCard />

        {/* ─── Coming soon ───────────────────────────────────────────── */}
        <ComingSoonCard />
      </ScrollView>

      {/* Breakdown modal (external component) */}
      <MomentumBreakdown
        visible={showBreakdown}
        onClose={() => setShowBreakdown(false)}
        breakdown={myBreakdown}
        isLoading={isLoadingBreakdown}
      />

      {/* Level-up celebration */}
      <LevelUpModal visible={!!levelUp} data={levelUp} onClose={() => setLevelUp(null)} />
    </View>
  );
}

// ── Level-up celebration modal ────────────────────────────────────────────────

function LevelUpModal({
  visible, data, onClose,
}: {
  visible: boolean;
  data: { to: string; color: string } | null;
  onClose: () => void;
}) {
  const scale = useRef(new Animated.Value(0.4)).current;
  const halo = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.4);
    halo.setValue(0.6);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(halo, { toValue: 1.2, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(halo, { toValue: 0.6, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [visible, scale, halo]);

  if (!data) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={levelUpStyles.backdrop}>
        <Animated.View
          style={[
            levelUpStyles.halo,
            { backgroundColor: data.color + "33", transform: [{ scale: halo }] },
          ]}
        />
        <Animated.View style={[levelUpStyles.content, { transform: [{ scale }] }]}>
          <Text style={[levelUpStyles.eyebrow, { color: data.color }]}>PROMOTED</Text>
          <Text style={levelUpStyles.title}>You&apos;re now</Text>
          <Text style={[levelUpStyles.band, { color: data.color }]}>{data.to}</Text>
          <Text style={levelUpStyles.sub}>
            Your Momentum crossed a new band. Keep it going.
          </Text>
          <Pressable style={[levelUpStyles.cta, { backgroundColor: data.color }]} onPress={onClose}>
            <Text style={levelUpStyles.ctaText}>Nice</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Stats bento (Gigs done + Score band) ─────────────────────────────────────

function StatsBento({ score, gigCount }: { score: number; gigCount: number }) {
  const band = getBand(score);
  return (
    <View style={styles.bentoRow}>
      <View style={styles.bentoCard}>
        <View style={styles.bentoTop}>
          <Text style={styles.bentoLabel}>GIGS DONE</Text>
          <Feather name="briefcase" size={rw(16)} color={T.textMuted} />
        </View>
        <Text style={styles.bentoValue}>{gigCount}</Text>
        <Text style={styles.bentoFoot}>completed shifts</Text>
      </View>
      <View style={styles.bentoCard}>
        <View style={styles.bentoTop}>
          <Text style={styles.bentoLabel}>BAND</Text>
          <Feather name="award" size={rw(16)} color={band.color} />
        </View>
        <Text style={[styles.bentoValue, { color: band.color }]}>{band.label}</Text>
        <View style={styles.bandRow}>
          <View style={[styles.bandDot, { backgroundColor: band.color }]} />
          <Text style={styles.bentoFoot}>current tier</Text>
        </View>
      </View>
    </View>
  );
}

// ── How Momentum works (rewritten in new system) ────────────────────────────

function HowItWorksCard() {
  const points = [
    { icon: "trending-up" as const, text: "Good gigs build it slowly." },
    { icon: "zap-off" as const, text: "No-shows and disputes drop it fast." },
    { icon: "refresh-cw" as const, text: "Recovery only through good behaviour — no passive reset." },
    { icon: "lock" as const, text: "Individual signals are private. Only you see the breakdown." },
  ];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>How Momentum works</Text>
      <View style={{ gap: S.md, marginTop: S.xs }}>
        {points.map((p) => (
          <View key={p.text} style={styles.row}>
            <View style={styles.rowIcon}>
              <Feather name={p.icon} size={rw(14)} color={T.primary} />
            </View>
            <Text style={styles.rowText}>{p.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Coming soon (rewritten) ─────────────────────────────────────────────────

const UPCOMING_FEATURES = [
  { icon: "activity" as const,    text: "Activity feed — every gig, rating, and badge in one timeline" },
  { icon: "bar-chart-2" as const, text: "Leaderboards — see how you rank in your city" },
  { icon: "target" as const,      text: "Milestones — streaks, early bird, top-tier badges" },
  { icon: "users" as const,       text: "Crew — form teams and apply to gigs together" },
];

function ComingSoonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.comingHeader}>
        <View style={styles.comingBadge}>
          <Text style={styles.comingBadgeText}>COMING SOON</Text>
        </View>
        <Text style={styles.cardTitle}>Your Activity Hub</Text>
        <Text style={styles.cardSub}>
          We&apos;re building a richer Arena. Here&apos;s what&apos;s next.
        </Text>
      </View>
      <View style={{ gap: S.md, marginTop: S.md }}>
        {UPCOMING_FEATURES.map((f) => (
          <View key={f.text} style={styles.row}>
            <View style={styles.rowIcon}>
              <Feather name={f.icon} size={rw(14)} color={T.primary} />
            </View>
            <Text style={styles.rowText}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: S.lg,
    paddingBottom: S.section,
    gap: S.md,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
  backBtn: {
    width: rw(36),
    height: rw(36),
    borderRadius: R.thumb,
    backgroundColor: T.surface1,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  headerEyebrow: {
    ...TYPE.label,
    color: T.textMuted,
  },
  headerTitle: {
    ...TYPE.title1,
    color: T.text,
    marginTop: 2,
  },

  // Hero
  heroWrap: {
    borderRadius: R.hero,
    ...SHADOW.lg,
  },
  hero: {
    borderRadius: R.hero,
    paddingHorizontal: S.xl,
    paddingVertical: S.xl,
    overflow: "hidden",
  },
  heroLabel: {
    ...TYPE.label,
    color: "rgba(255,255,255,0.85)",
  },
  heroScore: {
    ...TYPE.display,
    color: "#FFFFFF",
    marginTop: S.xs,
  },
  heroBandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginTop: S.sm,
    flexWrap: "wrap",
  },
  heroBandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  heroBandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroBandText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroSub: {
    ...TYPE.caption,
    color: "rgba(255,255,255,0.85)",
  },

  // Generic card
  card: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.lg,
    ...SHADOW.card,
  },
  cardTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  cardSub: {
    ...TYPE.body,
    color: T.textSub,
    marginTop: S.xxs,
  },

  // Loading state inside skill-graph card
  gaugeLoading: {
    height: rw(200),
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
  },
  loadingText: {
    ...TYPE.body,
    color: T.textMuted,
  },

  // Bento row
  bentoRow: {
    flexDirection: "row",
    gap: S.sm,
  },
  bentoCard: {
    flex: 1,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    ...SHADOW.card,
  },
  bentoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.xs,
  },
  bentoLabel: {
    ...TYPE.label,
    color: T.textMuted,
  },
  bentoValue: {
    ...TYPE.title1,
    color: T.text,
    marginTop: S.xxs,
  },
  bentoFoot: {
    ...TYPE.body,
    color: T.textSub,
  },
  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: S.xxs,
  },
  bandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Rows inside HowItWorks / ComingSoon
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
  },
  rowIcon: {
    width: rw(30),
    height: rw(30),
    borderRadius: R.thumb,
    backgroundColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowText: {
    flex: 1,
    ...TYPE.body,
    color: T.textSub,
    paddingTop: 2,
  },

  // Coming soon header block
  comingHeader: {
    gap: S.xs,
    marginBottom: S.xs,
  },
  comingBadge: {
    alignSelf: "flex-start",
    backgroundColor: T.tertiary,
    borderRadius: R.chip,
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    marginBottom: S.xs,
  },
  comingBadgeText: {
    ...TYPE.label,
    color: "#FFFFFF",
    fontSize: rf(10),
  },
});

const levelUpStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
  },
  halo: {
    position: "absolute",
    width: rw(320),
    height: rw(320),
    borderRadius: rw(160),
  },
  content: {
    alignItems: "center",
    paddingHorizontal: S.xxl,
    gap: S.xs,
  },
  eyebrow: {
    ...TYPE.label,
    fontSize: rf(12),
    letterSpacing: 3,
    marginBottom: S.xs,
  },
  title: {
    ...TYPE.title2,
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  band: {
    ...TYPE.display,
    fontSize: rf(52),
    marginTop: S.xxs,
  },
  sub: {
    ...TYPE.body,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    marginTop: S.sm,
    paddingHorizontal: S.lg,
  },
  cta: {
    marginTop: S.xl,
    paddingHorizontal: S.hero,
    paddingVertical: S.md,
    borderRadius: R.chip,
  },
  ctaText: {
    ...TYPE.title3,
    color: "#0e0e0e",
    letterSpacing: 0.5,
  },
});
