/**
 * SearchTab — the "Browse all gigs & events" body. Reachable from Home's
 * browse-all card and from Explore's header pill.
 *
 * 2026-08-24 refactor: uses the shared `GigSearchBar` + `GigResultsList`
 * components so Home's inline search and this browse-all page use IDENTICAL
 * search UX. This screen adds the full filter sheet + sort segment on top.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  SearchType,
  WhenFilter,
} from "@/lib/api/search";
import { GigCategories } from "@/constants/config";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import { GigSearchBar } from "./GigSearchBar";
import { GigResultsList, type SortKey } from "./GigResultsList";

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

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "date_asc",  label: "Soonest" },
  { value: "date_desc", label: "Newest" },
  { value: "pay_desc",  label: "Highest pay" },
];

const CAT_LABEL = new Map<string, string>(GigCategories.map((c) => [c.value, c.label]));

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
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onApply}>
      <View style={fs.sheet}>
        <View style={[fs.header, { paddingTop: insets.top + S.md }]}>
          <Text style={fs.headerTitle}>Filters</Text>
          <Pressable onPress={onApply} style={fs.doneBtn}>
            <Text style={fs.doneBtnText}>Done</Text>
          </Pressable>
        </View>

        <ScrollView
          style={fs.body}
          contentContainerStyle={[fs.bodyContent, { paddingBottom: S.xl + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
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

        <View style={[fs.footer, { paddingBottom: S.md + insets.bottom }]}>
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

// ── Main SearchTab ────────────────────────────────────────────────────────

interface SearchTabProps {
  /** Pre-fill the query — used when routed from Home's "See all" tail. */
  initialQuery?: string;
}

export function SearchTab({ initialQuery = "" }: SearchTabProps = {}) {
  const [query, setQuery]             = useState(initialQuery);
  const [debouncedQ, setDebouncedQ]   = useState(initialQuery);
  const [type, setType]               = useState<SearchType>("all");
  const [when, setWhen]               = useState<WhenFilter | "">("");
  const [category, setCategory]       = useState<string>("");
  const [sortKey, setSortKey]         = useState<SortKey>("date_asc");
  const [showFilters, setShowFilters] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const activeFilterCount = useMemo(() => [
    type !== "all",
    !!when,
    !!category,
  ].filter(Boolean).length, [type, when, category]);

  const handleClearFilters = useCallback(() => {
    setType("all");
    setWhen("");
    setCategory("");
  }, []);

  return (
    <View style={styles.container}>
      {/* Search + filter row (shared GigSearchBar) */}
      <View style={styles.searchWrap}>
        <GigSearchBar
          value={query}
          onChangeText={setQuery}
          showFilter
          onFilterPress={() => setShowFilters(true)}
          filterBadgeCount={activeFilterCount}
        />
      </View>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activePillRow}
          contentContainerStyle={styles.activePillContent}
        >
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

      {/* Sort row */}
      {resultCount > 1 && (
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>SORT</Text>
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

      {/* Shared results list — same code path as Home */}
      <GigResultsList
        query={debouncedQ}
        type={type}
        when={when}
        category={category}
        sortKey={sortKey}
        onCountChange={setResultCount}
      />

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
  searchWrap: {
    paddingHorizontal: S.lg,
    marginTop: S.sm,
  },

  // Active filter pills
  activePillRow: {
    flexGrow: 0,
    marginTop: S.xs,
  },
  activePillContent: {
    paddingHorizontal: S.lg,
    gap: 6,
    flexDirection: "row",
  },
  activePill: {
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.chip,
    backgroundColor: T.selBg + "40",
  },
  activePillText: {
    ...TYPE.caption,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: T.primary,
  },
  clearPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.chip,
    backgroundColor: T.surface2,
  },
  clearPillText: {
    ...TYPE.caption,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: T.textMuted,
  },

  // Sort row
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.xs,
  },
  sortLabel: {
    ...TYPE.label,
    color: T.textMuted,
    marginRight: 2,
  },
  sortChip: {
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
    backgroundColor: T.surface1,
    ...SHADOW.sm,
  },
  sortChipActive: {
    backgroundColor: T.selBg,
  },
  sortChipText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.textSub,
  },
  sortChipTextActive: {
    color: T.selText,
  },
});

// ── Filter-sheet styles ───────────────────────────────────────────────────

const fs = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    paddingBottom: S.md,
  },
  headerTitle: {
    ...TYPE.title2,
    color: T.text,
  },
  doneBtn: {
    paddingHorizontal: S.md,
    paddingVertical: 6,
    borderRadius: R.chip,
    backgroundColor: T.selBg,
  },
  doneBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.selText,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: S.lg,
    paddingTop: S.md,
    paddingBottom: S.xl,
  },
  sectionLabel: {
    ...TYPE.label,
    color: T.textMuted,
    marginTop: S.md,
    marginBottom: S.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.xs,
  },
  chip: {
    paddingHorizontal: S.md,
    paddingVertical: 8,
    borderRadius: R.chip,
    backgroundColor: T.surface1,
    ...SHADOW.sm,
  },
  chipOn: {
    backgroundColor: T.selBg,
  },
  chipText: {
    ...TYPE.body,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: T.textSub,
  },
  chipTextOn: {
    color: T.selText,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: S.sm,
    paddingHorizontal: S.lg,
    paddingTop: S.md,
  },
  clearBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: R.button,
    backgroundColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  clearBtnText: {
    ...TYPE.body,
    color: T.textSub,
  },
  applyBtn: {
    flex: 2,
    height: rw(48),
    borderRadius: R.button,
    backgroundColor: T.ctaBg,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  applyBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.ctaText,
  },
});
