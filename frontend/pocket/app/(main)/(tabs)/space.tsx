import { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { rf, rw } from "@/constants/responsive";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Gig, MyEventSummary } from "@/types/database";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { JobCard, formatDate } from "@/components/gig/JobCard";
import { RatingModal } from "@/components/ui/RatingModal";
import { getMyAcceptedGigs, AcceptedGigItem } from "@/lib/api/gigs";
import { verifyOtp } from "@/lib/api/ratings";

// ── Tab types (kept for compatibility) ───────────────────────────────────────

// ── Poster tab items ──────────────────────────────────────────────────────────

type SpaceItem =
  | { kind: "gig"; data: Gig; created_at: string }
  | { kind: "event"; data: MyEventSummary; created_at: string };

// ── Runner tab ────────────────────────────────────────────────────────────────

function RunnerTab() {
  const [items, setItems] = useState<AcceptedGigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<AcceptedGigItem | null>(null);
  // OTP entry state: gigId → entered OTP text
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  // Which card has its OTP input expanded
  const [otpExpanded, setOtpExpanded] = useState<string | null>(null);
  const [otpSubmitting, setOtpSubmitting] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const result = await getMyAcceptedGigs();
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
    if (!result.error) {
      setItems(result.data.items);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const handleVerifyOtp = async (item: AcceptedGigItem) => {
    if (!item.assignment_id) return;
    const otp = (otpInputs[item.gig_id] ?? "").trim();
    if (otp.length < 4) {
      Alert.alert("Enter OTP", "Please enter the 4-digit code from the poster.");
      return;
    }
    setOtpSubmitting(item.gig_id);
    const result = await verifyOtp(item.assignment_id, otp);
    setOtpSubmitting(null);
    if (result.error) {
      Alert.alert("Invalid OTP", "The code is incorrect. Please check with the host and try again.");
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.gig_id === item.gig_id ? { ...i, assignment_status: "completed" } : i
        )
      );
      setOtpExpanded(null);
      setOtpInputs((prev) => { const n = { ...prev }; delete n[item.gig_id]; return n; });
    }
  };

  const getStatusChip = (item: AcceptedGigItem) => {
    if (!item.assignment_status || item.assignment_status === "assigned") {
      return { label: "Upcoming", color: T.selText, bg: T.selBg };
    }
    if (item.assignment_status === "completed") {
      return { label: "Done", color: T.success, bg: T.success + "25" };
    }
    if (item.assignment_status === "no_show") {
      return { label: "No-Show", color: T.error, bg: T.error + "25" };
    }
    return { label: item.assignment_status, color: T.textMuted, bg: T.border };
  };

  const renderItem = ({ item }: { item: AcceptedGigItem }) => {
    const chip = getStatusChip(item);
    const canRate =
      item.assignment_status === "completed" && !item.has_been_rated;

    return (
      <View style={styles.runnerCard}>
        {/* Header row */}
        <View style={styles.runnerHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.runnerTitle} numberOfLines={1}>{item.title}</Text>
            {item.company_name && (
              <Text style={styles.runnerSub} numberOfLines={1}>{item.company_name}</Text>
            )}
          </View>
          <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.statusChipText, { color: chip.color }]}>{chip.label}</Text>
          </View>
        </View>

        {/* Meta */}
        <View style={styles.runnerMeta}>
          <Pressable
            style={styles.metaItem}
            onPress={() => {
              if (item.venue_lat != null && item.venue_lng != null) {
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${item.venue_lat},${item.venue_lng}`
                );
              }
            }}
            disabled={item.venue_lat == null}
          >
            <Feather name="map-pin" size={12} color={item.venue_lat != null ? T.primary : T.textMuted} />
            <Text style={[styles.metaText, item.venue_lat != null && styles.metaLink]}>
              {item.venue_name}, {item.city}
            </Text>
          </Pressable>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={12} color={T.textMuted} />
            <Text style={styles.metaText}>{formatDate(item.event_date)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="clock" size={12} color={T.textMuted} />
            <Text style={styles.metaText}>
              {item.shift_start_time.slice(0, 5)} – {item.shift_end_time.slice(0, 5)}
            </Text>
          </View>
        </View>

        {/* Poster + pay */}
        <View style={styles.runnerFooter}>
          <View style={styles.posterRow}>
            <View style={styles.posterAvatar}>
              <Text style={styles.posterAvatarText}>
                {item.poster.display_name[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.posterName}>{item.poster.display_name}</Text>
            {item.poster.reputation != null && (
              <View style={styles.repChip}>
                <Feather name="star" size={9} color="#f59e0b" />
                <Text style={styles.repText}>{item.poster.reputation.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.pay}>
            ₹{item.pay_amount.toLocaleString("en-IN")}
            <Text style={styles.payType}> / {item.pay_type.replace("_", " ")}</Text>
          </Text>
        </View>

        {/* OTP entry — upcoming assignments */}
        {(!item.assignment_status || item.assignment_status === "assigned") && (
          otpExpanded === item.gig_id ? (
            <View style={styles.otpEntry}>
              <TextInput
                style={styles.otpInput}
                placeholder="4-digit code"
                placeholderTextColor={T.textMuted}
                value={otpInputs[item.gig_id] ?? ""}
                onChangeText={(t) =>
                  setOtpInputs((prev) => ({ ...prev, [item.gig_id]: t.replace(/\D/g, "") }))
                }
                keyboardType="number-pad"
                maxLength={4}
                autoFocus
              />
              <Pressable
                style={[styles.otpConfirmBtn, otpSubmitting === item.gig_id && { opacity: 0.6 }]}
                onPress={() => handleVerifyOtp(item)}
                disabled={otpSubmitting === item.gig_id}
              >
                {otpSubmitting === item.gig_id ? (
                  <ActivityIndicator size="small" color={T.ctaText} />
                ) : (
                  <Text style={styles.otpConfirmText}>Confirm</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setOtpExpanded(null)} style={styles.otpCancelBtn}>
                <Feather name="x" size={16} color={T.textMuted} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.enterOtpBtn} onPress={() => setOtpExpanded(item.gig_id)}>
              <Feather name="key" size={14} color={T.ctaText} />
              <Text style={styles.enterOtpText}>Enter OTP</Text>
            </Pressable>
          )
        )}

        {/* Rate poster button */}
        {canRate && (
          <Pressable
            style={styles.rateBtn}
            onPress={() => setRatingTarget(item)}
          >
            <Feather name="star" size={14} color={T.ctaText} />
            <Text style={styles.rateBtnText}>Rate Host</Text>
          </Pressable>
        )}
        {item.assignment_status === "completed" && item.has_been_rated && (
          <View style={styles.ratedRow}>
            <Feather name="check-circle" size={13} color={T.success} />
            <Text style={styles.ratedText}>You rated this host</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item) => item.gig_id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.primary} />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={T.primary} />
            </View>
          ) : (
            <View style={styles.center}>
              <Feather name="briefcase" size={48} color={T.primary} />
              <Text style={styles.emptyTitle}>No accepted gigs</Text>
              <Text style={styles.emptySubtitle}>
                Gigs you've been accepted for will appear here.
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {ratingTarget && (
        <RatingModal
          visible={!!ratingTarget}
          onClose={() => setRatingTarget(null)}
          gigId={ratingTarget.gig_id}
          rateeId={ratingTarget.poster.id}
          ratingType="poster_rating"
          rateeName={ratingTarget.poster.display_name}
          onSuccess={() => {
            setItems((prev) =>
              prev.map((i) =>
                i.gig_id === ratingTarget.gig_id
                  ? { ...i, has_been_rated: true }
                  : i
              )
            );
            setRatingTarget(null);
          }}
        />
      )}
    </>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event, onPress }: { event: MyEventSummary; onPress: () => void }) {
  const statusColor =
    event.status === "open" ? T.success :
    event.status === "completed" ? T.textMuted : T.error;

  return (
    <Pressable style={styles.eventCard} onPress={onPress}>
      <View style={styles.eventHeader}>
        <View style={styles.eventIconWrap}>
          <Feather name="calendar" size={20} color={T.avatarText} />
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

// ── Host tab ────────────────────────────────────────────────────────────────

function HostTab() {
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
    <FlatList
      data={items}
      keyExtractor={(item) => `${item.kind}-${item.data.id}`}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadAll} />
      }
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={T.primary} />
          </View>
        ) : (
          <View style={styles.center}>
            <Feather name="layers" size={48} color={T.primary} />
            <Text style={styles.emptyTitle}>Nothing posted yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + to post a gig or create an event.
            </Text>
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
    />
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

// Set to true when the Host mobile experience is re-enabled.
const SHOW_HOST_ROLE = false;

export default function SpaceScreen() {
  const insets = useSafeAreaInsets();
  const activeRole = useAuthStore((s) => s.activeRole);
  const isHost = SHOW_HOST_ROLE && activeRole === "host";

  return (
    <View style={styles.screen}>
      {/* Header — role label, no tab switcher */}
      <LinearGradient colors={T.gradDark} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.roleRow}>
          <Feather
            name={isHost ? "layers" : "briefcase"}
            size={rw(14)}
            color={T.textMuted}
          />
          <Text style={styles.roleLabel}>
            {isHost ? L.HOST : L.RUNNER}
          </Text>
        </View>
      </LinearGradient>

      {/* Role-pinned content */}
      {isHost ? <HostTab /> : <RunnerTab />}
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
    paddingHorizontal: rw(20),
    paddingBottom: rw(16),
    justifyContent: "flex-end",
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  roleLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // List
  list: {
    paddingHorizontal: rw(16),
    paddingTop: rw(12),
    paddingBottom: rw(100),
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: rw(40),
    gap: rw(16),
    minHeight: 300,
  },
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

  // Runner card
  runnerCard: {
    backgroundColor: T.surface,
    borderRadius: rw(14),
    padding: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    gap: rw(10),
  },
  runnerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rw(10),
  },
  runnerTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  runnerSub: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  statusChip: {
    paddingHorizontal: rw(8),
    paddingVertical: rw(3),
    borderRadius: rw(6),
  },
  statusChipText: {
    fontSize: rf(11),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  runnerMeta: {
    gap: rw(5),
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
  },
  metaText: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  metaLink: {
    color: T.primary,
    textDecorationLine: "underline",
  },
  runnerFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  posterAvatar: {
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
  },
  posterAvatarText: {
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.avatarText,
  },
  posterName: {
    fontSize: rf(12),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textSub,
  },
  repChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(2),
    backgroundColor: "#f59e0b22",
    borderRadius: rw(4),
    paddingHorizontal: rw(5),
    paddingVertical: rw(2),
  },
  repText: {
    fontSize: rf(10),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#f59e0b",
  },
  pay: {
    fontSize: rf(14),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  payType: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  // OTP entry
  enterOtpBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    alignSelf: "flex-start",
    paddingHorizontal: rw(12),
    paddingVertical: rw(8),
    backgroundColor: T.ctaBg,
    borderRadius: rw(8),
    borderWidth: 1,
    borderColor: T.ctaBg,
  },
  enterOtpText: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.ctaText,
  },
  otpEntry: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  otpInput: {
    flex: 1,
    height: rw(40),
    backgroundColor: T.bg,
    borderRadius: rw(8),
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: rw(12),
    fontSize: rf(18),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    letterSpacing: 4,
  },
  otpConfirmBtn: {
    height: rw(40),
    paddingHorizontal: rw(14),
    backgroundColor: T.ctaBg,
    borderRadius: rw(8),
    justifyContent: "center",
    alignItems: "center",
  },
  otpConfirmText: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.ctaText,
  },
  otpCancelBtn: {
    padding: rw(6),
  },

  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rw(6),
    backgroundColor: T.accent,
    borderRadius: rw(8),
    paddingVertical: rw(9),
  },
  rateBtnText: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.ctaText,
  },
  ratedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
  },
  ratedText: {
    fontSize: rf(12),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.success,
  },

  // Event card (Poster tab)
  eventCard: {
    backgroundColor: T.surface,
    borderRadius: rw(14),
    padding: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    gap: rw(12),
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
  },
  eventIconWrap: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(10),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
  },
  eventTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  eventMeta: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  eventStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(8),
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(8),
    paddingVertical: rw(4),
    backgroundColor: T.bg,
    borderRadius: rw(8),
  },
  statText: {
    fontSize: rf(12),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textSub,
  },
  statusBadge: {
    paddingHorizontal: rw(8),
    paddingVertical: rw(4),
    borderRadius: rw(8),
  },
  statusText: {
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
