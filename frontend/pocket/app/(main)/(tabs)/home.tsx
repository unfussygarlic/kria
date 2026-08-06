import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import {
  ScrollView, View, Text, Pressable, StyleSheet,
  FlatList, ActivityIndicator, Animated, Easing, PanResponder, RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { useGigStore } from "@/stores/gigStore";
import { useBadgeStore, type Badge } from "@/stores/badgeStore";
import { useEarningsStore } from "@/stores/earningsStore";
import { T, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { getBand } from "@/constants/momentum";
import { matchGigs, type MatchedGig } from "@/lib/api/gigs";
import { rf, rw } from "@/constants/responsive";
import { Skeleton } from "@/components/ui/Skeleton";
import { PressableScale } from "@/components/ui/PressableScale";
import { EarningsCard } from "@/components/home/EarningsCard";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
import { MomentumChipRow } from "@/components/home/MomentumChipRow";
import { GrowthNudge } from "@/components/home/GrowthNudge";
import { scrollRegistry } from "@/lib/scrollRegistry";
import * as Location from "expo-location";

const SHOW_HOST_ROLE = false;

// ── Band progress helper ──────────────────────────────────────────────────────

const BAND_RANGES = [
  { min: 0,   max: 99,   label: "Newcomer" },
  { min: 100, max: 299,  label: "Building" },
  { min: 300, max: 499,  label: "Reliable" },
  { min: 500, max: 699,  label: "Trusted"  },
  { min: 700, max: 899,  label: "Elite"    },
  { min: 900, max: 1000, label: "Legend"   },
];

function getBandProgress(score: number) {
  const idx = BAND_RANGES.findIndex((b) => score >= b.min && score <= b.max);
  const band = BAND_RANGES[idx] ?? BAND_RANGES[0];
  const next = BAND_RANGES[idx + 1];
  const range = band.max - band.min + 1;
  const progress = (score - band.min) / range;
  const ptsToNext = next ? next.min - score : 0;
  return { band, next, progress: Math.min(progress, 1), ptsToNext };
}

// ── Category helpers ──────────────────────────────────────────────────────────

function getCatIcon(category: string): React.ComponentProps<typeof Feather>["name"] {
  return (GigCategories.find((c) => c.value === category)?.icon ?? "briefcase") as any;
}
function getCatLabel(category: string): string {
  return GigCategories.find((c) => c.value === category)?.label ?? category;
}
function formatPay(amount: number, type: string) {
  return `₹${amount.toLocaleString("en-IN")}${type === "hourly" ? "/hr" : ""}`;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: "Applied",  color: "#FFC83D" },
  accepted: { label: "Accepted", color: T.primary  },
  rejected: { label: "Rejected", color: T.error    },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <View style={heroSkStyles.card}>
      <View style={heroSkStyles.topRow}>
        <View style={heroSkStyles.left}>
          <Skeleton width={rw(90)} height={rw(14)} borderRadius={rw(4)} />
          <Skeleton width={rw(70)} height={rw(40)} borderRadius={rw(8)} style={{ marginTop: rw(6) }} />
        </View>
        <Skeleton width={rw(80)} height={rw(28)} borderRadius={rw(14)} />
      </View>
      <Skeleton width="100%" height={rw(6)} borderRadius={rw(3)} style={{ marginTop: rw(20) }} />
      <Skeleton width="55%" height={rw(12)} borderRadius={rw(4)} style={{ marginTop: rw(8) }} />
      <View style={heroSkStyles.statsRow}>
        <Skeleton width={rw(50)} height={rw(28)} borderRadius={rw(6)} />
        <Skeleton width={rw(50)} height={rw(28)} borderRadius={rw(6)} />
        <Skeleton width={rw(90)} height={rw(28)} borderRadius={rw(6)} />
      </View>
    </View>
  );
}

const heroSkStyles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(20),
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: { gap: rw(4) },
  statsRow: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rw(20),
    justifyContent: "space-between",
  },
});

const BandHeroCard = memo(function BandHeroCard({ score, gigsDone, streak }: {
  score: number;
  gigsDone: number;
  streak: number;
}) {
  const band = getBand(score);
  const { progress, ptsToNext, next } = getBandProgress(score);
  const isLegend = !next;

  // ── Animated score count-up ───────────────────────────────────────────────
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    countAnim.setValue(0);
    const listener = countAnim.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    Animated.timing(countAnim, {
      toValue: score,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => countAnim.removeListener(listener);
  }, [score]);

  // ── Progress bar slide-in ─────────────────────────────────────────────────
  const barAnim = useRef(new Animated.Value(0)).current;
  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", `${Math.round(progress * 100)}%`],
  });

  useEffect(() => {
    barAnim.setValue(0);
    Animated.timing(barAnim, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [score]);

  // ── Glow pulse ────────────────────────────────────────────────────────────
  const glowOpacity = useRef(new Animated.Value(0.08)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.18, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.08, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
    return () => glowOpacity.stopAnimation();
  }, []);

  return (
    <PressableScale
      scale={0.98}
      style={styles.heroCard}
      onPress={() => router.push("/(main)/(tabs)/arena")}
    >
      {/* Pulsing glow blob — top-right quadrant */}
      <Animated.View style={[styles.heroGlow, { backgroundColor: band.color, opacity: glowOpacity }]} />

      {/* Top row: animated score + band pill */}
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroScoreLabel}>MOMENTUM</Text>
          <Text style={[styles.heroScore, { color: band.color }]}>{displayScore}</Text>
        </View>
        <View style={[styles.heroBandPill, { backgroundColor: band.color + "22", borderColor: band.color + "45" }]}>
          <View style={[styles.heroBandDot, { backgroundColor: band.color }]} />
          <Text style={[styles.heroBandLabel, { color: band.color }]}>{band.label}</Text>
        </View>
      </View>

      {/* Animated progress bar */}
      {!isLegend && (
        <View style={styles.heroProgressSection}>
          <View style={styles.heroProgressTrack}>
            <Animated.View style={[styles.heroProgressFill, { width: barWidth, backgroundColor: band.color }]} />
          </View>
          <Text style={styles.heroProgressLabel}>
            {ptsToNext} pts to <Text style={{ color: band.color }}>{next!.label}</Text>
          </Text>
        </View>
      )}
      {isLegend && (
        <Text style={[styles.heroProgressLabel, { color: band.color, marginTop: 8 }]}>Maximum rank achieved</Text>
      )}

      {/* Bottom stats row */}
      <View style={styles.heroStats}>
        <View style={styles.heroStat}>
          <Feather name="briefcase" size={12} color={T.textMuted} />
          <Text style={styles.heroStatVal}>{gigsDone}</Text>
          <Text style={styles.heroStatKey}>gigs</Text>
        </View>
        <View style={styles.heroStatDivider} />
        <StreakStat streak={streak} />
        <View style={styles.heroStatDivider} />
        <View style={styles.heroStat}>
          <Feather name="chevron-right" size={12} color={T.textMuted} />
          <Text style={[styles.heroStatKey, { color: T.textMuted }]}>Full breakdown</Text>
        </View>
      </View>
    </PressableScale>
  );
});

/**
 * StreakStat — flame that pulses (opacity loop) when the runner has an active
 * streak. Falls back to a muted "start a streak" prompt at 0 so the space
 * doesn't feel empty. Kept inline so it can access home.tsx's shared styles.
 */
function StreakStat({ streak }: { streak: number }) {
  const flameOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (streak <= 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(flameOpacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(flameOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [streak, flameOpacity]);

  if (streak <= 0) {
    return (
      <View style={styles.heroStat}>
        <Feather name="zap" size={12} color={T.textMuted} />
        <Text style={[styles.heroStatKey, { color: T.textMuted }]}>Start a streak</Text>
      </View>
    );
  }

  return (
    <View style={styles.streakChip}>
      <Animated.Text style={[styles.streakEmoji, { opacity: flameOpacity }]}>🔥</Animated.Text>
      <Text style={styles.streakVal}>{streak}</Text>
      <Text style={styles.streakKey}>day streak</Text>
    </View>
  );
}

const GIG_CARD_W = rw(150);
const GIG_CARD_GAP = rw(10);
const GIG_STEP = GIG_CARD_W + GIG_CARD_GAP;

function GigStripCard({ gig }: { gig: MatchedGig }) {
  const catColor = CategoryColors[gig.category] ?? T.textMuted;

  return (
    <PressableScale
      style={styles.gigCard}
      onPress={() => router.push(`/(main)/gig/${gig.gig_id}` as any)}
    >
      {/* Category color glow gradient */}
      <LinearGradient
        colors={[catColor + "28", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.gigStripe, { backgroundColor: catColor }]} />
      <View style={styles.gigCardInner}>
        <Text style={styles.gigTitle} numberOfLines={2}>{gig.title}</Text>
        <View style={styles.gigFooter}>
          <Text style={[styles.gigPay, { color: T.primary }]}>
            {formatPay(gig.pay_amount, gig.pay_type)}
          </Text>
          {gig.distance_km != null && (
            <View style={styles.gigDistRow}>
              <Feather name="map-pin" size={9} color={T.textMuted} />
              <Text style={styles.gigDist}>{gig.distance_km.toFixed(1)} km</Text>
            </View>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const GigMarquee = memo(function GigMarquee({ gigs, onGrab, onRelease }: {
  gigs: MatchedGig[];
  onGrab: () => void;
  onRelease: () => void;
}) {
  const repeatCount = Math.max(3, Math.ceil((rw(400) * 2) / (gigs.length * GIG_STEP)));
  const items = Array.from({ length: repeatCount }, () => gigs).flat();
  const singlePassWidth = gigs.length * GIG_STEP;

  const translateX = useRef(new Animated.Value(0)).current;
  // posRef tracks current position via the animation listener (stays in sync with native side)
  const posRef = useRef(0);
  const dragStartX = useRef(0);
  const animRef = useRef<{ stop: () => void } | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spRef = useRef(singlePassWidth);
  spRef.current = singlePassWidth;

  useEffect(() => {
    const id = translateX.addListener(({ value }) => { posRef.current = -value; });
    return () => translateX.removeListener(id);
  }, [translateX]);

  const stopScroll = useCallback(() => {
    animRef.current?.stop();
    animRef.current = null;
  }, []);

  const startAutoScroll = useCallback((fromX: number) => {
    stopScroll();
    const sp = spRef.current;
    const fullMs = Math.round((sp / 18.75) * 1000); // 18.75 px/sec ≈ original speed

    const runLoop = () => {
      translateX.setValue(0);
      posRef.current = 0;
      const anim = Animated.loop(
        Animated.timing(translateX, {
          toValue: -sp,
          duration: fullMs,
          easing: Easing.linear,
          useNativeDriver: true, // runs on native thread — no JS jank
        })
      );
      animRef.current = anim;
      anim.start();
    };

    if (fromX > 0 && fromX < sp) {
      // Finish the current pass at the same speed, then loop
      const resumeMs = Math.round(((sp - fromX) / sp) * fullMs);
      translateX.setValue(-fromX);
      const anim = Animated.timing(translateX, {
        toValue: -sp,
        duration: resumeMs,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start(({ finished }) => { if (finished) runLoop(); });
    } else {
      runLoop();
    }
  }, [stopScroll, translateX]);

  const scheduleResume = useCallback((currentX: number) => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => startAutoScroll(currentX), 1500);
  }, [startAutoScroll]);

  useEffect(() => {
    startAutoScroll(0);
    return () => { stopScroll(); if (resumeRef.current) clearTimeout(resumeRef.current); };
  }, [startAutoScroll, stopScroll]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 5 && Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderGrant: () => {
      onGrab(); // disable parent ScrollView scroll
      stopScroll();
      if (resumeRef.current) { clearTimeout(resumeRef.current); resumeRef.current = null; }
      dragStartX.current = posRef.current;
    },
    onPanResponderMove: (_, gs) => {
      const sp = spRef.current;
      let newX = dragStartX.current - gs.dx;
      newX = ((newX % sp) + sp) % sp;
      posRef.current = newX;
      translateX.setValue(-newX);
    },
    onPanResponderRelease: () => { onRelease(); scheduleResume(posRef.current); },
    onPanResponderTerminate: () => { onRelease(); scheduleResume(posRef.current); },
  }), [stopScroll, scheduleResume, translateX, onGrab, onRelease]);

  return (
    <View style={styles.marqueeClip} {...panResponder.panHandlers}>
      <Animated.View style={[styles.gigList, { transform: [{ translateX }] }]}>
        {items.map((gig, i) => (
          <GigStripCard key={`${gig.gig_id}-${i}`} gig={gig} />
        ))}
      </Animated.View>
    </View>
  );
});

// ── Badge marquee ─────────────────────────────────────────────────────────────

const BADGE_CATEGORY_COLOR: Record<string, string> = {
  milestone: T.primary,
  streak:    "#FFC83D",
  identity:  "#60a5fa",
};
const BADGE_CATEGORY_ICON: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  milestone: "award",
  streak:    "zap",
  identity:  "shield",
};
const BADGE_CARD_W = rw(110);
const BADGE_CARD_GAP = rw(8);
const BADGE_STEP = rw(110) + rw(8); // card + gap

const BadgeMarquee = memo(function BadgeMarquee({ badges, onGrab, onRelease }: {
  badges: Badge[];
  onGrab: () => void;
  onRelease: () => void;
}) {
  const earned = badges.filter((b) => b.earned);
  const shouldScroll = earned.length > 3;

  const repeatCount = shouldScroll
    ? Math.max(4, Math.ceil((rw(400) * 2) / (earned.length * BADGE_STEP)))
    : 1;
  const items = Array.from({ length: Math.max(repeatCount, 1) }, () => earned).flat();
  const singlePassWidth = earned.length * BADGE_STEP;

  const translateX = useRef(new Animated.Value(0)).current;
  const posRef = useRef(0);
  const dragStartX = useRef(0);
  const animRef = useRef<{ stop: () => void } | null>(null);
  const resumeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spRef = useRef(singlePassWidth);
  spRef.current = singlePassWidth;

  useEffect(() => {
    const id = translateX.addListener(({ value }) => { posRef.current = -value; });
    return () => translateX.removeListener(id);
  }, [translateX]);

  const stopScroll = useCallback(() => {
    animRef.current?.stop();
    animRef.current = null;
  }, []);

  const startAutoScroll = useCallback((fromX: number) => {
    stopScroll();
    const sp = spRef.current;
    const fullMs = Math.round((sp / 15.625) * 1000); // 15.625 px/sec ≈ original speed

    const runLoop = () => {
      translateX.setValue(0);
      posRef.current = 0;
      const anim = Animated.loop(
        Animated.timing(translateX, {
          toValue: -sp,
          duration: fullMs,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      animRef.current = anim;
      anim.start();
    };

    if (fromX > 0 && fromX < sp) {
      const resumeMs = Math.round(((sp - fromX) / sp) * fullMs);
      translateX.setValue(-fromX);
      const anim = Animated.timing(translateX, {
        toValue: -sp,
        duration: resumeMs,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      animRef.current = anim;
      anim.start(({ finished }) => { if (finished) runLoop(); });
    } else {
      runLoop();
    }
  }, [stopScroll, translateX]);

  const scheduleResume = useCallback((currentX: number) => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(() => startAutoScroll(currentX), 1500);
  }, [startAutoScroll]);

  useEffect(() => {
    if (!shouldScroll) return;
    startAutoScroll(0);
    return () => { stopScroll(); if (resumeRef.current) clearTimeout(resumeRef.current); };
  }, [shouldScroll, startAutoScroll, stopScroll]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) =>
      Math.abs(gs.dx) > 5 && Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderGrant: () => {
      onGrab();
      stopScroll();
      if (resumeRef.current) { clearTimeout(resumeRef.current); resumeRef.current = null; }
      dragStartX.current = posRef.current;
    },
    onPanResponderMove: (_, gs) => {
      const sp = spRef.current;
      let newX = dragStartX.current - gs.dx;
      newX = ((newX % sp) + sp) % sp;
      posRef.current = newX;
      translateX.setValue(-newX);
    },
    onPanResponderRelease: () => { onRelease(); scheduleResume(posRef.current); },
    onPanResponderTerminate: () => { onRelease(); scheduleResume(posRef.current); },
  }), [stopScroll, scheduleResume, translateX, onGrab, onRelease]);

  if (earned.length === 0) return null;

  return (
    <View style={styles.marqueeSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent badges</Text>
        <PressableScale scale={0.97} onPress={() => router.push("/(main)/badges")}>
          <Text style={styles.sectionLink}>See all →</Text>
        </PressableScale>
      </View>
      <View style={styles.marqueeClip} {...panResponder.panHandlers}>
        <Animated.View style={[styles.marqueeList, { transform: [{ translateX }] }]}>
          {items.map((badge, i) => {
            const color = BADGE_CATEGORY_COLOR[badge.category] ?? T.textMuted;
            const icon  = BADGE_CATEGORY_ICON[badge.category]  ?? "star";
            return (
              <PressableScale
                key={`${badge.code}-${i}`}
                style={styles.badgeCard}
                onPress={() => router.push("/(main)/badges")}
              >
                <View style={[styles.badgeIconWrap, { backgroundColor: color + "18", borderColor: color + "35" }]}>
                  <Feather name={icon} size={16} color={color} />
                </View>
                <Text style={styles.badgeName} numberOfLines={2}>{badge.name}</Text>
                <Text style={[styles.badgeCat, { color }]}>{badge.category}</Text>
              </PressableScale>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
});

const RecentGigCard = memo(function RecentGigCard({ gig, status }: { gig: any; status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: T.textMuted };
  const catColor = CategoryColors[gig.category] ?? T.textMuted;
  const catLabel = getCatLabel(gig.category);

  const dateStr = gig.event_date
    ? new Date(gig.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <PressableScale
      style={styles.recentGigCard}
      onPress={() => router.push(`/(main)/gig/${gig.id}` as any)}
    >
      {/* Top: category stripe + status pill */}
      <View style={styles.recentGigTop}>
        <View style={[styles.recentCatPill, { backgroundColor: catColor + "18" }]}>
          <View style={[styles.recentCatDot, { backgroundColor: catColor }]} />
          <Text style={[styles.recentCatLabel, { color: catColor }]} numberOfLines={1}>{catLabel}</Text>
        </View>
        <View style={[styles.recentStatusPill, { backgroundColor: cfg.color + "18" }]}>
          <Text style={[styles.recentStatusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.recentGigTitle} numberOfLines={2}>{gig.title}</Text>

      {/* Footer */}
      <View style={styles.recentGigFooter}>
        <Text style={[styles.recentGigPay, { color: T.primary }]}>
          {formatPay(gig.pay_amount, gig.pay_type)}
        </Text>
        {dateStr && (
          <View style={styles.recentGigMeta}>
            <Feather name="calendar" size={9} color={T.textMuted} />
            <Text style={styles.recentGigMetaText}>{dateStr}</Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
});

// ── Shared separator ──────────────────────────────────────────────────────────

const RecentGigSeparator = () => <View style={{ width: rw(10) }} />;

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const activeRole = useAuthStore((s) => s.activeRole);
  const myMomentum = useMomentumStore((s) => s.myMomentum);
  const fetchMyMomentum = useMomentumStore((s) => s.fetchMyMomentum);
  const myApplications = useGigStore((s) => s.myApplications);
  const fetchMyApplications = useGigStore((s) => s.fetchMyApplications);
  const badges = useBadgeStore((s) => s.badges);
  const fetchBadges = useBadgeStore((s) => s.fetchBadges);
  const earningsSummary = useEarningsStore((s) => s.summary);
  const fetchEarnings = useEarningsStore((s) => s.fetchSummary);

  const [nearbyGigs, setNearbyGigs] = useState<MatchedGig[]>([]);
  const [nearbyGigsCount, setNearbyGigsCount] = useState<number | null>(null);
  const [gigsLoading, setGigsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const onMarqueeGrab = useCallback(() => {
    scrollViewRef.current?.setNativeProps({ scrollEnabled: false });
  }, []);
  const onMarqueeRelease = useCallback(() => {
    scrollViewRef.current?.setNativeProps({ scrollEnabled: true });
  }, []);

  useEffect(() => {
    scrollRegistry.register("home", () => scrollViewRef.current?.scrollTo({ y: 0, animated: true }));
    return () => { scrollRegistry.unregister("home"); };
  }, []);

  const isHost = SHOW_HOST_ROLE && activeRole === "host";

  const firstName = profile?.first_name || profile?.display_name || "there";
  const avatarLetter =
    (profile?.first_name?.charAt(0) || profile?.display_name?.charAt(0) || "?").toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  const loadNearbyGigs = useCallback(async () => {
    try {
      // Show gigs immediately — don't block on GPS.
      const initial = await matchGigs({ limit: 5 });
      setNearbyGigs(initial.data?.gigs ?? []);
      setNearbyGigsCount(initial.data?.total ?? null);
      setGigsLoading(false);

      // Try to get location in background; refresh cards with distance info if available.
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const last = await Location.getLastKnownPositionAsync();
      const coords = last?.coords ?? (
        await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
      ).coords;

      const located = await matchGigs({
        limit: 5,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
      if (located.data) {
        setNearbyGigs(located.data.gigs);
        setNearbyGigsCount(located.data.total);
      }
    } catch {
      setGigsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyMomentum();
    fetchMyApplications();
    fetchBadges();
    fetchEarnings();
    loadNearbyGigs();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // momentum/applications/badges stores honour their own TTL; earnings + nearby
    // gigs get force-refreshed so a PTR actually surfaces new data on demand.
    await Promise.all([
      fetchMyMomentum(),
      fetchMyApplications(),
      fetchBadges(),
      fetchEarnings(true),
      loadNearbyGigs(),
    ]);
    setRefreshing(false);
  }, [fetchMyMomentum, fetchMyApplications, fetchBadges, fetchEarnings, loadNearbyGigs]);

  const momentumData = myMomentum?.worker;
  const score = momentumData?.score ?? 0;
  const gigsDone = momentumData?.gig_count ?? profile?.total_gigs_completed ?? 0;
  const streak = profile?.streak_count ?? 0;

  const activeApplications = useMemo(() => {
    const now = new Date();
    return myApplications.filter((a) => {
      if (a.status !== "pending" && a.status !== "accepted") return false;
      if (!a.gig?.event_date) return true;
      const gigEnd = new Date(a.gig.event_date);
      const [hh, mm] = (a.gig.shift_end_time || "23:59").split(":");
      gigEnd.setHours(Number(hh ?? 23), Number(mm ?? 59), 0, 0);
      return gigEnd >= now;
    });
  }, [myApplications]);

  const renderRecentGig = useCallback(
    ({ item }: { item: { gig: any; status: string } }) => (
      <RecentGigCard gig={item.gig} status={item.status} />
    ),
    [],
  );

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: rw(40) }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={T.primary}
          colors={[T.primary]}
        />
      }
    >
      {/* ── Top bar ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + rw(10) }]}>
        <View>
          <Text style={styles.topGreeting}>Good {greeting}</Text>
          <Text style={styles.topName}>{firstName}</Text>
        </View>
        <PressableScale
          style={styles.avatarButton}
          onPress={() => router.push("/(main)/(tabs)/profile")}
        >
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </PressableScale>
      </View>

      {/* ── Earnings hero (NEW) — sets the tone: this app makes you money ── */}
      <View style={styles.section}>
        <EarningsCard
          summary={earningsSummary}
          onPress={() => router.push("/(main)/(tabs)/space")}
        />
      </View>

      {/* ── Primary CTA (NEW) — answers "what do I do next?" ── */}
      <View style={styles.sectionTight}>
        <PrimaryCTA
          nearbyCount={nearbyGigsCount}
          cityLabel={profile?.city ?? null}
          onPress={() => router.push("/(main)/(tabs)/explore")}
        />
      </View>

      {/* ── Hot near you ── */}
      <View style={styles.stripSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hot near you</Text>
          <PressableScale scale={0.97} onPress={() => router.push("/(main)/(tabs)/explore")}>
            <Text style={styles.sectionLink}>See all →</Text>
          </PressableScale>
        </View>

        {gigsLoading ? (
          <View style={styles.gigsSkeletonRow}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width={rw(150)} height={rw(96)} borderRadius={rw(14)} />
            ))}
          </View>
        ) : nearbyGigs.length === 0 ? (
          <View style={styles.gigsEmpty}>
            <Feather name="compass" size={22} color={T.textMuted} />
            <Text style={styles.gigsEmptyText}>No gigs nearby right now</Text>
          </View>
        ) : (
          <GigMarquee gigs={nearbyGigs} onGrab={onMarqueeGrab} onRelease={onMarqueeRelease} />
        )}
      </View>

      {/* ── Momentum snapshot (SHRUNK) — was the full hero, now a chip row ── */}
      {myMomentum != null && (
        <View style={styles.sectionTight}>
          <MomentumChipRow
            score={score}
            streak={streak}
            onPress={() => router.push("/(main)/(tabs)/arena")}
          />
        </View>
      )}

      {/* ── Growth nudge (NEW) — one actionable next step, priority-based ── */}
      <View style={styles.sectionTight}>
        <GrowthNudge
          profile={profile}
          momentumScore={myMomentum != null ? score : null}
          streakCount={streak}
        />
      </View>

      {/* ── Recent badges ── */}
      <BadgeMarquee badges={badges} onGrab={onMarqueeGrab} onRelease={onMarqueeRelease} />

      {/* ── Recent gigs ── */}
      {activeApplications.length > 0 && (
        <View style={styles.stripSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent gigs</Text>
            <PressableScale scale={0.97} onPress={() => router.push("/(main)/(tabs)/space")}>
              <Text style={styles.sectionLink}>See all →</Text>
            </PressableScale>
          </View>
          <FlatList
            horizontal
            data={activeApplications.slice(0, 6)}
            keyExtractor={(item) => item.gig.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentGigList}
            ItemSeparatorComponent={RecentGigSeparator}
            renderItem={renderRecentGig}
          />
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // ── Top bar ──
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: rw(20),
    paddingBottom: rw(20),
  },
  topGreeting: {
    fontSize: rf(12),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  topName: {
    fontSize: rf(24),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    marginTop: 1,
  },
  avatarButton: {
    width: rw(42),
    height: rw(42),
    borderRadius: rw(21),
    backgroundColor: "rgba(212,255,0,0.10)",
    borderWidth: 1.5,
    borderColor: "rgba(212,255,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontSize: rf(17),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
  },

  // ── Layout ──
  section: {
    paddingHorizontal: rw(16),
    marginBottom: rw(24),
  },
  // Tighter vertical rhythm for the new card-per-section components
  // (EarningsCard, PrimaryCTA, MomentumChipRow, GrowthNudge) — the taller
  // hero card doesn't need to be followed by 28 px of dead space.
  sectionTight: {
    paddingHorizontal: rw(16),
    marginBottom: rw(14),
  },
  stripSection: {
    marginBottom: rw(28),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: rw(20),
    marginBottom: rw(12),
  },
  sectionTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    letterSpacing: 0.1,
  },
  sectionLink: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.primary,
  },

  // ── Band hero card ──
  heroCard: {
    backgroundColor: T.surface,
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(20),
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -rw(40),
    right: -rw(40),
    width: rw(160),
    height: rw(160),
    borderRadius: rw(80),
    opacity: 0.12,
  },
  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: rw(16),
  },
  heroScoreLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  heroScore: {
    fontSize: rf(52),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    lineHeight: rf(56),
  },
  heroBandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: rw(10),
    paddingVertical: rw(5),
    borderRadius: rw(20),
    borderWidth: 1,
    marginTop: rw(6),
  },
  heroBandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroBandLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  heroProgressSection: {
    gap: rw(6),
    marginBottom: rw(16),
  },
  heroProgressTrack: {
    height: 3,
    backgroundColor: T.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  heroProgressLabel: {
    fontSize: rf(11),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    paddingTop: rw(14),
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  heroStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroStatVal: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  heroStatKey: {
    fontSize: rf(11),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  heroStatDivider: {
    width: 1,
    height: rw(12),
    backgroundColor: T.border,
  },
  streakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: rw(8),
    paddingVertical: rw(4),
    borderRadius: rw(12),
    backgroundColor: "rgba(255,199,61,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,199,61,0.35)",
  },
  streakEmoji: {
    fontSize: rf(14),
  },
  streakVal: {
    fontSize: rf(13),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFC83D",
  },
  streakKey: {
    fontSize: rf(10),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#FFC83D",
    opacity: 0.85,
    letterSpacing: 0.2,
  },

  // ── Badge marquee ──
  marqueeSection: {
    marginBottom: rw(28),
  },
  marqueeList: {
    flexDirection: "row",
    paddingHorizontal: rw(16),
    gap: BADGE_CARD_GAP,
  },
  badgeCard: {
    width: BADGE_CARD_W,
    backgroundColor: T.surface,
    borderRadius: rw(14),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(12),
    gap: rw(6),
  },
  badgeIconWrap: {
    width: rw(34),
    height: rw(34),
    borderRadius: rw(10),
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeName: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: rf(16),
  },
  badgeCat: {
    fontSize: rf(10),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    textTransform: "capitalize",
  },

  // ── Recent gig cards ──
  recentGigList: {
    paddingHorizontal: rw(16),
  },
  recentGigCard: {
    width: rw(178),
    backgroundColor: T.surface,
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(14),
    justifyContent: "space-between",
    gap: rw(8),
  },
  recentGigTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rw(6),
  },
  recentCatPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: rw(7),
    paddingVertical: rw(3),
    borderRadius: rw(20),
    flexShrink: 1,
  },
  recentCatDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    flexShrink: 0,
  },
  recentCatLabel: {
    fontSize: rf(9),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  recentStatusPill: {
    paddingHorizontal: rw(7),
    paddingVertical: rw(3),
    borderRadius: rw(20),
    flexShrink: 0,
  },
  recentStatusText: {
    fontSize: rf(9),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  recentGigTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: rf(18),
    flex: 1,
  },
  recentGigFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  recentGigPay: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  recentGigMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  recentGigMetaText: {
    fontSize: rf(10),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },

  // ── Shared marquee clip (constrains touch area to visible region) ──
  marqueeClip: {
    overflow: "hidden",
  },
  gigList: {
    flexDirection: "row",
    paddingHorizontal: rw(16),
    gap: GIG_CARD_GAP,
  },
  gigCard: {
    width: rw(150),
    backgroundColor: T.surface,
    borderRadius: rw(14),
    borderWidth: 1,
    borderColor: T.border,
    flexDirection: "row",
    overflow: "hidden",
  },
  gigStripe: {
    width: 3,
  },
  gigCardInner: {
    flex: 1,
    padding: rw(11),
    gap: rw(8),
  },
  gigTitle: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: rf(17),
  },
  gigFooter: {
    gap: rw(3),
  },
  gigPay: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  gigDistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  gigDist: {
    fontSize: rf(10),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },

  // ── Loaders / empty ──
  gigsLoader: {
    height: rw(210),
    justifyContent: "center",
    alignItems: "center",
  },
  gigsSkeletonRow: {
    flexDirection: "row",
    gap: rw(10),
    paddingHorizontal: rw(16),
    paddingVertical: rw(4),
  },
  gigsEmpty: {
    height: rw(120),
    justifyContent: "center",
    alignItems: "center",
    gap: rw(8),
    marginHorizontal: rw(16),
    backgroundColor: T.surface,
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.border,
  },
  gigsEmptyText: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
});
