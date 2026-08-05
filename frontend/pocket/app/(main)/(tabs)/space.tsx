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
import { L } from "@/constants/labels";
import { JobCard, formatDate } from "@/components/gig/JobCard";
import { RatingModal } from "@/components/ui/RatingModal";
import { getMyAcceptedGigs, AcceptedGigItem } from "@/lib/api/gigs";
import { verifyOtp, finalizeExpiredAssignments } from "@/lib/api/ratings";

// ── Poster tab items ──────────────────────────────────────────────────────────

type SpaceItem =
  | { kind: "gig"; data: Gig; created_at: string }
  | { kind: "event"; data: MyEventSummary; created_at: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStatusChip(item: AcceptedGigItem, isHistory = false): { label: string; color: string; bg: string } {
  if (!item.assignment_status || item.assignment_status === "assigned") {
    if (isHistory) return { label: "Past", color: T.textMuted, bg: T.border };
    return { label: "Upcoming", color: T.selText, bg: T.selBg };
  }
  if (item.assignment_status === "completed") {
    return { label: "Done", color: T.success, bg: T.success + "25" };
  }
  if (item.assignment_status === "no_show") {
    return { label: "No-Show", color: T.error, bg: T.error + "25" };
  }
  return { label: item.assignment_status, color: T.textMuted, bg: T.border };
}

function getTimeLabel(
  eventDate: string | null,
  shiftStart: string
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

// ── Compact upcoming card ─────────────────────────────────────────────────────

function UpcomingGigCard({ item, onPress }: { item: AcceptedGigItem; onPress: () => void }) {
  const { label, color } = getTimeLabel(item.event_date, item.shift_start_time);
  const chip = getStatusChip(item);
  const catColor = (CategoryColors as Record<string, string>)[item.category] ?? T.textMuted;

  return (
    <PressableScale style={gcStyles.card} onPress={onPress}>
      <View style={[gcStyles.accent, { backgroundColor: catColor }]} />
      <View style={gcStyles.content}>
        <View style={gcStyles.topRow}>
          <Text style={gcStyles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={[gcStyles.timeLabel, { color }]}>{label}</Text>
        </View>
        <View style={gcStyles.bottomRow}>
          <Text style={gcStyles.sub} numberOfLines={1}>
            {item.company_name ?? item.city}
          </Text>
          <View style={[gcStyles.pill, { backgroundColor: chip.bg }]}>
            <Text style={[gcStyles.pillText, { color: chip.color }]}>{chip.label}</Text>
          </View>
        </View>
      </View>
      <Feather name="chevron-right" size={rw(16)} color={T.border} style={{ alignSelf: "center", marginRight: rw(12) }} />
    </PressableScale>
  );
}

// ── Compact history card ──────────────────────────────────────────────────────

function HistoryGigCard({ item, onPress }: { item: AcceptedGigItem; onPress: () => void }) {
  const chip = getStatusChip(item, true);
  const catColor = (CategoryColors as Record<string, string>)[item.category] ?? T.textMuted;
  const dateLabel = item.event_date ? formatDate(item.event_date) : "—";
  const isCompleted = item.assignment_status === "completed";
  const isNoShow = item.assignment_status === "no_show";

  return (
    <PressableScale style={gcStyles.card} onPress={onPress}>
      <View style={[gcStyles.accent, { backgroundColor: catColor }]} />
      <View style={gcStyles.content}>
        <View style={gcStyles.topRow}>
          <Text style={gcStyles.title} numberOfLines={1}>{item.title}</Text>
          {isCompleted && (
            <View style={gcStyles.completedDot}>
              <Feather name="check" size={9} color="#0e0e0e" />
            </View>
          )}
          {isNoShow && (
            <View style={gcStyles.noShowDot}>
              <Feather name="x" size={9} color="#fff" />
            </View>
          )}
          <Text style={gcStyles.historyDate}>{dateLabel}</Text>
        </View>
        <View style={gcStyles.bottomRow}>
          <Text style={gcStyles.sub}>
            ₹{item.pay_amount.toLocaleString("en-IN")} / {item.pay_type.replace("_", " ")}
          </Text>
          <View style={[gcStyles.pill, { backgroundColor: chip.bg }]}>
            <Text style={[gcStyles.pillText, { color: chip.color }]}>{chip.label}</Text>
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const gcStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: T.surface,
    borderRadius: rw(12),
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    minHeight: rw(68),
  },
  historyCard: {
    opacity: 0.85,
  },
  accent: {
    width: rw(4),
    alignSelf: "stretch",
  },
  content: {
    flex: 1,
    paddingVertical: rw(12),
    paddingHorizontal: rw(12),
    justifyContent: "center",
    gap: rw(5),
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  title: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  historyTitle: {
    color: T.textSub,
  },
  completedDot: {
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: T.primary,
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
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    flexShrink: 0,
  },
  historyDate: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
    flexShrink: 0,
  },
  sub: {
    flex: 1,
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  pill: {
    paddingHorizontal: rw(7),
    paddingVertical: rw(2),
    borderRadius: rw(6),
    flexShrink: 0,
  },
  pillText: {
    fontSize: rf(10),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});

// ── Gig detail bottom sheet ───────────────────────────────────────────────────

function GigDetailSheet({
  item,
  onClose,
  onOtpSuccess,
  onRateSuccess,
}: {
  item: AcceptedGigItem | null;
  onClose: () => void;
  onOtpSuccess: (gigId: string) => void;
  onRateSuccess: (gigId: string) => void;
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
  }, [item]);

  const [celebrating, setCelebrating] = useState(false);
  const celebrateScale = useRef(new Animated.Value(0.3)).current;
  const celebrateHalo = useRef(new Animated.Value(0.4)).current;

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

    // Success — celebrate for ~1.5s before firing the rating flow.
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
        <Pressable style={shStyles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            shStyles.sheet,
            { paddingBottom: insets.bottom + rw(16), transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Post-OTP celebration — covers sheet content for ~1.5s */}
          {celebrating && (
            <View style={shStyles.celebrationOverlay}>
              <Animated.View
                style={[shStyles.celebrationHalo, { transform: [{ scale: celebrateHalo }] }]}
              />
              <Animated.View style={{ transform: [{ scale: celebrateScale }], alignItems: "center", gap: rw(10) }}>
                <View style={shStyles.celebrationIconRing}>
                  <Feather name="check" size={rw(46)} color="#0e0e0e" />
                </View>
                <Text style={shStyles.celebrationTitle}>You're checked in!</Text>
                <Text style={shStyles.celebrationSub}>Nice work. Now go crush the shift.</Text>
              </Animated.View>
            </View>
          )}

          <View style={shStyles.handle} />

          {displayItem && (
            <>
              {/* Header */}
              <View style={shStyles.header}>
                <View style={{ flex: 1, gap: rw(2) }}>
                  <Text style={shStyles.gigTitle}>{displayItem.title}</Text>
                  {displayItem.company_name && (
                    <Text style={shStyles.gigCompany}>{displayItem.company_name}</Text>
                  )}
                </View>
                <Pressable style={shStyles.closeBtn} onPress={onClose}>
                  <Feather name="x" size={20} color={T.textMuted} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={shStyles.body}
                keyboardShouldPersistTaps="handled"
              >
                {/* Meta details */}
                <View style={shStyles.metaSection}>
                  <Pressable
                    style={shStyles.metaRow}
                    onPress={() => {
                      if (displayItem.venue_lat != null && displayItem.venue_lng != null) {
                        Linking.openURL(
                          `https://www.google.com/maps/search/?api=1&query=${displayItem.venue_lat},${displayItem.venue_lng}`
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
                        shStyles.metaText,
                        displayItem.venue_lat != null && shStyles.metaLink,
                      ]}
                    >
                      {displayItem.venue_name}, {displayItem.city}
                    </Text>
                    {displayItem.venue_lat != null && (
                      <Feather name="external-link" size={11} color={T.primary} />
                    )}
                  </Pressable>
                  <View style={shStyles.metaRow}>
                    <Feather name="calendar" size={14} color={T.textMuted} />
                    <Text style={shStyles.metaText}>
                      {displayItem.event_date ? formatDate(displayItem.event_date) : "Date TBD"}
                    </Text>
                  </View>
                  <View style={shStyles.metaRow}>
                    <Feather name="clock" size={14} color={T.textMuted} />
                    <Text style={shStyles.metaText}>
                      {displayItem.shift_start_time.slice(0, 5)} – {displayItem.shift_end_time.slice(0, 5)}
                    </Text>
                  </View>
                </View>

                {/* Pay + poster row */}
                <View style={shStyles.payPosterRow}>
                  <View style={shStyles.posterChip}>
                    <View style={shStyles.posterAvatar}>
                      <Text style={shStyles.posterAvatarText}>
                        {(displayItem.poster.display_name[0] ?? "?").toUpperCase()}
                      </Text>
                    </View>
                    <Text style={shStyles.posterName}>{displayItem.poster.display_name}</Text>
                    {displayItem.poster.reputation != null && (
                      <View style={shStyles.repChip}>
                        <Feather name="star" size={9} color="#f59e0b" />
                        <Text style={shStyles.repText}>
                          {displayItem.poster.reputation.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={shStyles.payAmount}>
                    ₹{displayItem.pay_amount.toLocaleString("en-IN")}
                    <Text style={shStyles.payType}> / {displayItem.pay_type.replace("_", " ")}</Text>
                  </Text>
                </View>

                {/* View Gig — upcoming only */}
                {isUpcomingItem && (
                  <PressableScale
                    style={shStyles.viewGigBtn}
                    onPress={() => { onClose(); router.push(`/(main)/gig/${displayItem!.gig_id}`); }}
                  >
                    <Feather name="external-link" size={rw(14)} color={T.textSub} />
                    <Text style={shStyles.viewGigBtnText}>View Gig</Text>
                  </PressableScale>
                )}

                {/* OTP check-in — upcoming only */}
                {canOtp && (
                  <View style={shStyles.actionZone}>
                    <View style={shStyles.actionLabelRow}>
                      <Feather name="key" size={13} color={T.textSub} />
                      <Text style={shStyles.actionLabel}>Check-in OTP</Text>
                    </View>
                    <View style={shStyles.otpBoxRow}>
                      {otpDigits.map((digit, i) => (
                        <TextInput
                          key={i}
                          ref={otpRefs[i]}
                          style={[shStyles.otpBox, digit !== "" && shStyles.otpBoxFilled]}
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
                      style={[shStyles.confirmBtn, otpSubmitting && { opacity: 0.6 }]}
                      onPress={handleVerifyOtp}
                      disabled={otpSubmitting}
                    >
                      {otpSubmitting ? (
                        <ActivityIndicator size="small" color={T.ctaText} />
                      ) : (
                        <Text style={shStyles.confirmText}>Confirm</Text>
                      )}
                    </PressableScale>
                  </View>
                )}

                {canRate && (
                  <PressableScale style={shStyles.rateBtn} onPress={() => setRatingOpen(true)}>
                    <Feather name="star" size={14} color={T.ctaText} />
                    <Text style={shStyles.rateBtnText}>Rate Host</Text>
                  </PressableScale>
                )}

                {alreadyRated && (
                  <View style={shStyles.stateRow}>
                    <Feather name="check-circle" size={14} color={T.success} />
                    <Text style={[shStyles.stateText, { color: T.success }]}>You rated this host</Text>
                  </View>
                )}

                {isNoShow && (
                  <View style={shStyles.stateRow}>
                    <Feather name="alert-circle" size={14} color={T.error} />
                    <Text style={[shStyles.stateText, { color: T.error }]}>Marked as no-show</Text>
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

const shStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: T.surface2,
    borderTopLeftRadius: rw(28),
    borderTopRightRadius: rw(28),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  celebrationHalo: {
    position: "absolute",
    width: rw(260),
    height: rw(260),
    borderRadius: rw(130),
    backgroundColor: "rgba(212,255,0,0.16)",
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
    fontSize: rf(22),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    marginTop: rw(6),
  },
  celebrationSub: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    textAlign: "center",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface2,
    borderTopLeftRadius: rw(28),
    borderTopRightRadius: rw(28),
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: T.borderStrong,
    paddingHorizontal: rw(24),
    paddingTop: rw(10),
    maxHeight: "85%",
  },
  handle: {
    width: rw(36),
    height: 4,
    backgroundColor: T.borderStrong,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: rw(20),
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rw(12),
    marginBottom: rw(20),
  },
  gigTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  gigCompany: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  closeBtn: {
    padding: rw(4),
    marginTop: rw(2),
  },
  body: {
    gap: rw(20),
    paddingBottom: rw(8),
  },
  metaSection: {
    gap: rw(10),
    backgroundColor: T.bg,
    borderRadius: rw(12),
    padding: rw(14),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  metaText: {
    flex: 1,
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
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
    gap: rw(6),
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
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.avatarText,
  },
  posterName: {
    fontSize: rf(13),
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
  payAmount: {
    fontSize: rf(18),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  payType: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  actionZone: {
    backgroundColor: T.bg,
    borderRadius: rw(14),
    padding: rw(16),
    gap: rw(12),
    borderWidth: 1,
    borderColor: T.border,
  },
  actionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
  },
  actionLabel: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
  },
  otpBoxRow: {
    flexDirection: "row",
    gap: rw(10),
  },
  otpBox: {
    flex: 1,
    height: rw(58),
    backgroundColor: T.surface,
    borderRadius: rw(12),
    borderWidth: 1.5,
    borderColor: T.border,
    fontSize: rf(26),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    textAlign: "center",
  },
  otpBoxFilled: {
    borderColor: T.primary,
    backgroundColor: T.primary + "15",
  },
  confirmBtn: {
    height: rw(48),
    backgroundColor: T.ctaBg,
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
  },
  viewGigBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rw(7),
    paddingVertical: rw(13),
    borderRadius: rw(12),
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  viewGigBtnText: {
    fontSize: rf(14),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
  },
  confirmText: {
    fontSize: rf(14),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.ctaText,
  },
  rateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rw(8),
    backgroundColor: T.ctaBg,
    borderRadius: rw(12),
    paddingVertical: rw(14),
  },
  rateBtnText: {
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.ctaText,
  },
  stateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rw(6),
    paddingVertical: rw(10),
  },
  stateText: {
    fontSize: rf(13),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
  },
});

// ── Runner tab ────────────────────────────────────────────────────────────────

function RunnerTab() {
  const [items, setItems] = useState<AcceptedGigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"upcoming" | "history">("upcoming");
  const [selectedGig, setSelectedGig] = useState<AcceptedGigItem | null>(null);

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

  return (
    <>
      {/* Sub-tab bar */}
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
          style={[styles.subTab, activeSubTab === "history" && styles.subTabActive]}
          onPress={() => setActiveSubTab("history")}
        >
          <Text style={[styles.subTabText, activeSubTab === "history" && styles.subTabTextActive]}>
            History{history.length > 0 ? ` (${history.length})` : ""}
          </Text>
        </Pressable>
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={displayItems}
        keyExtractor={(item) => item.gig_id}
        renderItem={({ item }) =>
          activeSubTab === "upcoming" ? (
            <UpcomingGigCard item={item} onPress={() => setSelectedGig(item)} />
          ) : (
            <HistoryGigCard item={item} onPress={() => setSelectedGig(item)} />
          )
        }
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
        ItemSeparatorComponent={() => <View style={{ height: rw(8) }} />}
      />

      <GigDetailSheet
        item={selectedGig}
        onClose={() => setSelectedGig(null)}
        onOtpSuccess={(gigId) => {
          setItems((prev) =>
            prev.map((i) => i.gig_id === gigId ? { ...i, assignment_status: "completed" } : i)
          );
        }}
        onRateSuccess={(gigId) => {
          setItems((prev) =>
            prev.map((i) => i.gig_id === gigId ? { ...i, has_been_rated: true } : i)
          );
        }}
      />
    </>
  );
}

// ── Event card (Poster tab) ───────────────────────────────────────────────────

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
  }, []);

  useEffect(() => { loadAll(); }, []);

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
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
      <LinearGradient colors={T.gradDark} style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>My Space</Text>
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
    gap: rw(4),
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
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

  // Sub-tabs
  subTabBar: {
    flexDirection: "row",
    paddingHorizontal: rw(16),
    paddingTop: rw(14),
    paddingBottom: rw(10),
    gap: rw(8),
  },
  subTab: {
    paddingHorizontal: rw(16),
    paddingVertical: rw(7),
    borderRadius: rw(20),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  subTabActive: {
    backgroundColor: T.selBg,
    borderColor: T.selBg,
  },
  subTabText: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
  },
  subTabTextActive: {
    color: T.selText,
  },

  // List
  list: {
    paddingHorizontal: rw(16),
    paddingTop: rw(4),
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
    fontSize: rf(18),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  emptySubtitle: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    textAlign: "center",
    lineHeight: rf(21),
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
