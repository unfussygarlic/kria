/**
 * Home tab — proof-of-concept for the new visual language (2026-08-22).
 *
 * Design principles that replace the old obsidian-outline system:
 *
 *   1. **Cards lift with shadow, not lines.** SHADOW.card token gives every
 *      surface a soft warm shadow. Zero visible borders anywhere.
 *   2. **Solid fills, no translucency.** Every background is a solid
 *      palette color — no rgba(white, 0.72) overlays.
 *   3. **Consistent spacing scale.** Every gap/padding is from S.* — no
 *      ad-hoc numbers.
 *   4. **Semantic radius.** Cards use R.card, chips R.chip, hero R.hero.
 *   5. **Big display type for hero data.** Bold numbers dominate the
 *      earnings hero. Body text stays humble.
 *   6. **Gradient hero.** Pink→purple diagonal for the top block — a real
 *      moment, not a flat card.
 *   7. **Bottom-third thumb zone.** Primary CTAs positioned to reach.
 *
 * Layout (top → bottom):
 *   1. Greeting bar (compact)
 *   2. Earnings hero card (gradient, big number)
 *   3. Momentum + Streak stat pair (bento)
 *   4. Search bar (clean, no heavy outline)
 *   5. Category tiles (2×3 grid, solid colored icons on white cards)
 *   6. Hot gigs (horizontal scroll cards)
 *   7. Events (horizontal scroll cards)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView, View, Text, Pressable, StyleSheet, RefreshControl, TextInput,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { useAuthStore } from "@/stores/authStore";
import { useGigStore } from "@/stores/gigStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { useEarningsStore } from "@/stores/earningsStore";
import { T, CategoryColors } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { GigCategories } from "@/constants/config";
import { getBand } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";
import { searchJobs, type SearchResultItem } from "@/lib/api/search";
import { Skeleton } from "@/components/ui/Skeleton";
import { GigSearchBar } from "@/components/explore/GigSearchBar";
import { GigResultsList } from "@/components/explore/GigResultsList";
import type { Gig } from "@/types/database";
import type { HostSummary } from "@/lib/api/gigs";

// ── Config ────────────────────────────────────────────────────────────────────

const HOT_CATEGORIES = [
  "hospitality_staff", "promoter", "photographer",
  "event_helper",      "usher",    "front_desk",
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPay(amount: number | null, type: string | null): string {
  if (amount == null) return "";
  const base = `₹${amount.toLocaleString("en-IN")}`;
  if (type === "hourly") return `${base}/hr`;
  if (type === "daily")  return `${base}/day`;
  return base;
}
function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `In ${diff}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function greetForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function categoryLabel(cat: string): string {
  return GigCategories.find((c) => c.value === cat)?.label ?? cat;
}
function categoryIcon(cat: string): React.ComponentProps<typeof Feather>["name"] {
  return (GigCategories.find((c) => c.value === cat)?.icon ?? "briefcase") as React.ComponentProps<typeof Feather>["name"];
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const streak = profile?.streak_count ?? 0;

  const myMomentum = useMomentumStore((s) => s.myMomentum);
  const fetchMyMomentum = useMomentumStore((s) => s.fetchMyMomentum);
  const worker = myMomentum?.worker ?? null;

  const earningsSummary = useEarningsStore((s) => s.summary);
  const fetchEarnings = useEarningsStore((s) => s.fetchSummary);

  const matchedGigs = useGigStore((s) => s.gigs);
  const matchLoading = useGigStore((s) => s.isLoading);
  const fetchMatchedGigs = useGigStore((s) => s.fetchGigs);
  const hosts = useGigStore((s) => s.hosts);

  const [events, setEvents] = useState<SearchResultItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [locationLabel, setLocationLabel] = useState<string>("Nearby");
  const [refreshing, setRefreshing] = useState(false);

  // ── Inline search ─────────────────────────────────────────────────────
  // Typing swaps the feed (categories / hot gigs / events) for a live
  // results list. Focusing pans the search bar to the top of the
  // viewport so results are visible under the thumb.
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const scrollRef = useRef<ScrollView>(null);
  const searchBarY = useRef(0);
  const searchInputRef = useRef<TextInput>(null);
  const searchActive = debouncedQ.length > 0 || searchQ.length > 0;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(searchQ.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleSearchFocus = useCallback(() => {
    // Pan the search bar to the top of the visible area so the results
    // below it get maximum room.
    scrollRef.current?.scrollTo({ y: Math.max(0, searchBarY.current - S.sm), animated: true });
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQ("");
    setDebouncedQ("");
    searchInputRef.current?.blur();
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    const res = await searchJobs({ type: "events", limit: 6 });
    setEvents(res.data?.results ?? []);
    setEventsLoading(false);
  }, []);

  const loadLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getLastKnownPositionAsync();
      if (!pos) return;
      const [place] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
      });
      const label = place?.city ?? place?.district ?? place?.subregion ?? null;
      if (label) setLocationLabel(label);
    } catch { /* keep "Nearby" fallback */ }
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([
      fetchMatchedGigs(),
      fetchMyMomentum(),
      loadEvents(),
      fetchEarnings(),
    ]);
  }, [fetchMatchedGigs, fetchMyMomentum, loadEvents, fetchEarnings]);

  useEffect(() => {
    loadAll();
    loadLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const goSearch  = () => router.push("/(main)/(tabs)/search");
  const goExplore = () => router.push("/(main)/(tabs)/explore");
  const goGig     = (id: string) => router.push(`/(main)/gig/${id}`);

  const firstName = profile?.first_name ?? "there";
  const band = worker ? getBand(worker.score) : null;
  const weekEarnings = earningsSummary?.this_week ?? 0;
  const weekGigs = earningsSummary?.week_gig_count ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: S.section }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
        }
      >
        {/* ─── Greeting bar ───────────────────────────────────────────── */}
        <View style={styles.greetBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetHi}>{greetForHour()},</Text>
            <Text style={styles.greetName}>{firstName} 👋</Text>
          </View>
          <Pressable style={styles.locationPill} onPress={loadLocation}>
            <Feather name="map-pin" size={rw(11)} color={T.text} />
            <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
          </Pressable>
        </View>

        {/* ─── Earnings hero (gradient card) ──────────────────────────── */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={T.gradAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTopRow}>
              <Text style={styles.heroLabel}>THIS WEEK</Text>
              <View style={styles.heroWeekPill}>
                <Text style={styles.heroWeekPillText}>{weekGigs} gig{weekGigs === 1 ? "" : "s"}</Text>
              </View>
            </View>
            <Text style={styles.heroAmount}>
              ₹{weekEarnings.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.heroSub}>
              Keep going — payout on {earningsSummary?.next_payout_date
                ? formatDate(earningsSummary.next_payout_date)
                : "Monday"}
            </Text>
          </LinearGradient>
        </View>

        {/* ─── Momentum + Streak bento ────────────────────────────────── */}
        <View style={styles.bentoRow}>
          <Pressable style={styles.statCard} onPress={() => router.push("/(main)/(tabs)/arena")}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>MOMENTUM</Text>
              <Feather name="trending-up" size={rw(14)} color={T.textSub} />
            </View>
            <Text style={[styles.statValue, band ? { color: band.color } : null]}>
              {worker?.score ?? "—"}
            </Text>
            <View style={styles.bandRow}>
              {band && (
                <View style={[styles.bandDot, { backgroundColor: band.color }]} />
              )}
              <Text style={styles.statFoot}>{band?.label ?? "Loading…"}</Text>
            </View>
          </Pressable>

          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <Text style={styles.statLabel}>STREAK</Text>
              <Text style={{ fontSize: rf(18) }}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statFoot}>{streak === 1 ? "day" : "days"} in a row</Text>
          </View>
        </View>

        {/* ─── Search bar (inline live search) ─────────────────────── */}
        <View
          style={styles.searchBarWrap}
          onLayout={(e) => { searchBarY.current = e.nativeEvent.layout.y; }}
        >
          <GigSearchBar
            ref={searchInputRef}
            value={searchQ}
            onChangeText={setSearchQ}
            onFocus={handleSearchFocus}
            onClear={handleClearSearch}
          />
        </View>

        {searchActive ? (
          /* ─── Inline search results — replaces the feed while typing ─ */
          <View>
            {searchQ !== debouncedQ ? (
              <View style={styles.searchLoadingRow}>
                <Text style={styles.searchLoadingText}>Searching…</Text>
              </View>
            ) : null}
            {/* Static mode: no nested FlatList (would break windowing).
                Caps at 15 items; "See all" tail routes to /search with
                the query pre-filled. */}
            <GigResultsList
              query={debouncedQ}
              mode="static"
              maxItems={15}
              bottomPadding={S.md}
            />
          </View>
        ) : (
          <>
            {/* ─── Browse-all CTA ──────────────────────────────────── */}
            <Pressable style={styles.browseAllBtn} onPress={goSearch}>
              <View style={styles.browseAllIcon}>
                <Feather name="grid" size={rw(18)} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.browseAllTitle}>Browse all gigs & events</Text>
                <Text style={styles.browseAllSub}>Filter by type, date, category</Text>
              </View>
              <Feather name="arrow-right" size={rw(18)} color={T.textMuted} />
            </Pressable>

            {/* ─── Categories ──────────────────────────────────────── */}
            <SectionHeader title="Browse by role" />
            <View style={styles.catGrid}>
              {HOT_CATEGORIES.map((c) => (
                <Pressable key={c} onPress={goSearch} style={styles.catTile}>
                  <View style={[styles.catIconWrap, { backgroundColor: CategoryColors[c] ?? T.primary }]}>
                    <Feather name={categoryIcon(c)} size={rw(20)} color="#FFFFFF" />
                  </View>
                  <Text style={styles.catLabel} numberOfLines={2}>{categoryLabel(c)}</Text>
                </Pressable>
              ))}
            </View>

            {/* ─── Hot gigs ────────────────────────────────────────── */}
            <SectionHeader title="Hot gigs" emoji="🔥" onSeeAll={goExplore} />
            {matchLoading && matchedGigs.length === 0 ? (
              <HotGigsSkeleton />
            ) : matchedGigs.length === 0 ? (
              <EmptyRow message="No gigs match right now. Check back soon." />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hRow}
              >
                {matchedGigs.slice(0, 8).map((g) => (
                  <HotGigCard
                    key={g.id}
                    gig={g}
                    host={hosts[g.poster_id]}
                    onPress={() => goGig(g.id)}
                  />
                ))}
              </ScrollView>
            )}

            {/* ─── Events ──────────────────────────────────────────── */}
            <SectionHeader title="Events near you" onSeeAll={goSearch} />
            {eventsLoading ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} width={rw(260)} height={rw(140)} borderRadius={R.card} style={{ marginRight: S.sm }} />
                ))}
              </ScrollView>
            ) : events.length === 0 ? (
              <EmptyRow message="No events open right now." />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {events.slice(0, 5).map((e) => (
                  <EventCard key={e.id} event={e} onPress={goSearch} />
                ))}
              </ScrollView>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, emoji, onSeeAll }: { title: string; emoji?: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {emoji ? `${emoji}  ` : ""}{title}
      </Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAllText}>See all →</Text>
        </Pressable>
      )}
    </View>
  );
}

function HotGigCard({ gig, host, onPress }: { gig: Gig; host?: HostSummary; onPress: () => void }) {
  const catColor = CategoryColors[gig.category] ?? T.primary;
  return (
    <Pressable onPress={onPress} style={styles.hotCard}>
      <View style={styles.hotCardHeader}>
        <View style={[styles.hotCardCatDot, { backgroundColor: catColor }]} />
        <Text style={styles.hotCardCatText} numberOfLines={1}>{categoryLabel(gig.category)}</Text>
      </View>
      <Text style={styles.hotCardTitle} numberOfLines={2}>{gig.title}</Text>
      <View style={styles.hotCardPayRow}>
        <Text style={styles.hotCardPay}>{formatPay(gig.pay_amount, gig.pay_type)}</Text>
      </View>
      <View style={styles.hotCardFooter}>
        <View style={styles.hotCardFooterItem}>
          <Feather name="calendar" size={rw(11)} color={T.textSub} />
          <Text style={styles.hotCardFooterText}>{formatDate(gig.event_date)}</Text>
        </View>
        <View style={styles.hotCardFooterDot} />
        <View style={styles.hotCardFooterItem}>
          <Feather name="map-pin" size={rw(11)} color={T.textSub} />
          <Text style={styles.hotCardFooterText} numberOfLines={1}>{gig.city}</Text>
        </View>
      </View>
      {host && (
        <View style={styles.hotCardHost}>
          <View style={styles.hostAvatar}>
            <Text style={styles.hostAvatarText}>{host.display_name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <Text style={styles.hostName} numberOfLines={1}>{host.display_name}</Text>
          {host.is_verified && (
            <Feather name="check-circle" size={rw(11)} color={T.success} />
          )}
        </View>
      )}
    </Pressable>
  );
}

function EventCard({ event, onPress }: { event: SearchResultItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.eventCard}>
      <View style={styles.eventBadge}>
        <Feather name="calendar" size={rw(10)} color="#FFFFFF" />
        <Text style={styles.eventBadgeText}>EVENT</Text>
      </View>
      <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
      <View style={styles.eventMeta}>
        {event.event_date && <Text style={styles.eventMetaText}>{formatDate(event.event_date)}</Text>}
        {event.city && (
          <>
            <Text style={styles.eventMetaDot}>·</Text>
            <Text style={styles.eventMetaText} numberOfLines={1}>{event.city}</Text>
          </>
        )}
      </View>
      {event.open_job_count != null && event.open_job_count > 0 && (
        <View style={styles.eventJobsChip}>
          <Text style={styles.eventJobsText}>
            {event.open_job_count} open job{event.open_job_count === 1 ? "" : "s"}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function HotGigsSkeleton() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} width={rw(240)} height={rw(190)} borderRadius={R.card} style={{ marginRight: S.sm }} />
      ))}
    </ScrollView>
  );
}

function EmptyRow({ message }: { message: string }) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },

  // Greeting bar
  greetBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.md,
    gap: S.sm,
  },
  greetHi: {
    ...TYPE.body,
    color: T.textSub,
  },
  greetName: {
    ...TYPE.title1,
    color: T.text,
    marginTop: 2,
    textTransform: "capitalize",
  },
  locationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xxs + 2,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.chip,
    backgroundColor: T.surface1,
    maxWidth: rw(120),
    ...SHADOW.sm,
  },
  locationText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },

  // Earnings hero
  heroWrap: {
    marginHorizontal: S.lg,
    marginBottom: S.md,
    borderRadius: R.hero,
    ...SHADOW.lg,
  },
  hero: {
    borderRadius: R.hero,
    padding: S.xl,
    overflow: "hidden",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.sm,
  },
  heroLabel: {
    ...TYPE.label,
    color: "rgba(255,255,255,0.85)",
  },
  heroWeekPill: {
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  heroWeekPillText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroAmount: {
    ...TYPE.display,
    color: "#FFFFFF",
  },
  heroSub: {
    ...TYPE.body,
    marginTop: S.xs,
    color: "rgba(255,255,255,0.85)",
  },

  // Bento row
  bentoRow: {
    flexDirection: "row",
    paddingHorizontal: S.lg,
    gap: S.sm,
    marginBottom: S.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    ...SHADOW.card,
  },
  statTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.xs,
  },
  statLabel: {
    ...TYPE.label,
    color: T.textMuted,
  },
  statValue: {
    ...TYPE.title1,
    color: T.text,
    marginTop: S.xs,
  },
  bandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: S.xxs,
  },
  bandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statFoot: {
    ...TYPE.body,
    color: T.textSub,
  },

  // Search bar wrapper — GigSearchBar renders the actual input.
  searchBarWrap: {
    marginHorizontal: S.lg,
    marginBottom: S.md,
  },

  // Inline-search loading indicator (debounce gap)
  searchLoadingRow: {
    paddingHorizontal: S.lg,
    paddingVertical: S.xs,
  },
  searchLoadingText: {
    ...TYPE.caption,
    color: T.textMuted,
  },

  // Browse-all CTA — sits directly below the search bar in normal mode.
  browseAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginHorizontal: S.lg,
    marginBottom: S.sm,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    ...SHADOW.card,
  },
  browseAllIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: R.thumb,
    backgroundColor: T.primary + "18",
    justifyContent: "center",
    alignItems: "center",
  },
  browseAllTitle: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },
  browseAllSub: {
    ...TYPE.caption,
    color: T.textMuted,
    marginTop: 2,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.lg,
    marginTop: S.lg,
    marginBottom: S.sm,
  },
  sectionTitle: {
    ...TYPE.title2,
    color: T.text,
  },
  seeAllText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.primary,
  },

  // Category grid
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: S.lg,
    gap: S.sm,
    marginBottom: S.xs,
  },
  catTile: {
    // 3-per-row minus the two gaps
    width: `${(100 - 6) / 3}%`,
    aspectRatio: 1,
    padding: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    alignItems: "flex-start",
    justifyContent: "space-between",
    ...SHADOW.card,
  },
  catIconWrap: {
    width: rw(48),
    height: rw(48),
    borderRadius: R.thumb,
    justifyContent: "center",
    alignItems: "center",
  },
  catLabel: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    color: T.text,
    lineHeight: rf(18),
  },

  // Horizontal card row (used for hot gigs + events)
  hRow: {
    paddingHorizontal: S.lg,
    gap: S.sm,
    paddingBottom: S.xs,
    paddingTop: S.xxs,
  },

  // Hot gig card
  hotCard: {
    width: rw(240),
    padding: S.md,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    gap: S.xs,
    ...SHADOW.card,
  },
  hotCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xxs + 2,
  },
  hotCardCatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hotCardCatText: {
    ...TYPE.label,
    color: T.textSub,
    letterSpacing: 0.8,
  },
  hotCardTitle: {
    ...TYPE.title3,
    color: T.text,
    marginTop: S.xxs,
  },
  hotCardPayRow: {
    marginTop: S.xxs,
  },
  hotCardPay: {
    ...TYPE.money,
    color: T.primary,
  },
  hotCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    marginTop: S.xxs,
    flexWrap: "wrap",
  },
  hotCardFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hotCardFooterText: {
    ...TYPE.body,
    color: T.textSub,
  },
  hotCardFooterDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: T.textMuted,
  },
  hotCardHost: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xxs + 2,
    marginTop: S.xs,
    paddingTop: S.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: T.border,
  },
  hostAvatar: {
    width: rw(20),
    height: rw(20),
    borderRadius: R.avatar,
    backgroundColor: T.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  hostAvatarText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "800",
    color: T.textOnPrimary,
  },
  hostName: {
    ...TYPE.body,
    flex: 1,
    color: T.textSub,
  },

  // Event card
  eventCard: {
    width: rw(260),
    padding: S.md,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    gap: S.xs,
    ...SHADOW.card,
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    paddingHorizontal: S.xs,
    paddingVertical: 4,
    borderRadius: R.chip,
    backgroundColor: T.tertiary,
  },
  eventBadgeText: {
    ...TYPE.label,
    fontSize: rf(10),
    color: "#FFFFFF",
    letterSpacing: 0.9,
  },
  eventTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  eventMetaText: {
    ...TYPE.body,
    color: T.textSub,
  },
  eventMetaDot: {
    ...TYPE.body,
    color: T.textMuted,
  },
  eventJobsChip: {
    marginTop: S.xs,
    alignSelf: "flex-start",
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
    backgroundColor: T.surface2,
  },
  eventJobsText: {
    ...TYPE.label,
    color: T.text,
    letterSpacing: 0.8,
  },

  // Empty row
  emptyRow: {
    marginHorizontal: S.lg,
    padding: S.lg,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    alignItems: "center",
    ...SHADOW.sm,
  },
  emptyText: {
    ...TYPE.body,
    color: T.textMuted,
  },
});
