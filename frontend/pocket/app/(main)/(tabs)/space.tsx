/**
 * Shifts (was "My Space") — accepted shifts (Runner) + posted gigs/events (Host).
 *
 * 2026-08-24: renamed "My Space" → "Shifts", added "Saved" sub-tab.
 * Saved list is hydrated from `useSavedGigsStore` (SecureStore IDs) via
 * `getGig(id)` fan-out; toggling save on gig-detail flows through the same
 * store so the list stays in sync.
 *
 * Redesigned 2026-08-23 for the new visual system: SHADOW.card + no borders,
 * TYPE tokens, S/R spacing, solid surfaces (no glass/rgba), a "next shift"
 * gradient hero at the top of the Upcoming list, a pill sub-tab bar, and
 * polished bottom-sheet details.
 *
 * Preserved: OTP check-in flow, cancel flow, share flow, rating flow,
 * countdown pill, deep-link routing, Host tab structure.
 */

import { useEffect, useCallback, useRef, useState } from "react";
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
  Modal,
  Animated,
  ScrollView,
  Share,
} from "react-native";
import { Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { PressableScale } from "@/components/ui/PressableScale";
import { rf, rw } from "@/constants/responsive";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Gig, MyEventSummary } from "@/types/database";
import { T, CategoryColors } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { L } from "@/constants/labels";
import { JobCard, formatDate } from "@/components/gig/JobCard";
import { RatingModal } from "@/components/ui/RatingModal";
import { getMyAcceptedGigs, AcceptedGigItem, cancelAssignment } from "@/lib/api/gigs";
import { verifyOtp, finalizeExpiredAssignments } from "@/lib/api/ratings";
import { openDirections } from "@/lib/openMaps";
import { CountdownPill } from "@/components/space/CountdownPill";
import { useSavedGigsStore } from "@/stores/savedGigsStore";

// ── Poster tab items ──────────────────────────────────────────────────────────

type SpaceItem =
  | { kind: "gig"; data: Gig; created_at: string }
  | { kind: "event"; data: MyEventSummary; created_at: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusChip(
  item: AcceptedGigItem,
  isHistory = false,
): { label: string; color: string; bg: string } {
  if (!item.assignment_status || item.assignment_status === "assigned") {
    if (isHistory) return { label: "Past", color: T.textMuted, bg: T.surface2 };
    return { label: "Upcoming", color: T.selText, bg: T.selBg };
  }
  if (item.assignment_status === "completed") {
    return { label: "Done", color: T.success, bg: T.success + "22" };
  }
  if (item.assignment_status === "no_show") {
    return { label: "No-Show", color: T.error, bg: T.error + "22" };
  }
  return { label: item.assignment_status, color: T.textMuted, bg: T.surface2 };
}

function getTimeLabel(
  eventDate: string | null,
  shiftStart: string,
): { label: string; color: string } {
  if (!eventDate) return { label: "Date TBD", color: T.textMuted };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gig = new Date(eventDate);
  gig.setHours(0, 0, 0, 0);
  const diff = Math.round((gig.getTime() - today.getTime()) / 864e5);
  const t = shiftStart.slice(0, 5);
  if (diff === 0) return { label: `Today ${t}`, color: T.primary };
  if (diff === 1) return { label: `Tomorrow ${t}`, color: "#f59e0b" };
  if (diff > 1 && diff <= 6) return { label: `in ${diff} days`, color: T.textSub };
  return { label: formatDate(eventDate), color: T.textMuted };
}

function isUpcoming(item: AcceptedGigItem, now: Date): boolean {
  if (item.assignment_status === "completed" || item.assignment_status === "no_show") return false;
  if (!item.event_date) return true;
  const gigEnd = new Date(item.event_date);
  const [hh, mm] = (item.shift_end_time || "23:59").split(":");
  gigEnd.setHours(Number(hh ?? 23), Number(mm ?? 59), 0, 0);
  return gigEnd >= now;
}

function isWithin24h(item: AcceptedGigItem, now: Date): boolean {
  if (!item.event_date) return false;
  const start = new Date(item.event_date);
  const [hh, mm] = (item.shift_start_time || "09:00").split(":");
  start.setHours(Number(hh ?? 9), Number(mm ?? 0), 0, 0);
  const ms = start.getTime() - now.getTime();
  return ms >= 0 && ms <= 24 * 60 * 60 * 1000;
}

// ── Next-shift hero (top of Upcoming) ────────────────────────────────────────

function NextShiftHero({
  item,
  onPress,
}: {
  item: AcceptedGigItem;
  onPress: () => void;
}) {
  const dateStr = item.event_date
    ? new Date(item.event_date).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      })
    : "Date TBD";
  const canDirect = item.venue_lat != null && item.venue_lng != null;

  return (
    <View style={heroStyles.wrap}>
      <LinearGradient
        colors={T.gradAccent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={heroStyles.hero}
      >
        <View style={heroStyles.eyebrowRow}>
          <Text style={heroStyles.eyebrow}>NEXT SHIFT</Text>
          <CountdownPill
            eventDate={item.event_date}
            shiftStart={item.shift_start_time}
            shiftEnd={item.shift_end_time}
            compact
          />
        </View>

        <Text style={heroStyles.title} numberOfLines={2}>{item.title}</Text>

        <View style={heroStyles.metaRow}>
          <View style={heroStyles.metaItem}>
            <Feather name="calendar" size={rw(13)} color={T.onGradAccentSoft} />
            <Text style={heroStyles.metaText}>
              {dateStr} · {item.shift_start_time.slice(0, 5)}
            </Text>
          </View>
          <View style={heroStyles.metaItem}>
            <Feather name="map-pin" size={rw(13)} color={T.onGradAccentSoft} />
            <Text style={heroStyles.metaText} numberOfLines={1}>
              {item.venue_name}
            </Text>
          </View>
        </View>

        <View style={heroStyles.actionRow}>
          {canDirect && (
            <PressableScale
              style={heroStyles.primaryBtn}
              onPress={() =>
                openDirections(
                  { latitude: item.venue_lat!, longitude: item.venue_lng! },
                  item.venue_name,
                )
              }
            >
              <Feather name="navigation" size={rw(14)} color={T.onPrimary} />
              <Text style={heroStyles.primaryBtnText}>Directions</Text>
            </PressableScale>
          )}
          <PressableScale style={heroStyles.secondaryBtn} onPress={onPress}>
            <Text style={heroStyles.secondaryBtnText}>Details</Text>
            <Feather name="arrow-right" size={rw(14)} color={T.onGradAccent} />
          </PressableScale>
        </View>
      </LinearGradient>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: {
    borderRadius: R.hero,
    ...SHADOW.lg,
    marginBottom: S.md,
  },
  hero: {
    borderRadius: R.hero,
    padding: S.xl,
    gap: S.sm,
    overflow: "hidden",
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.sm,
  },
  eyebrow: {
    ...TYPE.label,
    color: T.onGradAccentSoft,
  },
  title: {
    ...TYPE.title1,
    color: T.onGradAccent,
    marginTop: S.xxs,
  },
  metaRow: {
    gap: S.xs,
    marginTop: S.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    ...TYPE.body,
    color: T.onGradAccentSoft,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: S.sm,
    marginTop: S.md,
  },
  // "Directions" primary button — inverse of the hero background. Uses the
  // page surface so contrast is guaranteed regardless of the gradient.
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: T.surface1,
    borderRadius: R.button,
    paddingVertical: S.sm,
  },
  primaryBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  // "Details" secondary — translucent overlay on the gradient. The 18%
  // alpha is picked from onGradAccent so the tint stays legible whether
  // the gradient reads dark (white 18%) or light (near-black 18%).
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: T.onGradAccent + "2E", // ~18% alpha overlay
    borderRadius: R.button,
    paddingVertical: S.sm,
  },
  secondaryBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.onGradAccent,
  },
});

// ── Compact upcoming card ─────────────────────────────────────────────────────

function UpcomingGigCard({
  item,
  onPress,
}: {
  item: AcceptedGigItem;
  onPress: () => void;
}) {
  const { label, color } = getTimeLabel(item.event_date, item.shift_start_time);
  const chip = getStatusChip(item);
  const catColor = (CategoryColors as Record<string, string>)[item.category] ?? T.textMuted;

  return (
    <PressableScale style={cardStyles.card} onPress={onPress}>
      <View style={[cardStyles.accent, { backgroundColor: catColor }]} />
      <View style={cardStyles.content}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={[cardStyles.timeLabel, { color }]}>{label}</Text>
        </View>
        <View style={cardStyles.bottomRow}>
          <Text style={cardStyles.sub} numberOfLines={1}>
            {item.company_name ?? item.city}
          </Text>
          <CountdownPill
            eventDate={item.event_date}
            shiftStart={item.shift_start_time}
            shiftEnd={item.shift_end_time}
            compact
          />
          <View style={[cardStyles.pill, { backgroundColor: chip.bg }]}>
            <Text style={[cardStyles.pillText, { color: chip.color }]}>{chip.label}</Text>
          </View>
        </View>
      </View>
      <Feather
        name="chevron-right"
        size={rw(16)}
        color={T.textMuted}
        style={{ alignSelf: "center", marginRight: S.sm }}
      />
    </PressableScale>
  );
}

// ── Compact history card ──────────────────────────────────────────────────────

function HistoryGigCard({
  item,
  onPress,
}: {
  item: AcceptedGigItem;
  onPress: () => void;
}) {
  const chip = getStatusChip(item, true);
  const catColor = (CategoryColors as Record<string, string>)[item.category] ?? T.textMuted;
  const dateLabel = item.event_date ? formatDate(item.event_date) : "—";
  const isCompleted = item.assignment_status === "completed";
  const isNoShow = item.assignment_status === "no_show";

  return (
    <PressableScale style={cardStyles.card} onPress={onPress}>
      <View style={[cardStyles.accent, { backgroundColor: catColor }]} />
      <View style={cardStyles.content}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.title} numberOfLines={1}>{item.title}</Text>
          {isCompleted && (
            <View style={cardStyles.completedDot}>
              <Feather name="check" size={9} color="#0e0e0e" />
            </View>
          )}
          {isNoShow && (
            <View style={cardStyles.noShowDot}>
              <Feather name="x" size={9} color="#fff" />
            </View>
          )}
          <Text style={cardStyles.historyDate}>{dateLabel}</Text>
        </View>
        <View style={cardStyles.bottomRow}>
          <Text style={cardStyles.sub}>
            ₹{item.pay_amount.toLocaleString("en-IN")} / {item.pay_type.replace("_", " ")}
          </Text>
          <View style={[cardStyles.pill, { backgroundColor: chip.bg }]}>
            <Text style={[cardStyles.pillText, { color: chip.color }]}>{chip.label}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: T.surface1,
    borderRadius: R.card,
    overflow: "hidden",
    minHeight: rw(72),
    ...SHADOW.card,
  },
  accent: {
    width: rw(4),
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    justifyContent: "center",
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
  },
  title: {
    flex: 1,
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  completedDot: {
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: T.success,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noShowDot: {
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: T.error,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  timeLabel: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    flexShrink: 0,
  },
  historyDate: {
    ...TYPE.caption,
    color: T.textMuted,
    flexShrink: 0,
  },
  sub: {
    flex: 1,
    ...TYPE.caption,
    color: T.textMuted,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: R.chip,
    flexShrink: 0,
  },
  pillText: {
    ...TYPE.label,
    fontSize: rf(10),
  },
});

// ── Gig detail bottom sheet ───────────────────────────────────────────────────

function GigDetailSheet({
  item,
  onClose,
  onOtpSuccess,
  onRateSuccess,
  onCancelSuccess,
}: {
  item: AcceptedGigItem | null;
  onClose: () => void;
  onOtpSuccess: (gigId: string) => void;
  onRateSuccess: (gigId: string) => void;
  onCancelSuccess: (assignmentId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [displayItem, setDisplayItem] = useState<AcceptedGigItem | null>(null);
  const [otpDigits, setOtpDigits] = useState(["", "", "", ""]);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const otpRef0 = useRef<TextInput>(null);
  const otpRef1 = useRef<TextInput>(null);
  const otpRef2 = useRef<TextInput>(null);
  const otpRef3 = useRef<TextInput>(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3];

  useEffect(() => {
    if (item) {
      setDisplayItem(item);
      setOtpDigits(["", "", "", ""]);
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else if (displayItem) {
      Animated.timing(slideAnim, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }).start(() => setDisplayItem(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const [celebrating, setCelebrating] = useState(false);
  const celebrateScale = useRef(new Animated.Value(0.3)).current;
  const celebrateHalo = useRef(new Animated.Value(0.4)).current;

  const handleShareGig = useCallback(async (gig: AcceptedGigItem) => {
    const url = `https://trykria.com/gig/${gig.gig_id}`;
    const dateStr = gig.event_date
      ? new Date(gig.event_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      : "";
    const msg = `${gig.title} on Kria — ₹${gig.pay_amount.toLocaleString("en-IN")} ${gig.pay_type} · ${gig.venue_name}${dateStr ? " · " + dateStr : ""}\n${url}`;
    try {
      await Share.share({ message: msg, url });
    } catch {
      // Cancelled — silent.
    }
  }, []);

  const handleCancelShift = useCallback((gig: AcceptedGigItem) => {
    if (!gig.assignment_id) return;
    Alert.alert(
      "Cancel this shift?",
      "Your slot will be freed up for another runner. No penalty for cancelling in advance — but it's better to cancel than to no-show.",
      [
        { text: "Keep shift", style: "cancel" },
        {
          text: "Cancel shift",
          style: "destructive",
          onPress: async () => {
            const result = await cancelAssignment(gig.assignment_id!);
            if (result.error) {
              Alert.alert("Couldn't cancel", result.error);
              return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onCancelSuccess(gig.assignment_id!);
            onClose();
          },
        },
      ],
    );
  }, [onClose, onCancelSuccess]);

  const handleVerifyOtp = async () => {
    if (!displayItem?.assignment_id) return;
    const otp = otpDigits.join("");
    if (otp.length < 4 || otpDigits.some((d) => d === "")) {
      Alert.alert("Enter OTP", "Please enter the 4-digit code from the poster.");
      return;
    }
    setOtpSubmitting(true);
    const result = await verifyOtp(displayItem.assignment_id, otp);
    setOtpSubmitting(false);
    if (result.error) {
      const isWrongCode = result.error.toLowerCase().includes("incorrect");
      Alert.alert(
        "Check-in Failed",
        isWrongCode
          ? "That code doesn't match. Double-check the 4-digit OTP shown on the Grid."
          : result.error,
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCelebrating(true);
    celebrateScale.setValue(0.3);
    celebrateHalo.setValue(0.4);
    Animated.parallel([
      Animated.spring(celebrateScale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }),
      Animated.timing(celebrateHalo, { toValue: 1.3, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      setCelebrating(false);
      onOtpSuccess(displayItem.gig_id);
      onClose();
    }, 1500);
  };

  const isGigExpired = (() => {
    if (!displayItem?.event_date) return false;
    const gigEnd = new Date(displayItem.event_date);
    const parts = (displayItem.shift_end_time || "23:59").split(":");
    gigEnd.setHours(Number(parts[0] ?? 23), Number(parts[1] ?? 59), 0, 0);
    return gigEnd < new Date();
  })();

  const isUpcomingItem = displayItem &&
    (!displayItem.assignment_status || displayItem.assignment_status === "assigned") &&
    !isGigExpired;
  const canOtp = isUpcomingItem;
  const canRate = displayItem?.assignment_status === "completed" && !displayItem.has_been_rated;
  const alreadyRated = displayItem?.assignment_status === "completed" && displayItem.has_been_rated;
  const isNoShow = displayItem?.assignment_status === "no_show";

  return (
    <>
      <Modal
        visible={!!displayItem}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable style={sheetStyles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            sheetStyles.sheet,
            { paddingBottom: insets.bottom + S.md, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {celebrating && (
            <View style={sheetStyles.celebrationOverlay}>
              <Animated.View
                style={[sheetStyles.celebrationHalo, { transform: [{ scale: celebrateHalo }] }]}
              />
              <Animated.View
                style={{
                  transform: [{ scale: celebrateScale }],
                  alignItems: "center",
                  gap: S.sm,
                }}
              >
                <View style={sheetStyles.celebrationIconRing}>
                  <Feather name="check" size={rw(46)} color="#FFFFFF" />
                </View>
                <Text style={sheetStyles.celebrationTitle}>You&apos;re checked in!</Text>
                <Text style={sheetStyles.celebrationSub}>Nice work. Now go crush the shift.</Text>
              </Animated.View>
            </View>
          )}

          <View style={sheetStyles.handle} />

          {displayItem && (
            <>
              <View style={sheetStyles.header}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={sheetStyles.gigTitle}>{displayItem.title}</Text>
                  {displayItem.company_name && (
                    <Text style={sheetStyles.gigCompany}>{displayItem.company_name}</Text>
                  )}
                </View>
                <Pressable style={sheetStyles.closeBtn} onPress={onClose}>
                  <Feather name="x" size={20} color={T.textMuted} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={sheetStyles.body}
                keyboardShouldPersistTaps="handled"
              >
                {/* Meta */}
                <View style={sheetStyles.metaSection}>
                  <Pressable
                    style={sheetStyles.metaRow}
                    onPress={() => {
                      if (displayItem.venue_lat != null && displayItem.venue_lng != null) {
                        Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${displayItem.venue_lat},${displayItem.venue_lng}`,
                        );
                      }
                    }}
                    disabled={displayItem.venue_lat == null}
                  >
                    <Feather
                      name="map-pin"
                      size={14}
                      color={displayItem.venue_lat != null ? T.primary : T.textMuted}
                    />
                    <Text
                      style={[
                        sheetStyles.metaText,
                        displayItem.venue_lat != null && sheetStyles.metaLink,
                      ]}
                    >
                      {displayItem.venue_name}, {displayItem.city}
                    </Text>
                    {displayItem.venue_lat != null && (
                      <Feather name="external-link" size={11} color={T.primary} />
                    )}
                  </Pressable>
                  <View style={sheetStyles.metaRow}>
                    <Feather name="calendar" size={14} color={T.textMuted} />
                    <Text style={sheetStyles.metaText}>
                      {displayItem.event_date ? formatDate(displayItem.event_date) : "Date TBD"}
                    </Text>
                  </View>
                  <View style={sheetStyles.metaRow}>
                    <Feather name="clock" size={14} color={T.textMuted} />
                    <Text style={sheetStyles.metaText}>
                      {displayItem.shift_start_time.slice(0, 5)} – {displayItem.shift_end_time.slice(0, 5)}
                    </Text>
                  </View>
                </View>

                {/* Pay + host row */}
                <View style={sheetStyles.payPosterRow}>
                  <View style={sheetStyles.posterChip}>
                    <View style={sheetStyles.posterAvatar}>
                      <Text style={sheetStyles.posterAvatarText}>
                        {(displayItem.poster.display_name[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>
                    <Text style={sheetStyles.posterName}>{displayItem.poster.display_name}</Text>
                    {displayItem.poster.reputation != null && (
                      <View style={sheetStyles.repChip}>
                        <Feather name="star" size={9} color="#f59e0b" />
                        <Text style={sheetStyles.repText}>
                          {displayItem.poster.reputation.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={sheetStyles.payAmount}>
                    ₹{displayItem.pay_amount.toLocaleString("en-IN")}
                    <Text style={sheetStyles.payType}> / {displayItem.pay_type.replace("_", " ")}</Text>
                  </Text>
                </View>

                {/* Countdown */}
                {isUpcomingItem && (
                  <View style={sheetStyles.countdownWrap}>
                    <CountdownPill
                      eventDate={displayItem.event_date}
                      shiftStart={displayItem.shift_start_time}
                      shiftEnd={displayItem.shift_end_time}
                    />
                  </View>
                )}

                {/* Directions / Share / Cancel */}
                {isUpcomingItem && (
                  <View style={sheetStyles.actionRow}>
                    {displayItem.venue_lat !== null && displayItem.venue_lng !== null && (
                      <PressableScale
                        style={sheetStyles.actionIconBtn}
                        onPress={() =>
                          openDirections(
                            { latitude: displayItem.venue_lat!, longitude: displayItem.venue_lng! },
                            displayItem.venue_name,
                          )
                        }
                      >
                        <Feather name="navigation" size={rw(15)} color={T.primary} />
                        <Text style={sheetStyles.actionIconLabel}>Directions</Text>
                      </PressableScale>
                    )}
                    <PressableScale
                      style={sheetStyles.actionIconBtn}
                      onPress={() => handleShareGig(displayItem)}
                    >
                      <Feather name="share-2" size={rw(15)} color={T.textSub} />
                      <Text style={[sheetStyles.actionIconLabel, { color: T.textSub }]}>Share</Text>
                    </PressableScale>
                    <PressableScale
                      style={sheetStyles.actionIconBtn}
                      onPress={() => handleCancelShift(displayItem)}
                    >
                      <Feather name="x-circle" size={rw(15)} color={T.error} />
                      <Text style={[sheetStyles.actionIconLabel, { color: T.error }]}>Cancel</Text>
                    </PressableScale>
                  </View>
                )}

                {/* View gig */}
                {isUpcomingItem && (
                  <PressableScale
                    style={sheetStyles.viewGigBtn}
                    onPress={() => { onClose(); router.push(`/(main)/gig/${displayItem!.gig_id}`); }}
                  >
                    <Feather name="external-link" size={rw(14)} color={T.textSub} />
                    <Text style={sheetStyles.viewGigBtnText}>View Gig</Text>
                  </PressableScale>
                )}

                {/* OTP */}
                {canOtp && (
                  <View style={sheetStyles.actionZone}>
                    <View style={sheetStyles.actionLabelRow}>
                      <Feather name="key" size={13} color={T.textSub} />
                      <Text style={sheetStyles.actionLabel}>Check-in OTP</Text>
                    </View>
                    <View style={sheetStyles.otpBoxRow}>
                      {otpDigits.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={otpRefs[i]}
                          style={[sheetStyles.otpBox, digit !== "" && sheetStyles.otpBoxFilled]}
                          value={digit}
                          onChangeText={(t) => {
                            const d = t.replace(/\D/g, "").slice(-1);
                            const next = [...otpDigits];
                            next[i] = d;
                            setOtpDigits(next);
                            if (d && i < 3) otpRefs[i + 1]?.current?.focus();
                          }}
                          onKeyPress={(e) => {
                            if (e.nativeEvent.key === "Backspace" && digit === "" && i > 0) {
                              const next = [...otpDigits];
                              next[i - 1] = "";
                              setOtpDigits(next);
                              otpRefs[i - 1]?.current?.focus();
                            }
                          }}
                          keyboardType="number-pad"
                          maxLength={1}
                          selectTextOnFocus
                          caretHidden
                          textContentType="oneTimeCode"
                        />
                      ))}
                    </View>
                    <PressableScale
                      style={[sheetStyles.confirmBtn, otpSubmitting && { opacity: 0.6 }]}
                      onPress={handleVerifyOtp}
                      disabled={otpSubmitting}
                    >
                      {otpSubmitting ? (
                        <ActivityIndicator size="small" color={T.ctaText} />
                      ) : (
                        <Text style={sheetStyles.confirmText}>Confirm</Text>
                      )}
                    </PressableScale>
                  </View>
                )}

                {canRate && (
                  <PressableScale style={sheetStyles.rateBtn} onPress={() => setRatingOpen(true)}>
                    <Feather name="star" size={14} color={T.ctaText} />
                    <Text style={sheetStyles.rateBtnText}>Rate Host</Text>
                  </PressableScale>
                )}

                {alreadyRated && (
                  <View style={sheetStyles.stateRow}>
                    <Feather name="check-circle" size={14} color={T.success} />
                    <Text style={[sheetStyles.stateText, { color: T.success }]}>You rated this host</Text>
                  </View>
                )}

                {isNoShow && (
                  <View style={sheetStyles.stateRow}>
                    <Feather name="alert-circle" size={14} color={T.error} />
                    <Text style={[sheetStyles.stateText, { color: T.error }]}>Marked as no-show</Text>
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </Animated.View>
      </Modal>

      {displayItem && ratingOpen && (
        <RatingModal
          visible={ratingOpen}
          onClose={() => setRatingOpen(false)}
          gigId={displayItem.gig_id}
          rateeId={displayItem.poster.id}
          ratingType="poster_rating"
          rateeName={displayItem.poster.display_name}
          onSuccess={() => {
            onRateSuccess(displayItem.gig_id);
            setRatingOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.surface1,
    borderTopLeftRadius: R.hero,
    borderTopRightRadius: R.hero,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  celebrationHalo: {
    position: "absolute",
    width: rw(260),
    height: rw(260),
    borderRadius: rw(130),
    backgroundColor: T.primary + "22",
  },
  celebrationIconRing: {
    width: rw(92),
    height: rw(92),
    borderRadius: rw(46),
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  celebrationTitle: {
    ...TYPE.title2,
    color: T.text,
    marginTop: S.xs,
  },
  celebrationSub: {
    ...TYPE.body,
    color: T.textSub,
    textAlign: "center",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface1,
    borderTopLeftRadius: R.hero,
    borderTopRightRadius: R.hero,
    paddingHorizontal: S.xl,
    paddingTop: S.sm,
    maxHeight: "85%",
    ...SHADOW.xl,
  },
  handle: {
    width: rw(36),
    height: 4,
    backgroundColor: T.surface2,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: S.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
    marginBottom: S.lg,
  },
  gigTitle: {
    ...TYPE.title2,
    color: T.text,
  },
  gigCompany: {
    ...TYPE.body,
    color: T.textSub,
  },
  closeBtn: {
    padding: 4,
    marginTop: 2,
  },
  body: {
    gap: S.lg,
    paddingBottom: S.xs,
  },
  metaSection: {
    gap: S.sm,
    backgroundColor: T.surface2,
    borderRadius: R.card,
    padding: S.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
  },
  metaText: {
    flex: 1,
    ...TYPE.body,
    color: T.textSub,
  },
  metaLink: {
    color: T.primary,
    textDecorationLine: "underline",
  },
  payPosterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  posterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  posterAvatar: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
  },
  posterAvatarText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.avatarText,
  },
  posterName: {
    ...TYPE.body,
    color: T.textSub,
  },
  repChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#f59e0b22",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  repText: {
    ...TYPE.label,
    fontSize: rf(10),
    color: "#f59e0b",
  },
  payAmount: {
    ...TYPE.title2,
    color: T.text,
  },
  payType: {
    ...TYPE.body,
    color: T.textMuted,
  },
  actionZone: {
    backgroundColor: T.surface2,
    borderRadius: R.card,
    padding: S.md,
    gap: S.sm,
  },
  actionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionLabel: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.textSub,
  },
  otpBoxRow: {
    flexDirection: "row",
    gap: S.xs,
  },
  otpBox: {
    flex: 1,
    height: rw(58),
    backgroundColor: T.surface1,
    borderRadius: R.input,
    fontSize: rf(26),
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: T.text,
    textAlign: "center",
    ...SHADOW.sm,
  },
  otpBoxFilled: {
    backgroundColor: T.primary + "18",
  },
  confirmBtn: {
    height: rw(48),
    backgroundColor: T.ctaBg,
    borderRadius: R.button,
    justifyContent: "center",
    alignItems: "center",
  },
  viewGigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: S.sm,
    borderRadius: R.button,
    backgroundColor: T.surface2,
  },
  countdownWrap: {
    alignItems: "flex-start",
    marginBottom: S.xxs,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "stretch",
    gap: S.xs,
  },
  actionIconBtn: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: S.sm,
    paddingHorizontal: S.xs,
    borderRadius: R.button,
    backgroundColor: T.surface2,
  },
  actionIconLabel: {
    ...TYPE.label,
    fontSize: rf(11),
    color: T.primary,
  },
  viewGigBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.textSub,
  },
  confirmText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.ctaText,
  },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs,
    backgroundColor: T.ctaBg,
    borderRadius: R.button,
    paddingVertical: S.md,
  },
  rateBtnText: {
    ...TYPE.title3,
    color: T.ctaText,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: S.sm,
  },
  stateText: {
    ...TYPE.body,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },
});

// ── Saved gig card ───────────────────────────────────────────────────────────
// Compact card for the Saved sub-tab. Tap → gig detail. Bookmark toggle
// removes from the saved list via the SecureStore-backed store.

function SavedGigCard({
  gig,
  onPress,
  onUnsave,
}: {
  gig: Gig;
  onPress: () => void;
  onUnsave: () => void;
}) {
  const catColor = (CategoryColors as Record<string, string>)[gig.category] ?? T.textMuted;
  const dateLabel = gig.event_date ? formatDate(gig.event_date) : "Date TBD";

  return (
    <PressableScale style={cardStyles.card} onPress={onPress}>
      <View style={[cardStyles.accent, { backgroundColor: catColor }]} />
      <View style={cardStyles.content}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.title} numberOfLines={1}>{gig.title}</Text>
          <Text style={cardStyles.historyDate}>{dateLabel}</Text>
        </View>
        <View style={cardStyles.bottomRow}>
          <Text style={cardStyles.sub} numberOfLines={1}>
            ₹{gig.pay_amount.toLocaleString("en-IN")} / {gig.pay_type.replace("_", " ")}
            {gig.venue_name ? ` · ${gig.venue_name}` : ""}
          </Text>
        </View>
      </View>
      <Pressable onPress={onUnsave} hitSlop={12} style={savedStyles.unsaveBtn}>
        <Feather name="bookmark" size={rw(18)} color={T.primary} />
      </Pressable>
    </PressableScale>
  );
}

const savedStyles = StyleSheet.create({
  unsaveBtn: {
    alignSelf: "center",
    marginRight: S.sm,
    padding: 4,
  },
});

// ── Runner tab ────────────────────────────────────────────────────────────────

type SubTab = "upcoming" | "saved" | "history";

function RunnerTab() {
  const [items, setItems] = useState<AcceptedGigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("upcoming");
  const [selectedGig, setSelectedGig] = useState<AcceptedGigItem | null>(null);

  // ── Saved gigs ─────────────────────────────────────────────────────────
  // IDs live in SecureStore via useSavedGigsStore; we hydrate the full Gig
  // objects lazily on tab focus so we don't fan-out fetch on mount.
  const savedIds = useSavedGigsStore((s) => s.ids);
  const hydrateSaved = useSavedGigsStore((s) => s.hydrate);
  const toggleSaved = useSavedGigsStore((s) => s.toggle);
  const getGig = useGigStore((s) => s.getGig);
  const [savedGigs, setSavedGigs] = useState<Gig[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);

  const loadSaved = useCallback(async () => {
    const ids = Array.from(savedIds);
    if (ids.length === 0) {
      setSavedGigs([]);
      return;
    }
    setSavedLoading(true);
    const results = await Promise.all(ids.map((id) => getGig(id)));
    // Drop null (deleted/expired) so the list only shows valid gigs.
    setSavedGigs(results.filter((g): g is Gig => g !== null));
    setSavedLoading(false);
  }, [savedIds, getGig]);

  useEffect(() => {
    hydrateSaved().then(loadSaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSubTab === "saved") loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, savedIds.size]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await finalizeExpiredAssignments();
    const result = await getMyAcceptedGigs();
    if (isRefresh) setRefreshing(false);
    else setLoading(false);
    if (!result.error && result.data) setItems(result.data.items);
  }, []);

  useEffect(() => { load(); }, []);

  const now = new Date();

  const upcoming = items
    .filter((i) => isUpcoming(i, now))
    .sort((a, b) => {
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    });

  const history = items
    .filter((i) => !isUpcoming(i, now))
    .sort((a, b) => {
      if (!a.event_date) return 1;
      if (!b.event_date) return -1;
      return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    });

  const displayItems = activeSubTab === "upcoming" ? upcoming : history;

  // Only surface the top card as a "next shift" hero when it's within 24h
  // AND we're on the Upcoming tab. Otherwise the hero eats space for no
  // added urgency.
  const firstUpcoming = upcoming[0];
  const heroItem =
    activeSubTab === "upcoming" && firstUpcoming && isWithin24h(firstUpcoming, now)
      ? firstUpcoming
      : null;
  const listItems = heroItem ? displayItems.slice(1) : displayItems;

  const savedCount = savedIds.size;

  return (
    <>
      <View style={styles.subTabBar}>
        <Pressable
          style={[styles.subTab, activeSubTab === "upcoming" && styles.subTabActive]}
          onPress={() => setActiveSubTab("upcoming")}
        >
          <Text style={[styles.subTabText, activeSubTab === "upcoming" && styles.subTabTextActive]}>
            Upcoming{upcoming.length > 0 ? ` (${upcoming.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subTab, activeSubTab === "saved" && styles.subTabActive]}
          onPress={() => setActiveSubTab("saved")}
        >
          <Text style={[styles.subTabText, activeSubTab === "saved" && styles.subTabTextActive]}>
            Saved{savedCount > 0 ? ` (${savedCount})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.subTab, activeSubTab === "history" && styles.subTabActive]}
          onPress={() => setActiveSubTab("history")}
        >
          <Text style={[styles.subTabText, activeSubTab === "history" && styles.subTabTextActive]}>
            History{history.length > 0 ? ` (${history.length})` : ""}
          </Text>
        </Pressable>
      </View>

      {activeSubTab === "saved" ? (
        <FlatList
          style={{ flex: 1 }}
          data={savedGigs}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <SavedGigCard
              gig={item}
              onPress={() => router.push(`/(main)/gig/${item.id}`)}
              onUnsave={() => {
                toggleSaved(item.id);
                setSavedGigs((prev) => prev.filter((g) => g.id !== item.id));
              }}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={savedLoading} onRefresh={loadSaved} tintColor={T.primary} />
          }
          ListEmptyComponent={
            savedLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={T.primary} />
              </View>
            ) : (
              <View style={styles.center}>
                <Feather name="bookmark" size={rw(40)} color={T.textMuted} />
                <Text style={styles.emptyTitle}>No saved gigs yet</Text>
                <Text style={styles.emptySubtitle}>
                  Tap the bookmark on any gig to save it for later. It won&apos;t apply — just pins it here so you can come back.
                </Text>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={listItems}
          keyExtractor={(item) => item.gig_id}
          renderItem={({ item }) =>
            activeSubTab === "upcoming" ? (
              <UpcomingGigCard item={item} onPress={() => setSelectedGig(item)} />
            ) : (
              <HistoryGigCard item={item} onPress={() => setSelectedGig(item)} />
            )
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            heroItem ? (
              <NextShiftHero
                item={heroItem}
                onPress={() => setSelectedGig(heroItem)}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={T.primary} />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={T.primary} />
              </View>
            ) : heroItem ? null : (
              <View style={styles.center}>
                <Feather
                  name={activeSubTab === "upcoming" ? "calendar" : "clock"}
                  size={rw(40)}
                  color={T.textMuted}
                />
                <Text style={styles.emptyTitle}>
                  {activeSubTab === "upcoming" ? "Nothing on the calendar" : "No track record yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeSubTab === "upcoming"
                    ? "Once a host accepts you, your next shift lands here. Swipe on Explore to find one."
                    : "Every gig you complete builds your Momentum and shows up here — your permanent track record."}
                </Text>
              </View>
            )
          }
          ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
        />
      )}

      <GigDetailSheet
        item={selectedGig}
        onClose={() => setSelectedGig(null)}
        onOtpSuccess={(gigId) => {
          setItems((prev) =>
            prev.map((i) => i.gig_id === gigId ? { ...i, assignment_status: "completed" } : i),
          );
        }}
        onRateSuccess={(gigId) => {
          setItems((prev) =>
            prev.map((i) => i.gig_id === gigId ? { ...i, has_been_rated: true } : i),
          );
        }}
        onCancelSuccess={(assignmentId) => {
          setItems((prev) => prev.filter((i) => i.assignment_id !== assignmentId));
        }}
      />
    </>
  );
}

// ── Event card (Host tab) ─────────────────────────────────────────────────────

function EventCard({ event, onPress }: { event: MyEventSummary; onPress: () => void }) {
  const statusColor =
    event.status === "open" ? T.success :
    event.status === "completed" ? T.textMuted : T.error;

  return (
    <PressableScale style={styles.eventCard} onPress={onPress}>
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
    </PressableScale>
  );
}

// ── Host tab ──────────────────────────────────────────────────────────────────

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
  }, [fetchMyPostedGigs, fetchMyPostedEvents]);

  useEffect(() => { loadAll(); }, [loadAll]);

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
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadAll} />}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={T.primary} />
          </View>
        ) : (
          <View style={styles.center}>
            <Feather name="layers" size={rw(40)} color={T.textMuted} />
            <Text style={styles.emptyTitle}>Nothing posted yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the + to post a gig or create an event.
            </Text>
          </View>
        )
      }
      ItemSeparatorComponent={() => <View style={{ height: S.sm }} />}
    />
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

const SHOW_HOST_ROLE = false;

export default function SpaceScreen() {
  const insets = useSafeAreaInsets();
  const activeRole = useAuthStore((s) => s.activeRole);
  const isHost = SHOW_HOST_ROLE && activeRole === "host";

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
        <Text style={styles.headerEyebrow}>{isHost ? L.HOST : L.RUNNER} · SHIFTS</Text>
        <Text style={styles.headerTitle}>Your work</Text>
      </View>

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
    paddingHorizontal: S.lg,
    paddingBottom: S.xs,
    gap: 2,
  },
  headerEyebrow: {
    ...TYPE.label,
    color: T.textMuted,
  },
  headerTitle: {
    ...TYPE.title1,
    color: T.text,
    marginTop: 2,
  },

  // Sub-tabs
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: S.sm,
    gap: S.xs,
  },
  subTab: {
    paddingHorizontal: S.md,
    paddingVertical: 8,
    borderRadius: R.chip,
    backgroundColor: T.surface1,
    ...SHADOW.sm,
  },
  subTabActive: {
    backgroundColor: T.selBg,
  },
  subTabText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.textMuted,
  },
  subTabTextActive: {
    color: T.selText,
  },

  // List
  list: {
    paddingHorizontal: S.lg,
    paddingTop: S.xs,
    paddingBottom: rw(100),
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: S.hero,
    gap: S.md,
    minHeight: 300,
  },
  emptyTitle: {
    ...TYPE.title2,
    color: T.text,
  },
  emptySubtitle: {
    ...TYPE.body,
    color: T.textSub,
    textAlign: "center",
  },

  // Event card (Host tab)
  eventCard: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    gap: S.sm,
    ...SHADOW.card,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
  },
  eventIconWrap: {
    width: rw(40),
    height: rw(40),
    borderRadius: R.thumb,
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
  },
  eventTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  eventMeta: {
    ...TYPE.body,
    color: T.textSub,
  },
  eventStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.xs,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.xs,
    paddingVertical: 4,
    backgroundColor: T.surface2,
    borderRadius: 8,
  },
  statText: {
    ...TYPE.caption,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
    color: T.textSub,
  },
  statusBadge: {
    paddingHorizontal: S.xs,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
