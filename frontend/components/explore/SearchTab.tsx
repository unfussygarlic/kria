import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  searchJobs,
  SearchResultItem,
  SearchType,
  WhenFilter,
} from "@/lib/api/search";
import { GigCategories } from "@/constants/config";
import { T } from "@/constants/colors";

// ── Filter option definitions ─────────────────────────────────────────────

const TYPE_OPTIONS: { value: SearchType; label: string }[] = [
  { value: "all",    label: "All" },
  { value: "gigs",   label: "Gigs" },
  { value: "events", label: "Events" },
];

const WHEN_OPTIONS: { value: WhenFilter | ""; label: string }[] = [
  { value: "",            label: "Any time" },
  { value: "today",       label: "Today" },
  { value: "this_week",   label: "This week" },
  { value: "this_month",  label: "This month" },
  { value: "next_month",  label: "Next month" },
];

const LIMIT = 20;

// ── Format helpers ────────────────────────────────────────────────────────

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtPay(rate: number | null, type: string | null): string {
  if (!rate) return "";
  const suffix = type === "hourly" ? "/hr" : type === "daily" ? "/day" : "";
  return `₹${rate.toLocaleString("en-IN")}${suffix}`;
}

function slotsLeft(total: number | null, filled: number | null): string {
  if (total == null) return "";
  const left = total - (filled ?? 0);
  return `${left}/${total} slots`;
}

// ── Category label lookup ─────────────────────────────────────────────────

const CAT_LABEL = new Map(GigCategories.map((c) => [c.value, c.label]));

// ── Search result card ────────────────────────────────────────────────────

function ResultCard({ item }: { item: SearchResultItem }) {
  const isEvent = item.result_type === "event";

  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        if (isEvent) {
          router.push(`/(main)/event/${item.id}` as any);
        } else {
          router.push(`/(main)/gig/${item.id}` as any);
        }
      }}
    >
      {/* Top row: type badge + date */}
      <View style={styles.cardTopRow}>
        <View style={[styles.typeBadge, isEvent ? styles.typeBadgeEvent : styles.typeBadgeGig]}>
          <Text style={[styles.typeBadgeText, isEvent ? styles.typeBadgeEventText : styles.typeBadgeGigText]}>
            {isEvent ? "Event" : CAT_LABEL.get(item.category ?? "") ?? "Gig"}
          </Text>
        </View>
        {item.event_date && (
          <View style={styles.dateChip}>
            <Feather name="calendar" size={11} color={T.textMuted} />
            <Text style={styles.dateText}>{fmtDate(item.event_date)}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {/* Meta row */}
      <View style={styles.cardMeta}>
        {item.city && (
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={12} color={T.textMuted} />
            <Text style={styles.metaText}>{item.city}</Text>
          </View>
        )}
        {!isEvent && item.pay_rate && (
          <View style={styles.metaItem}>
            <Feather name="dollar-sign" size={12} color={T.textMuted} />
            <Text style={styles.metaText}>{fmtPay(item.pay_rate, item.pay_type)}</Text>
          </View>
        )}
        {!isEvent && item.slots_total != null && (
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color={T.textMuted} />
            <Text style={styles.metaText}>{slotsLeft(item.slots_total, item.slots_filled)}</Text>
          </View>
        )}
        {isEvent && item.open_job_count != null && (
          <View style={styles.metaItem}>
            <Feather name="briefcase" size={12} color={T.primary} />
            <Text style={[styles.metaText, { color: T.primary, fontWeight: "600" }]}>
              {item.open_job_count} open job{item.open_job_count !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Main SearchTab ────────────────────────────────────────────────────────

export function SearchTab() {
  const [query, setQuery]             = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [type, setType]               = useState<SearchType>("all");
  const [when, setWhen]               = useState<WhenFilter | "">("");
  const [category, setCategory]       = useState<string>("");

  const [results, setResults]         = useState<SearchResultItem[]>([]);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Debounce query → debouncedQ
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Re-run search from page 1 whenever filters change
  useEffect(() => {
    runSearch(1, true);
  }, [debouncedQ, type, when, category]);

  const runSearch = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const res = await searchJobs({
        q: debouncedQ || undefined,
        type,
        category: category || undefined,
        when: (when as WhenFilter) || undefined,
        page: targetPage,
        limit: LIMIT,
      });

      if (reset) setLoading(false);
      else setLoadingMore(false);

      if (res.error) {
        setError(res.error);
        return;
      }

      setPage(res.data.page);
      setHasMore(res.data.has_more);
      if (reset) {
        setResults(res.data.results);
      } else {
        setResults((prev) => [...prev, ...res.data.results]);
      }
    },
    [debouncedQ, type, when, category]
  );

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      runSearch(page + 1, false);
    }
  };

  const isFiltered = !!debouncedQ || type !== "all" || !!when || !!category;

  return (
    <View style={styles.container}>
      {/* Search input */}
      <View style={styles.searchRow}>
        <Feather name="search" size={16} color={T.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search gigs and events…"
          placeholderTextColor={T.textMuted}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable hitSlop={8} onPress={() => setQuery("")}>
            <Feather name="x" size={16} color={T.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Filter rows */}
      <View style={styles.filters}>
        {/* Type */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {TYPE_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.filterChip, type === opt.value && styles.filterChipOn]}
              onPress={() => setType(opt.value)}
            >
              <Text style={[styles.filterChipText, type === opt.value && styles.filterChipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* When */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {WHEN_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.filterChip, when === opt.value && styles.filterChipOn]}
              onPress={() => setWhen(opt.value)}
            >
              <Text style={[styles.filterChipText, when === opt.value && styles.filterChipTextOn]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Category (only when gigs or all) */}
        {type !== "events" && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
            <Pressable
              style={[styles.filterChip, category === "" && styles.filterChipOn]}
              onPress={() => setCategory("")}
            >
              <Text style={[styles.filterChipText, category === "" && styles.filterChipTextOn]}>
                All categories
              </Text>
            </Pressable>
            {GigCategories.filter((c) => c.value !== "other").map((cat) => (
              <Pressable
                key={cat.value}
                style={[styles.filterChip, category === cat.value && styles.filterChipOn]}
                onPress={() => setCategory(cat.value === category ? "" : cat.value)}
              >
                <Text style={[styles.filterChipText, category === cat.value && styles.filterChipTextOn]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Feather name="alert-circle" size={40} color={T.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.result_type}-${item.id}`}
          renderItem={({ item }) => <ResultCard item={item} />}
          contentContainerStyle={styles.resultsList}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={T.primary} />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              {isFiltered ? (
                <>
                  <Feather name="search" size={44} color={T.textMuted} />
                  <Text style={styles.emptyTitle}>No results found</Text>
                  <Text style={styles.emptySubtitle}>Try a different search or filters</Text>
                </>
              ) : (
                <>
                  <Feather name="compass" size={44} color={T.textMuted} />
                  <Text style={styles.emptyTitle}>Search for jobs & events</Text>
                  <Text style={styles.emptySubtitle}>Use the filters above to browse</Text>
                </>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Search bar
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: T.border,
    gap: 10,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: T.text,
    padding: 0,
  },

  // Filters
  filters: {
    gap: 0,
    marginTop: 10,
  },
  filterRow: {
    flexGrow: 0,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 8,
    flexDirection: "row",
    flexGrow: 1,
    justifyContent: "center",
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  filterChipOn: {
    backgroundColor: T.selBg,
    borderColor: T.selBorder,
  },
  filterChipText: {
    fontSize: 13,
    color: T.textSub,
    fontWeight: "500",
  },
  filterChipTextOn: {
    color: T.selText,
    fontWeight: "700",
  },

  // Results list
  resultsList: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  separator: {
    height: 1,
    backgroundColor: T.border,
  },

  // Result card
  card: {
    paddingVertical: 14,
    gap: 6,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  typeBadgeGig: {
    backgroundColor: T.selBg,
  },
  typeBadgeEvent: {
    backgroundColor: "#FEF3C7",
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  typeBadgeGigText: {
    color: T.selText,
  },
  typeBadgeEventText: {
    color: "#B45309",
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    color: T.textMuted,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: T.text,
    lineHeight: 20,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: T.textMuted,
  },

  // States
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: T.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: T.textMuted,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: T.error,
    textAlign: "center",
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
