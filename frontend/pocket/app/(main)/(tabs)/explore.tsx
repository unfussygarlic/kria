import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Gig } from "@/types/database";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { SwipeableJobCard } from "@/components/gig/SwipeableJobCard";
import { Feather } from "@expo/vector-icons";
import { rf, rw } from "@/constants/responsive";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W * 0.93;
const PREFETCH_THRESHOLD = 10;

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
  const canApply = true;

  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const locationRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);

  useEffect(() => {
    // Load gigs immediately without location so the deck appears right away.
    fetchGigs();
    fetchMyApplications();

    // Get location in background and re-rank once available.
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          locationRef.current = { latitude: last.coords.latitude, longitude: last.coords.longitude };
        } else {
          const fresh = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          locationRef.current = { latitude: fresh.coords.latitude, longitude: fresh.coords.longitude };
        }
        // Re-fetch with location for distance-weighted ranking.
        fetchGigs(undefined, locationRef.current);
      } catch { /* silent — gigs already loaded without location */ }
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
      fetchMoreGigs(locationRef.current);
    }
  }, [currentIndex, availableGigs.length, hasMore, isFetchingMore, fetchMoreGigs]);

  const handleApply = () => {
    if (!availableGigs[currentIndex]) return;
    applyToGig(availableGigs[currentIndex].id, availableGigs[currentIndex]);
    setCurrentIndex((currentIndex + 1) % availableGigs.length);
  };

  const handleNext = () =>
    setCurrentIndex((currentIndex + 1) % availableGigs.length);

  const handlePrev = () =>
    setCurrentIndex((currentIndex - 1 + availableGigs.length) % availableGigs.length);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* ── Slim header ── */}
      {profile?.city && (
        <View style={styles.header}>
          <View style={styles.locationPill}>
            <Feather name="map-pin" size={rw(12)} color={T.primary} />
            <Text style={styles.locationPillText}>{profile.city}</Text>
          </View>
        </View>
      )}

      {/* ── Card deck ── */}
      {isLoading && availableGigs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : availableGigs.length === 0 ? (
        <View style={styles.center}>
          <Feather name="check-circle" size={52} color={T.primary} />
          <Text style={styles.emptyTitle}>You're all caught up!</Text>
          <Text style={styles.emptySubtitle}>
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
              canApply={canApply}
              onApply={handleApply}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </View>

          {/* Swipe hint */}
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

  // Header — location pill only
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

  // Empty state
  emptyTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  emptySubtitle: {
    fontSize: rf(15),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    textAlign: "center",
    lineHeight: rf(22),
  },
});
