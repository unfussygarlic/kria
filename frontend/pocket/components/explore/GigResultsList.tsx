/**
 * GigResultsList — shared search-result list for gigs + events.
 *
 * Handles fetch, pagination, sorting, save/apply chips, empty/error states.
 * Owns nothing about UI chrome above it — the caller wraps it with a search
 * bar + optional filter/sort rows.
 *
 * Used by:
 *   • Home (inline results when the user starts typing)
 *   • /search (browse-all page with full filter sheet)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
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
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rf } from "@/constants/responsive";
import { useSavedGigsStore } from "@/stores/savedGigsStore";
import { useGigStore } from "@/stores/gigStore";

const LIMIT = 20;

export type SortKey = "date_asc" | "date_desc" | "pay_desc";

interface Props {
  /** Debounced search query. */
  query: string;
  /** Filter: gigs | events | all (defaults to all). */
  type?: SearchType;
  /** Filter: today | this_week | this_month | next_month | "" (any). */
  when?: WhenFilter | "";
  /** Category filter — gig category key or "". */
  category?: string;
  /** Client-side sort key (defaults to date_asc). */
  sortKey?: SortKey;
  /** Empty-state override — return a custom component when no results. */
  renderEmpty?: (isFiltered: boolean) => React.ReactNode;
  /** Extra bottom padding on the list. */
  bottomPadding?: number;
  /** Called with total-results count on every fetch. */
  onCountChange?: (count: number) => void;
  /**
   * Rendering mode:
   *   • "virtualized" (default) — FlatList with pagination + windowing.
   *     Use when this component owns its own scroll container (SearchTab).
   *   • "static" — plain View + map (no FlatList). Use when embedded
   *     inside a parent ScrollView (e.g. Home). Caps at `maxItems`; if
   *     more results exist, shows a "See all N results →" tail button
   *     that routes to /search with the query pre-filled.
   */
  mode?: "virtualized" | "static";
  /** Static mode only — max items to render inline. Default 15. */
  maxItems?: number;
}

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

// Widened key type — item.category is `string | null` from the API, not
// narrowed to the GigCategory union.
const CAT_LABEL = new Map<string, string>(GigCategories.map((c) => [c.value, c.label]));

function sortResults(items: SearchResultItem[], sortKey: SortKey): SearchResultItem[] {
  const copy = [...items];
  switch (sortKey) {
    case "date_desc":
      return copy.sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
    case "pay_desc":
      return copy.sort((a, b) => (b.pay_rate ?? -1) - (a.pay_rate ?? -1));
    case "date_asc":
    default:
      return copy.sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  }
}

// ── Result card ────────────────────────────────────────────────────────────

function ResultCard({
  item, applied, saved, onToggleSave,
}: {
  item: SearchResultItem;
  applied: boolean;
  saved: boolean;
  onToggleSave: () => void;
}) {
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
      <View style={styles.cardTopRow}>
        <View style={styles.cardTopLeft}>
          <View style={[styles.typeBadge, isEvent ? styles.typeBadgeEvent : styles.typeBadgeGig]}>
            <Text style={[styles.typeBadgeText, isEvent ? styles.typeBadgeEventText : styles.typeBadgeGigText]}>
              {isEvent ? "Event" : CAT_LABEL.get(item.category ?? "") ?? "Gig"}
            </Text>
          </View>
          {applied && (
            <View style={styles.appliedPill}>
              <Feather name="check" size={10} color={T.primary} />
              <Text style={styles.appliedText}>Applied</Text>
            </View>
          )}
        </View>
        <View style={styles.cardTopRight}>
          {item.event_date && (
            <View style={styles.dateChip}>
              <Feather name="calendar" size={11} color={T.textMuted} />
              <Text style={styles.dateText}>{fmtDate(item.event_date)}</Text>
            </View>
          )}
          {!isEvent && (
            <Pressable onPress={onToggleSave} hitSlop={12} style={styles.saveBtn}>
              <Feather
                name="bookmark"
                size={16}
                color={saved ? T.primary : T.textMuted}
                style={saved ? undefined : { opacity: 0.7 }}
              />
            </Pressable>
          )}
        </View>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

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
            <Text style={[styles.metaText, { color: T.primary, fontFamily: "Inter_600SemiBold", fontWeight: "600" }]}>
              {item.open_job_count} open job{item.open_job_count !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Main list ──────────────────────────────────────────────────────────────

export function GigResultsList({
  query,
  type = "all",
  when = "",
  category = "",
  sortKey = "date_asc",
  renderEmpty,
  bottomPadding = S.hero,
  onCountChange,
  mode = "virtualized",
  maxItems = 15,
}: Props) {
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedIds = useSavedGigsStore((s) => s.ids);
  const hydrateSaved = useSavedGigsStore((s) => s.hydrate);
  const toggleSaved = useSavedGigsStore((s) => s.toggle);
  const myApplications = useGigStore((s) => s.myApplications);
  const fetchMyApplications = useGigStore((s) => s.fetchMyApplications);
  const appliedIds = useMemo(
    () => new Set(myApplications.map((a) => a.gig.id)),
    [myApplications],
  );

  useEffect(() => {
    hydrateSaved();
    fetchMyApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runSearch = useCallback(
    async (targetPage: number, reset: boolean) => {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const res = await searchJobs({
        q: query || undefined,
        type,
        category: category || undefined,
        when: (when as WhenFilter) || undefined,
        page: targetPage,
        limit: LIMIT,
      });

      if (reset) setLoading(false);
      else setLoadingMore(false);

      if (res.error || !res.data) {
        setError(res.error ?? "Something went wrong");
        return;
      }

      setPage(res.data.page);
      setHasMore(res.data.has_more);
      if (reset) {
        setResults(res.data.results);
        onCountChange?.(res.data.results.length);
      } else {
        setResults((prev) => {
          const merged = [...prev, ...res.data.results];
          onCountChange?.(merged.length);
          return merged;
        });
      }
    },
    [query, type, when, category, onCountChange],
  );

  useEffect(() => {
    runSearch(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, type, when, category]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      runSearch(page + 1, false);
    }
  };

  const isFiltered = !!query || type !== "all" || !!when || !!category;
  const sortedResults = sortResults(results, sortKey);

  // ── Shared render helpers ──────────────────────────────────────────
  const renderCard = (item: SearchResultItem) => (
    <ResultCard
      key={`${item.result_type}-${item.id}`}
      item={item}
      applied={appliedIds.has(item.id)}
      saved={savedIds.has(item.id)}
      onToggleSave={() => toggleSaved(item.id)}
    />
  );

  const renderEmptyState = () => {
    if (renderEmpty) return <>{renderEmpty(isFiltered)}</>;
    return (
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
            <Text style={styles.emptySubtitle}>Start typing to find opportunities</Text>
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={40} color={T.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // ── STATIC MODE — plain View + map (embed inside a parent ScrollView).
  //    No windowing; capped at `maxItems` with a "See all →" tail if there's more.
  if (mode === "static") {
    if (sortedResults.length === 0) return renderEmptyState();
    const shown = sortedResults.slice(0, maxItems);
    const hasMoreThanCap = hasMore || sortedResults.length > maxItems;
    return (
      <View style={[styles.staticWrap, { paddingBottom: bottomPadding }]}>
        {shown.map((item, i) => (
          <View key={`${item.result_type}-${item.id}`}>
            {i > 0 && <View style={{ height: S.sm }} />}
            {renderCard(item)}
          </View>
        ))}
        {hasMoreThanCap && (
          <Pressable
            style={styles.seeAllTail}
            onPress={() => router.push({
              pathname: "/(main)/(tabs)/search",
              params: { q: query },
            } as any)}
          >
            <Text style={styles.seeAllText}>
              See all results with filters
            </Text>
            <Feather name="arrow-right" size={14} color={T.primary} />
          </Pressable>
        )}
      </View>
    );
  }

  // ── VIRTUALIZED MODE — FlatList with pagination. Use standalone only.
  return (
    <FlatList
      data={sortedResults}
      keyExtractor={(item) => `${item.result_type}-${item.id}`}
      renderItem={({ item }) => renderCard(item)}
      contentContainerStyle={[styles.list, { paddingBottom: bottomPadding }]}
      ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={T.primary} />
          </View>
        ) : null
      }
      ListEmptyComponent={renderEmptyState()}
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
  },
  // Static-mode wrapper — used when embedded in a parent ScrollView.
  staticWrap: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
  },
  seeAllTail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: S.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    backgroundColor: T.surface1,
    borderRadius: R.button,
    ...SHADOW.sm,
  },
  seeAllText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.primary,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: S.sm,
    padding: S.hero,
    paddingTop: 60,
  },
  emptyTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  emptySubtitle: {
    ...TYPE.body,
    color: T.textMuted,
    textAlign: "center",
  },
  errorText: {
    ...TYPE.body,
    color: T.error,
    textAlign: "center",
  },
  loadingMore: {
    paddingVertical: S.lg,
    alignItems: "center",
  },

  // Result card
  card: {
    padding: S.md,
    borderRadius: R.card,
    backgroundColor: T.surface1,
    gap: S.xs,
    ...SHADOW.card,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    justifyContent: "space-between",
  },
  cardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  cardTopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
  },
  saveBtn: {
    padding: 2,
  },
  appliedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: T.primary + "18",
  },
  appliedText: {
    ...TYPE.label,
    fontSize: rf(10),
    color: T.primary,
  },
  typeBadge: {
    paddingHorizontal: S.xs,
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
    ...TYPE.label,
    fontSize: rf(11),
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
    ...TYPE.caption,
    color: T.textMuted,
  },
  cardTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...TYPE.caption,
    color: T.textMuted,
  },
});
