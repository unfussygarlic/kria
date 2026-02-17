import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Gig } from "@/types/database";
import { T } from "@/constants/colors";
import { SwipeableJobCard } from "@/components/gig/SwipeableJobCard";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";

const { width: SCREEN_W } = Dimensions.get("window");

/** Width of each card — 85% of screen, centered */
const CARD_W = SCREEN_W * 0.85;

const PREFETCH_THRESHOLD = 10; // Fetch more when 10 cards remaining

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const {
    gigs,
    myApplications,
    isLoading,
    hasMore,
    isFetchingMore,
    fetchGigs,
    fetchMoreGigs,
    fetchMyApplications,
    applyToGig,
  } = useGigStore();
  const profile = useAuthStore((s) => s.profile);

  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchGigs();
    fetchMyApplications();
  }, []);

  useEffect(() => {
    const appliedIds = new Set(myApplications.map((a) => a.gig.id));
    const filtered = gigs.filter((g) => !appliedIds.has(g.id) && g.poster_id !== profile?.id);
    setAvailableGigs(filtered);
    // Reset index if out of bounds
    if (currentIndex >= filtered.length && filtered.length > 0) {
      setCurrentIndex(filtered.length - 1);
    }
  }, [gigs, myApplications, profile?.id]);

  // Prefetch logic: Fetch more when approaching end of deck
  useEffect(() => {
    const cardsRemaining = availableGigs.length - currentIndex;
    if (cardsRemaining <= PREFETCH_THRESHOLD && hasMore && !isFetchingMore) {
      console.log(`🔄 Prefetching: ${cardsRemaining} cards remaining`);
      fetchMoreGigs();
    }
  }, [currentIndex, availableGigs.length, hasMore, isFetchingMore, fetchMoreGigs]);

  const currentGig = availableGigs[currentIndex];

  /** ⬆️ Apply — fire-and-forget API call, move to next */
  const handleApply = () => {
    if (!currentGig) return;
    applyToGig(currentGig.id, currentGig); // optimistic update in store
    // Move to next (circular)
    setCurrentIndex((currentIndex + 1) % availableGigs.length);
  };

  /** ➡️ Next job (circular) */
  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % availableGigs.length);
  };

  /** ⬅️ Previous job (circular) */
  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + availableGigs.length) % availableGigs.length);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading && availableGigs.length === 0) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Jobs</Text>
        {profile?.city ? (
          <View style={styles.locationChip}>
            <Feather name="map-pin" size={12} color={T.primary} />
            <Text style={styles.locationText}>{profile.city}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Card area (centered) ──────────────────────────────────────────── */}
      <View style={styles.deckArea}>
        {availableGigs.length === 0 ? (
          <View style={styles.center}>
            <Feather name="check-circle" size={52} color={T.primary200} />
            <Text style={styles.emptyTitle}>You're all caught up!</Text>
            <Text style={styles.emptySubtitle}>
              No more gigs nearby right now. Check back soon.
            </Text>
          </View>
        ) : (
          <View style={styles.deckCenter}>
            <SwipeableJobCard
              key={currentGig.id}
              gig={currentGig}
              onApply={handleApply}
              onNext={handleNext}
              onPrev={handlePrev}
            />
          </View>
        )}
      </View>
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
    padding: 40,
    gap: 16,
  },

  // ── Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: T.text,
  },
  locationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.primary50,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "600",
    color: T.primary,
  },

  // ── Deck area (centered vertically and horizontally)
  deckArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  deckCenter: {
    width: CARD_W,
    alignItems: "stretch",
  },

  // ── Empty state
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: T.text,
  },
  emptySubtitle: {
    fontSize: 15,
    color: T.textSub,
    textAlign: "center",
    lineHeight: 22,
  },
});
