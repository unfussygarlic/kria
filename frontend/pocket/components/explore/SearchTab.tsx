import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  searchJobs,
  SearchResultItem,
  SearchType,
  WhenFilter,
} from "@/lib/api/search";
import { GigCategories } from "@/constants/config";
import { T } from "@/constants/colors";
import { useSavedGigsStore } from "@/stores/savedGigsStore";
import { useGigStore } from "@/stores/gigStore";

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

const CAT_LABEL = new Map(GigCategories.map((c) => [c.value, c.label]));

// ── Filter Sheet ──────────────────────────────────────────────────────────

function FilterSheet({
  visible,
  type,
  when,
  category,
  onTypeChange,
  onWhenChange,
  onCategoryChange,
  onApply,
  onClear,
}: {
  visible: boolean;
  type: SearchType;
  when: WhenFilter | "";
  category: string;
  onTypeChange: (v: SearchType) => void;
  onWhenChange: (v: WhenFilter | "") => void;
  onCategoryChange: (v: string) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  // presentationStyle="pageSheet" is iOS-only; on Android the modal covers
  // the full screen including the status bar, so the header collides with
  // the notch/clock unless we add the top inset manually.
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onApply}>
      <View style={fs.sheet}>
        {/* Header */}
        <View style={[fs.header, { paddingTop: insets.top + 14 }]}>
          <Text style={fs.headerTitle}>Filters</Text>
          <Pressable onPress={onApply} style={fs.doneBtn}>
            <Text style={fs.doneBtnText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView style={fs.body} contentContainerStyle={[fs.bodyContent, { paddingBottom: 24 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {/* Type */}
          <Text style={fs.sectionLabel}>Type</Text>
          <View style={fs.chipRow}>
            {TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[fs.chip, type === opt.value && fs.chipOn]}
                onPress={() => onTypeChange(opt.value)}
              >
                <Text style={[fs.chipText, type === opt.value && fs.chipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* When */}
          <Text style={fs.sectionLabel}>When</Text>
          <View style={fs.chipRow}>
            {WHEN_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[fs.chip, when === opt.value && fs.chipOn]}
                onPress={() => onWhenChange(opt.value)}
              >
                <Text style={[fs.chipText, when === opt.value && fs.chipTextOn]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Category (only for gigs/all) */}
          {type !== "events" && (
            <>
              <Text style={fs.sectionLabel}>Category</Text>
              <View style={fs.chipRow}>
                <Pressable
                  style={[fs.chip, category === "" && fs.chipOn]}
                  onPress={() => onCategoryChange("")}
                >
                  <Text style={[fs.chipText, category === "" && fs.chipTextOn]}>
                    All
                  </Text>
                </Pressable>
                {GigCategories.filter((c) => c.value !== "other").map((cat) => (
                  <Pressable
                    key={cat.value}
                    style={[fs.chip, category === cat.value && fs.chipOn]}
                    onPress={() => onCategoryChange(cat.value === category ? "" : cat.value)}
                  >
                    <Text style={[fs.chipText, category === cat.value && fs.chipTextOn]}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[fs.footer, { paddingBottom: 16 + insets.bottom }]}>
          <Pressable style={fs.clearBtn} onPress={onClear}>
            <Text style={fs.clearBtnText}>Clear all</Text>
          </Pressable>
          <Pressable style={fs.applyBtn} onPress={onApply}>
            <Text style={fs.applyBtnText}>Apply filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const fs = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  doneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.selBg,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.selText,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: T.surface3,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipOn: {
    backgroundColor: T.selBg,
    borderColor: T.selBorder,
  },
  chipText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textSub,
  },
  chipTextOn: {
    color: T.selText,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textSub,
  },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: T.ctaBg,
    justifyContent: "center",
    alignItems: "center",
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.ctaText,
  },
});

// ── Search result card ────────────────────────────────────────────────────

function ResultCard({ item, applied, saved, onToggleSave }: {
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
          {/* Save/bookmark toggle — hitSlop keeps the tap target usable without
              enlarging the icon and crowding the row. */}
          {!isEvent && (
            <Pressable onPress={onToggleSave} hitSlop={12} style={styles.saveBtn}>
              <Feather
                name={saved ? "bookmark" : "bookmark"}
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
            <Text style={[styles.metaText, { color: T.primary, fontWeight: "600" }]}>
              {item.open_job_count} open job{item.open_job_count !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Sort options ─────────────────────────────────────────────────────────

type SortKey = "date_asc" | "date_desc" | "pay_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_asc",  label: "Soonest" },
  { value: "date_desc", label: "Newest" },
  { value: "pay_desc",  label: "Highest pay" },
];

function sortResults(items: SearchResultItem[], sortKey: SortKey): SearchResultItem[] {
  const copy = [...items];
  switch (sortKey) {
    case "date_desc":
      return copy.sort((a, b) => (b.event_date ?? "").localeCompare(a.event_date ?? ""));
    case "pay_desc":
      // Events lack pay_rate — push them to the end so gig sort makes sense.
      return copy.sort((a, b) => (b.pay_rate ?? -1) - (a.pay_rate ?? -1));
    case "date_asc":
    default:
      return copy.sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
  }
}

// ── Main SearchTab ────────────────────────────────────────────────────────

export function SearchTab() {
  const [query, setQuery]             = useState("");
  const [debouncedQ, setDebouncedQ]   = useState("");
  const [type, setType]               = useState<SearchType>("all");
  const [when, setWhen]               = useState<WhenFilter | "">("");
  const [category, setCategory]       = useState<string>("");
  const [sortKey, setSortKey]         = useState<SortKey>("date_asc");
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults]         = useState<SearchResultItem[]>([]);
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Client-side derived signals for the ResultCard
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
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 400);
    return () => clearTimeout(t);
  }, [query]);

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

  const activeFilterCount = [
    type !== "all",
    !!when,
    !!category,
  ].filter(Boolean).length;

  const isFiltered = !!debouncedQ || activeFilterCount > 0;

  const handleClearFilters = () => {
    setType("all");
    setWhen("");
    setCategory("");
  };

  return (
    <View style={styles.container}>
      {/* Search + Filter row */}
      <View style={styles.topRow}>
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

        {/* Filter button */}
        <Pressable style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]} onPress={() => setShowFilters(true)}>
          <Feather name="sliders" size={16} color={activeFilterCount > 0 ? T.selText : T.textSub} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Active filter pills (compact summary) */}
      {activeFilterCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activePillRow} contentContainerStyle={styles.activePillContent}>
          {type !== "all" && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{TYPE_OPTIONS.find(o => o.value === type)?.label}</Text>
            </View>
          )}
          {when && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{WHEN_OPTIONS.find(o => o.value === when)?.label}</Text>
            </View>
          )}
          {category && (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>{CAT_LABEL.get(category)}</Text>
            </View>
          )}
          <Pressable style={styles.clearPill} onPress={handleClearFilters}>
            <Feather name="x" size={11} color={T.textMuted} />
            <Text style={styles.clearPillText}>Clear</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Sort row — three-way segmented toggle above the list */}
      {results.length > 1 && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort:</Text>
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSortKey(opt.value)}
                style={[styles.sortChip, active && styles.sortChipActive]}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

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
          data={sortResults(results, sortKey)}
          keyExtractor={(item) => `${item.result_type}-${item.id}`}
          renderItem={({ item }) => (
            <ResultCard
              item={item}
              applied={appliedIds.has(item.id)}
              saved={savedIds.has(item.id)}
              onToggleSave={() => toggleSaved(item.id)}
            />
          )}
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
                  <Text style={styles.emptySubtitle}>Tap the filter icon to browse by category or date</Text>
                </>
              )}
            </View>
          }
        />
      )}

      <FilterSheet
        visible={showFilters}
        type={type}
        when={when}
        category={category}
        onTypeChange={setType}
        onWhenChange={setWhen}
        onCategoryChange={setCategory}
        onApply={() => setShowFilters(false)}
        onClear={handleClearFilters}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // Search + filter row
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 14,
    gap: 10,
  },
  searchRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface3,
    borderRadius: 12,
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
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
    padding: 0,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: T.surface3,
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: T.selBg,
    borderColor: T.selBorder,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: T.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textInverse,
  },

  // Active filter pills
  activePillRow: {
    flexGrow: 0,
    marginTop: 8,
  },
  activePillContent: {
    paddingHorizontal: 16,
    gap: 6,
    flexDirection: "row",
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: T.selBg + "40",
    borderWidth: 1,
    borderColor: T.primary + "55",
  },
  activePillText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.primary,
  },
  clearPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: T.surface3,
    borderWidth: 1,
    borderColor: T.border,
  },
  clearPillText: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
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
    gap: 8,
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
    backgroundColor: "rgba(212,255,0,0.10)",
    borderWidth: 1,
    borderColor: "rgba(212,255,0,0.30)",
  },
  appliedText: {
    fontSize: 10,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
    letterSpacing: 0.5,
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textMuted,
    letterSpacing: 0.8,
    marginRight: 2,
    textTransform: "uppercase",
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  sortChipActive: {
    backgroundColor: T.selBg,
    borderColor: T.selBorder,
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textSub,
  },
  sortChipTextActive: {
    color: T.selText,
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
    fontFamily: "SpaceGrotesk_700Bold",
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
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
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
    fontFamily: "SpaceGrotesk_400Regular",
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
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.error,
    textAlign: "center",
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: "center",
  },
});
