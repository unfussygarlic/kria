import { useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigStore } from "@/stores/gigStore";
import { Gig, MyEventSummary } from "@/types/database";
import { T } from "@/constants/colors";
import { JobCard, formatDate } from "@/components/gig/JobCard";

// ── Merged list item type ─────────────────────────────────────────────────────

type SpaceItem =
  | { kind: "gig"; data: Gig; created_at: string }
  | { kind: "event"; data: MyEventSummary; created_at: string };

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event, onPress }: { event: MyEventSummary; onPress: () => void }) {
  const statusColor =
    event.status === "open" ? T.success :
    event.status === "completed" ? T.textMuted : T.error;

  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIconWrap}>
          <Feather name="calendar" size={20} color={T.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
          <Text style={styles.eventMeta}>
            {formatDate(event.event_date)} · {event.venue_name}, {event.city}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={T.textMuted} />
      </View>

      <View style={styles.eventStats}>
        <View style={styles.statChip}>
          <Feather name="briefcase" size={12} color={T.textMuted} />
          <Text style={styles.statText}>{event.job_count} {event.job_count === 1 ? "job" : "jobs"}</Text>
        </View>
        <View style={styles.statChip}>
          <Feather name="users" size={12} color={T.textMuted} />
          <Text style={styles.statText}>{event.total_slots} slots</Text>
        </View>
        <View style={styles.statChip}>
          <Feather name="user-check" size={12} color={T.primary} />
          <Text style={[styles.statText, { color: T.primary }]}>
            {event.total_applicants} applicants
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SpaceScreen() {
  const insets = useSafeAreaInsets();
  const {
    myPostedGigs,
    myPostedEvents,
    isLoading,
    fetchMyPostedGigs,
    fetchMyPostedEvents,
  } = useGigStore();

  const loadAll = useCallback(async () => {
    await Promise.all([fetchMyPostedGigs(), fetchMyPostedEvents()]);
  }, []);

  useEffect(() => {
    loadAll();
  }, []);

  // Merge and sort by created_at desc
  const items: SpaceItem[] = [
    ...myPostedGigs.map((g): SpaceItem => ({ kind: "gig", data: g, created_at: g.created_at })),
    ...myPostedEvents.map((e): SpaceItem => ({ kind: "event", data: e, created_at: e.created_at })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const renderItem = ({ item }: { item: SpaceItem }) => {
    if (item.kind === "event") {
      return (
        <EventCard
          event={item.data as MyEventSummary}
          onPress={() => router.push(`/(main)/event/${item.data.id}`)}
        />
      );
    }
    const gig = item.data as Gig;
    return (
      <JobCard
        gig={gig}
        variant="space"
        onPress={() => router.push(`/(main)/gig/applicants/${gig.id}`)}
      />
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Space</Text>
      </View>

      {isLoading && items.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.data.id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={loadAll} />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="layers" size={48} color={T.primary200} />
              <Text style={styles.emptyTitle}>Nothing posted yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + to post a gig or create an event.
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: T.text,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 16,
  },
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

  // Event card
  eventCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    gap: 12,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eventIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.primary50,
    justifyContent: "center",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
  },
  eventMeta: {
    fontSize: 13,
    color: T.textSub,
  },
  eventStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: T.bg,
    borderRadius: 8,
  },
  statText: {
    fontSize: 12,
    color: T.textSub,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
