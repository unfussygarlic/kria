import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Gig } from "@/types/database";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { SwipeableJobCard } from "@/components/gig/SwipeableJobCard";
import { SearchTab } from "@/components/explore/SearchTab";
import { Feather } from "@expo/vector-icons";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W * 0.85;
const PREFETCH_THRESHOLD = 10;

type Tab = "flames" | "search";

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
  } = useGigStore();
  const profile = useAuthStore((s) => s.profile);
  const activeRole = useAuthStore((s) => s.activeRole);
  const isFinder = activeRole === "finder";
  const canApply = !isFinder;

  const [activeTab, setActiveTab] = useState<Tab>("flames");
  const [availableGigs, setAvailableGigs] = useState<Gig[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchGigs();
    fetchMyApplications();
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
      fetchMoreGigs();
    }
  }, [currentIndex, availableGigs.length, hasMore, isFetchingMore, fetchMoreGigs]);

  const handleApply = () => {
    if (!availableGigs[currentIndex]) return;
    if (!canApply) {
      Alert.alert("Finder Mode", L.EXPLORE_FINDER_APPLY_BLOCKED);
      return;
    }
    applyToGig(availableGigs[currentIndex].id, availableGigs[currentIndex]);
    setCurrentIndex((currentIndex + 1) % availableGigs.length);
  };

  const handleNext = () =>
    setCurrentIndex((currentIndex + 1) % availableGigs.length);

  const handlePrev = () =>
    setCurrentIndex((currentIndex - 1 + availableGigs.length) % availableGigs.length);

  return (
    <View style={styles.screen}>
      {/* ── Header ── */}
      <LinearGradient
        colors={T.gradDark}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        {/* Tab switcher — Search hidden for Finders */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, activeTab === "flames" && styles.tabBtnActive]}
            onPress={() => setActiveTab("flames")}
          >
            <Text style={[styles.tabBtnText, activeTab === "flames" && styles.tabBtnTextActive]}>
              🔥 Flames
            </Text>
          </Pressable>
          {!isFinder && (
            <Pressable
              style={[styles.tabBtn, activeTab === "search" && styles.tabBtnActive]}
              onPress={() => setActiveTab("search")}
            >
              <Text style={[styles.tabBtnText, activeTab === "search" && styles.tabBtnTextActive]}>
                🔍 Search
              </Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* ── Content ── */}
      {activeTab === "search" ? (
        <SearchTab />
      ) : (
        <>
          {isLoading && availableGigs.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={T.primary} />
            </View>
          ) : availableGigs.length === 0 ? (
            <View style={styles.center}>
              <Feather name="check-circle" size={52} color={T.primary200} />
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
              <Text style={styles.emptySubtitle}>
                No more gigs nearby right now. Check back soon.
              </Text>
            </View>
          ) : (
            <View style={styles.deckArea}>
              <View style={styles.deckCenter}>
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

              {/* User location */}
              {profile?.city && (
                <View style={styles.locationPill}>
                  <Feather name="map-pin" size={15} color={T.primary} />
                  <Text style={styles.locationPillText}>{profile.city}</Text>
                </View>
              )}
            </View>
          )}
        </>
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
    padding: 40,
    gap: 16,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },

  // Tab switcher
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
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  tabBtnTextActive: {
    color: T.text,
  },

  // Flames deck
  deckArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  deckCenter: {
    width: CARD_W,
    alignItems: "stretch",
  },

  // Location
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationPillText: {
    fontSize: 16,
    fontWeight: "600",
    color: T.textSub,
  },

  // Empty state
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
