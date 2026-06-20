import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
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

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W * 0.93;
const PREFETCH_THRESHOLD = 10;

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
  })));
  const profile = useAuthStore((s) => s.profile);

  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [locationState, setLocationState] = useState<LocationState>("loading");
  const locationRef = useRef<MatchGigsParams | undefined>(undefined);

  // Location is required for Explore — gigs are always sorted nearest-first.
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationState("denied");
          return;
        }

        // Try last-known first (instant), fall back to fresh fix.
        const last = await Location.getLastKnownPositionAsync();
        const coords = last?.coords ?? (
          await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
        ).coords;

        locationRef.current = { latitude: coords.latitude, longitude: coords.longitude };
        setLocationState("ready");

        fetchGigs(undefined, locationRef.current, "distance");
        fetchMyApplications();
      } catch {
        setLocationState("denied");
      }
    })();
  }, []);

  useEffect(() => {
    const appliedIds = new Set(myApplications.map((a) => a.gig.id));
    const filtered = gigs.filter(
      (g) => !appliedIds.has(g.id) && g.poster_id !== profile?.id
    );
    setAvailableGigs(filtered);
    if (currentIndex >= filtered.length && filtered.length > 0) {
      setCurrentIndex(filtered.length - 1);
    }
  }, [gigs, myApplications, profile?.id]);

  useEffect(() => {
    const cardsRemaining = availableGigs.length - currentIndex;
    if (cardsRemaining <= PREFETCH_THRESHOLD && hasMore && !isFetchingMore) {
      fetchMoreGigs(locationRef.current, "distance");
    }
  }, [currentIndex, availableGigs.length, hasMore, isFetchingMore]);

  const handleApply = () => {
    if (!availableGigs[currentIndex]) return;
    applyToGig(availableGigs[currentIndex].id, availableGigs[currentIndex]);
    setCurrentIndex((currentIndex + 1) % availableGigs.length);
  };

  const handleNext = () =>
    setCurrentIndex((currentIndex + 1) % availableGigs.length);

  const handlePrev = () =>
    setCurrentIndex((currentIndex - 1 + availableGigs.length) % availableGigs.length);

  // ── Location loading ───────────────────────────────────────────────────────
  if (locationState === "loading") {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={styles.stateTitle}>Finding gigs near you</Text>
        <Text style={styles.stateSub}>Getting your location…</Text>
      </View>
    );
  }

  // ── Location denied ────────────────────────────────────────────────────────
  if (locationState === "denied") {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <View style={styles.iconWrap}>
          <Feather name="map-pin" size={rw(32)} color={T.primary} />
        </View>
        <Text style={styles.stateTitle}>Location needed</Text>
        <Text style={styles.stateSub}>
          Explore shows the nearest gigs to you. Enable location access to continue.
        </Text>
        <Pressable style={styles.ctaButton} onPress={() => Linking.openSettings()}>
          <Text style={styles.ctaText}>Open Settings</Text>
        </Pressable>
      </View>
    );
  }

  // ── Loading gigs (location ready, fetching) ────────────────────────────────
  if (isLoading && availableGigs.length === 0) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={T.primary} />
        <Text style={styles.stateSub}>Loading nearby gigs…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.locationPill}>
          <Feather name="map-pin" size={rw(12)} color={T.primary} />
          <Text style={styles.locationPillText}>
            {profile?.city ?? "Nearby"}
          </Text>
        </View>
      </View>

      {/* ── Empty state ── */}
      {availableGigs.length === 0 ? (
        <View style={styles.center}>
          <Feather name="check-circle" size={52} color={T.primary} />
          <Text style={styles.stateTitle}>You're all caught up!</Text>
          <Text style={styles.stateSub}>
            No more gigs nearby right now. Check back soon.
          </Text>
        </View>
      ) : (
        <View style={styles.deckArea}>
          <View style={[styles.deckCenter, { width: CARD_W }]}>
            <SwipeableJobCard
              key={availableGigs[currentIndex].id}
              gig={availableGigs[currentIndex]}
              posterMomentum={posterScores[availableGigs[currentIndex].id]}
              canApply={true}
              onApply={handleApply}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </View>

          {/* Swipe hints */}
          <View style={styles.hintRow}>
            <View style={styles.hintItem}>
              <Feather name="chevron-left" size={13} color={T.textMuted} />
              <Text style={styles.hintText}>Prev</Text>
            </View>
            <Pressable style={styles.applyHint} onPress={handleApply}>
              <Feather name="arrow-up" size={13} color={T.selText} />
              <Text style={styles.applyHintText}>Swipe up to apply</Text>
            </Pressable>
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
  hintText: {
    fontSize: rf(11),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
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
});
