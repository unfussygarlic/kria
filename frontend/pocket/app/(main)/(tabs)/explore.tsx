import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Gig } from "@/types/database";
import { T } from "@/constants/colors";
import { SwipeableJobCard } from "@/components/gig/SwipeableJobCard";
import { Feather } from "@expo/vector-icons";
import { rf, rw } from "@/constants/responsive";
import { MatchGigsParams } from "@/lib/api/gigs";
import { Skeleton } from "@/components/ui/Skeleton";
import { PressableScale } from "@/components/ui/PressableScale";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const CARD_W = SCREEN_W * 0.93;
const PREFETCH_THRESHOLD = 15;

// ── Card skeleton shown while gigs load ───────────────────────────────────────
function CardSkeleton() {
  return (
    <View style={cardSkStyles.card}>
      <Skeleton width="100%" height={116} borderRadius={0} style={{ borderRadius: 0 }} />
      <View style={cardSkStyles.body}>
        <Skeleton width="70%" height={rw(28)} borderRadius={rw(6)} />
        <Skeleton width="45%" height={rw(16)} borderRadius={rw(4)} style={{ marginTop: rw(8) }} />
        <Skeleton width="55%" height={rw(32)} borderRadius={rw(6)} style={{ marginTop: rw(14) }} />
        <View style={cardSkStyles.detailsRow}>
          <Skeleton width="80%" height={rw(14)} borderRadius={rw(4)} />
          <Skeleton width="65%" height={rw(14)} borderRadius={rw(4)} />
          <Skeleton width="75%" height={rw(14)} borderRadius={rw(4)} />
        </View>
        <Skeleton width="100%" height={1} borderRadius={0} style={{ marginTop: rw(16), opacity: 0.3 }} />
        <Skeleton width="30%" height={rw(20)} borderRadius={rw(10)} style={{ marginTop: rw(14), alignSelf: "center" }} />
      </View>
    </View>
  );
}

const cardSkStyles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1919",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
    minHeight: SCREEN_H * 0.62,
  },
  body: {
    padding: rw(20),
    gap: rw(6),
  },
  detailsRow: {
    gap: rw(10),
    marginTop: rw(16),
  },
});

type LocationState = "loading" | "denied" | "ready";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const {
    gigs,
    myApplications,
    isLoading,
    hasMore,
    isFetchingMore,
    posterScores,
    fetchGigs,
    fetchMoreGigs,
    fetchMyApplications,
    applyToGig,
    prefetchGig,
  } = useGigStore(useShallow((s) => ({
    gigs: s.gigs,
    myApplications: s.myApplications,
    isLoading: s.isLoading,
    hasMore: s.hasMore,
    isFetchingMore: s.isFetchingMore,
    posterScores: s.posterScores,
    fetchGigs: s.fetchGigs,
    fetchMoreGigs: s.fetchMoreGigs,
    fetchMyApplications: s.fetchMyApplications,
    applyToGig: s.applyToGig,
    prefetchGig: s.prefetchGig,
  })));
  const profile = useAuthStore((s) => s.profile);

  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locationState, setLocationState] = useState<LocationState>("loading");
  const [locationLabel, setLocationLabel] = useState<string>("Nearby");

  // Refs so animation callbacks never capture stale values.
  const availableGigsRef = useRef<Gig[]>([]);
  const locationRef = useRef<MatchGigsParams | undefined>(undefined);

  // Keep ref in sync with state so handlers always see the latest array length.
  useEffect(() => {
    availableGigsRef.current = availableGigs;
  }, [availableGigs]);

  // ── Location (required for Explore) ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationState("denied");
          return;
        }
        const last = await Location.getLastKnownPositionAsync();
        const coords = last?.coords ?? (
          await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
        ).coords;

        locationRef.current = { latitude: coords.latitude, longitude: coords.longitude };

        // Reverse geocode to get a human-readable place name from GPS coords.
        // "city" is often null in Indian metros — fall back through district → subregion.
        try {
          const [place] = await Location.reverseGeocodeAsync(
            { latitude: coords.latitude, longitude: coords.longitude },
          );
          const label = place?.city ?? place?.district ?? place?.subregion ?? null;
          if (label) setLocationLabel(label);
        } catch {
          // Non-critical — pill stays "Nearby"
        }

        setLocationState("ready");
        fetchGigs(undefined, locationRef.current, "distance");
        fetchMyApplications();
      } catch {
        setLocationState("denied");
      }
    })();
  }, []);

  // ── Derive available gigs from store ──────────────────────────────────────
  useEffect(() => {
    const appliedIds = new Set(myApplications.map((a) => a.gig.id));
    const filtered = gigs.filter(
      (g) => !appliedIds.has(g.id) && g.poster_id !== profile?.id
    );
    setAvailableGigs(filtered);
    // Clamp index — never let it go out of bounds when the deck shrinks.
    setCurrentIndex((prev) =>
      filtered.length === 0 ? 0 : Math.min(prev, filtered.length - 1)
    );
  }, [gigs, myApplications, profile?.id]);

  // ── Prefetch next batch ───────────────────────────────────────────────────
  useEffect(() => {
    const cardsRemaining = availableGigs.length - currentIndex;
    if (cardsRemaining <= PREFETCH_THRESHOLD && hasMore && !isFetchingMore) {
      fetchMoreGigs(locationRef.current, "distance");
    }
  }, [currentIndex, availableGigs.length, hasMore, isFetchingMore]);

  // ── Prefetch detail data for upcoming cards ───────────────────────────────
  useEffect(() => {
    const len = availableGigs.length;
    if (len === 0) return;
    [1, 2].forEach((offset) => {
      const next = availableGigs[(currentIndex + offset) % len];
      if (next) prefetchGig(next.id);
    });
  }, [currentIndex, availableGigs]);

  // ── Auto-fetch when available gigs run dry but more exist ─────────────────
  useEffect(() => {
    if (
      availableGigs.length === 0 &&
      hasMore &&
      !isFetchingMore &&
      !isLoading &&
      locationState === "ready"
    ) {
      fetchMoreGigs(locationRef.current, "distance");
    }
  }, [availableGigs.length, hasMore, isFetchingMore, isLoading, locationState]);

  // ── Handlers — use functional setCurrentIndex + ref so no stale closures ──
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const len = availableGigsRef.current.length;
      return len > 0 ? (prev + 1) % len : 0;
    });
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => {
      const len = availableGigsRef.current.length;
      return len > 0 ? (prev - 1 + len) % len : 0;
    });
  }, []);

  const handleApply = useCallback(() => {
    const gig = availableGigsRef.current[currentIndex];
    if (!gig) return;
    applyToGig(gig.id, gig);
    // Advance to next — deck will shrink by 1 after the optimistic update,
    // so use len - 1 as the modulus to stay in bounds.
    setCurrentIndex((prev) => {
      const len = availableGigsRef.current.length;
      return len > 1 ? (prev + 1) % len : 0;
    });
  }, [currentIndex, applyToGig]);

  const handleRefresh = useCallback(() => {
    if (locationRef.current) {
      fetchGigs(undefined, locationRef.current, "distance");
    }
  }, [fetchGigs]);

  // ── Location loading ───────────────────────────────────────────────────────
  if (locationState === "loading") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Skeleton width={rw(90)} height={rw(28)} borderRadius={rw(14)} />
        </View>
        <View style={styles.deckArea}>
          <View style={[styles.deckCenter, { width: CARD_W }]}>
            <CardSkeleton />
          </View>
        </View>
      </View>
    );
  }

  // ── Location denied ────────────────────────────────────────────────────────
  if (locationState === "denied") {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.iconWrap}>
          <Feather name="map-pin" size={rw(28)} color={T.primary} />
        </View>
        <Text style={styles.stateTitle}>Location needed</Text>
        <Text style={styles.stateSub}>
          Explore shows gigs closest to you. Enable location in your device settings to continue.
        </Text>
        <PressableScale style={styles.ctaButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.ctaText}>Open Settings</Text>
        </PressableScale>
      </View>
    );
  }

  // ── Fetching gigs (first load) ─────────────────────────────────────────────
  if ((isLoading || isFetchingMore) && availableGigs.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Skeleton width={rw(90)} height={rw(28)} borderRadius={rw(14)} />
        </View>
        <View style={styles.deckArea}>
          <View style={[styles.deckCenter, { width: CARD_W }]}>
            <CardSkeleton />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.locationPill}>
          <Feather name="map-pin" size={rw(12)} color={T.primary} />
          <Text style={styles.locationPillText}>{locationLabel}</Text>
        </View>
      </View>

      {/* ── Empty state ── */}
      {availableGigs.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconRing}>
            <Feather name="compass" size={rw(30)} color={T.primary} />
          </View>
          <Text style={styles.stateTitle}>You're all caught up</Text>
          <Text style={styles.stateSub}>
            No new gigs near you right now. We'll have more soon — check back later.
          </Text>
          {!hasMore && (
            <PressableScale style={styles.ctaButton} onPress={handleRefresh}>
              <Text style={styles.ctaText}>Refresh</Text>
            </PressableScale>
          )}
        </View>
      ) : (
        <View style={styles.deckArea}>
          <View style={[styles.deckCenter, { width: CARD_W }]}>
            <SwipeableJobCard
              key={availableGigs[currentIndex]?.id}
              gig={availableGigs[currentIndex]}
              posterMomentum={posterScores[availableGigs[currentIndex]?.id]}
              canApply={true}
              onApply={handleApply}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </View>

          {/* Counter + swipe hints */}
          <View style={styles.hintRow}>
            <View style={styles.hintItem}>
              <Feather name="chevron-left" size={13} color={T.textMuted} />
              <Text style={styles.hintText}>Prev</Text>
            </View>
            <View style={styles.counterWrap}>
              <Pressable style={styles.applyHint} onPress={handleApply}>
                <Feather name="arrow-up" size={13} color={T.selText} />
                <Text style={styles.applyHintText}>Swipe up to apply</Text>
              </Pressable>
              <Text style={styles.counterText}>
                {currentIndex + 1} / {availableGigs.length}
                {hasMore ? "+" : ""}
              </Text>
            </View>
            <View style={styles.hintItem}>
              <Text style={styles.hintText}>Next</Text>
              <Feather name="chevron-right" size={13} color={T.textMuted} />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: rw(40),
    gap: rw(16),
  },

  // Location / state screens
  iconWrap: {
    width: rw(72),
    height: rw(72),
    borderRadius: rw(36),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: rw(4),
  },
  emptyIconRing: {
    width: rw(72),
    height: rw(72),
    borderRadius: rw(36),
    backgroundColor: T.primary + "14",
    borderWidth: 1,
    borderColor: T.primary + "30",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: rw(4),
  },
  stateTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    textAlign: "center",
  },
  stateSub: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    textAlign: "center",
    lineHeight: rf(21),
  },
  ctaButton: {
    marginTop: rw(8),
    paddingHorizontal: rw(28),
    paddingVertical: rw(12),
    backgroundColor: T.ctaBg,
    borderRadius: rw(12),
  },
  ctaText: {
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.ctaText,
  },

  // Header
  header: {
    paddingHorizontal: rw(20),
    paddingTop: rw(12),
    paddingBottom: rw(10),
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: rw(5),
    paddingHorizontal: rw(10),
    paddingVertical: rw(5),
    backgroundColor: T.surface,
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: T.border,
  },
  locationPillText: {
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
  },

  // Deck
  deckArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: rw(16),
    paddingBottom: rw(16),
  },
  deckCenter: {
    alignItems: "stretch",
  },

  // Swipe hints
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: CARD_W,
  },
  hintItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(3),
  },
  counterWrap: {
    alignItems: "center",
    gap: rw(4),
  },
  applyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
    paddingHorizontal: rw(14),
    paddingVertical: rw(6),
    backgroundColor: T.selBg,
    borderRadius: rw(20),
  },
  applyHintText: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.selText,
  },
  counterText: {
    fontSize: rf(11),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  hintText: {
    fontSize: rf(11),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
  },
});
