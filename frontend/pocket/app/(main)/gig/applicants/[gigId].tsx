import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  getApplicants,
  acceptApplicant,
  rejectApplicant,
  ApplicantListItem,
} from "@/lib/api/applicants";
import { createConversation } from "@/lib/api/chat";
import { noShowAssignment } from "@/lib/api/ratings";
import { T } from "@/constants/colors";
import { SkillCategories, DegreeOptions, Languages } from "@/constants/config";
import { MomentumBadge } from "@/components/momentum/MomentumBadge";
import { RatingModal } from "@/components/ui/RatingModal";

// ── Label lookup helpers ─────────────────────────────────────────────────────

const SKILL_MAP = new Map(
  SkillCategories.flatMap((c) => c.skills.map((s) => [s.value, s.label]))
);
const DEGREE_MAP = new Map(
  DegreeOptions.flatMap((g) => g.options.map((o) => [o.value, o.label]))
);
const LANG_MAP = new Map(Languages.map((l) => [l.value, l.label]));

function skillLabel(v: string) { return SKILL_MAP.get(v) ?? v; }
function degreeLabel(v: string) { return DEGREE_MAP.get(v) ?? v; }
function langLabel(v: string) { return LANG_MAP.get(v) ?? v; }

const CURRENT_YEAR = new Date().getFullYear();

export default function ApplicantsScreen() {
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const insets = useSafeAreaInsets();
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [chatInProgress, setChatInProgress] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApplicantListItem | null>(null);
  const [ratingTarget, setRatingTarget] = useState<ApplicantListItem | null>(null);

  const load = async () => {
    if (!gigId) return;
    setLoading(true);
    const result = await getApplicants(gigId);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setApplicants(result.data.applicants);
    }
  };

  useEffect(() => {
    load();
  }, [gigId]);

  const handleAccept = (item: ApplicantListItem) => {
    Alert.alert(
      "Accept Applicant",
      `Accept ${item.applicant.display_name} for this gig?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Accept",
          onPress: async () => {
            setActionInProgress(item.application_id);
            const result = await acceptApplicant(item.application_id);
            setActionInProgress(null);
            if (result.error) {
              Alert.alert("Error", result.error);
            } else {
              await load();
              // Refresh selected so modal reflects new state
              setSelected((prev) =>
                prev?.application_id === item.application_id ? null : prev
              );
            }
          },
        },
      ]
    );
  };

  const handleReject = (item: ApplicantListItem) => {
    Alert.alert(
      "Reject Applicant",
      `Reject ${item.applicant.display_name}'s application?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionInProgress(item.application_id);
            const result = await rejectApplicant(item.application_id);
            setActionInProgress(null);
            if (result.error) {
              Alert.alert("Error", result.error);
            } else {
              setApplicants((prev) =>
                prev.map((a) =>
                  a.application_id === item.application_id
                    ? { ...a, status: "rejected" }
                    : a
                )
              );
              setSelected(null);
            }
          },
        },
      ]
    );
  };

  const handleChat = async (item: ApplicantListItem) => {
    setChatInProgress(item.application_id);
    const result = await createConversation({ other_user_id: item.applicant.id });
    setChatInProgress(null);
    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      setSelected(null);
      router.push(`/(main)/chat/${result.data.id}`);
    }
  };

  const handleNoShow = (item: ApplicantListItem) => {
    if (!item.assignment_id) return;
    Alert.alert(
      "Mark No-Show",
      `Mark ${item.applicant.display_name} as a no-show?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "No-Show",
          style: "destructive",
          onPress: async () => {
            setActionInProgress(item.application_id);
            const result = await noShowAssignment(item.assignment_id!);
            setActionInProgress(null);
            if (result.error) {
              Alert.alert("Error", result.error);
            } else {
              setApplicants((prev) =>
                prev.map((a) =>
                  a.application_id === item.application_id
                    ? { ...a, assignment_status: "no_show" }
                    : a
                )
              );
              setSelected(null);
            }
          },
        },
      ]
    );
  };

  // ── Compact row ──────────────────────────────────────────────────────────────
  const renderRow = ({ item }: { item: ApplicantListItem }) => {
    const p = item.applicant;
    const initial = (p.first_name?.[0] ?? p.display_name[0]).toUpperCase();

    return (
      <Pressable style={styles.row} onPress={() => setSelected(item)}>
        <View style={styles.rowAvatar}>
          <Text style={styles.rowAvatarText}>{initial}</Text>
        </View>

        <View style={styles.rowBody}>
          <View style={styles.rowNameLine}>
            <Text style={styles.rowName} numberOfLines={1}>{p.display_name}</Text>
            {p.is_verified && (
              <Feather name="check-circle" size={12} color={T.primary} />
            )}
            {p.id_verified && (
              <Feather name="shield" size={12} color={T.success} />
            )}
          </View>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {p.total_gigs_completed} gigs
            {p.city ? ` · ${p.city}` : ""}
          </Text>
        </View>

        <View style={styles.rowRight}>
          <StatusChip status={item.status} small />
          {item.assignment_status === "assigned" && item.assignment_otp && (
            <View style={styles.rowOtpBadge}>
              <Feather name="key" size={10} color={T.selText} />
              <Text style={styles.rowOtpText}>{item.assignment_otp}</Text>
            </View>
          )}
        </View>

        <Feather name="chevron-right" size={16} color={T.textMuted} />
      </Pressable>
    );
  };

  const pending = applicants.filter((a) => a.status === "pending").length;
  const gigOtp = applicants.find((a) => a.assignment_otp)?.assignment_otp ?? null;

  // Sync selected item with latest applicants state (e.g. after reload)
  const selectedFresh = selected
    ? (applicants.find((a) => a.application_id === selected.application_id) ?? selected)
    : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Detail Modal ── */}
      <Modal
        visible={!!selectedFresh}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelected(null)}
        />
        {selectedFresh && (
          <DetailSheet
            item={selectedFresh}
            isActing={actionInProgress === selectedFresh.application_id}
            isChatting={chatInProgress === selectedFresh.application_id}
            onClose={() => setSelected(null)}
            onAccept={() => handleAccept(selectedFresh)}
            onReject={() => handleReject(selectedFresh)}
            onChat={() => handleChat(selectedFresh)}
            onNoShow={() => handleNoShow(selectedFresh)}
            onRate={() => {
              setRatingTarget(selectedFresh);
              setSelected(null);
            }}
          />
        )}
      </Modal>

      {/* ── Rating Modal ── */}
      {ratingTarget && gigId && (
        <RatingModal
          visible={!!ratingTarget}
          onClose={() => setRatingTarget(null)}
          gigId={gigId}
          rateeId={ratingTarget.applicant.id}
          ratingType="worker_rating"
          rateeName={ratingTarget.applicant.display_name}
          onSuccess={() => {
            setApplicants((prev) =>
              prev.map((a) =>
                a.application_id === ratingTarget.application_id
                  ? { ...a, has_been_rated: true }
                  : a
              )
            );
            setRatingTarget(null);
          }}
        />
      )}

      <View style={styles.container}>
        {/* ── Custom header ── */}
        <LinearGradient
          colors={T.gradDark}
          style={[styles.appHeader, { paddingTop: insets.top + 16 }]}
        >
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={T.textInverse} />
          </Pressable>
          <Text style={styles.appHeaderTitle}>Applicants</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={T.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={48} color={T.error} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={applicants}
            keyExtractor={(item) => item.application_id}
            renderItem={renderRow}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              applicants.length > 0 ? (
                <View style={styles.headerBlock}>
                  {gigOtp && (
                    <View style={styles.otpBanner}>
                      <View style={styles.otpBannerLeft}>
                        <Feather name="key" size={20} color={T.selText} />
                        <View>
                          <Text style={styles.otpBannerLabel}>Check-in Code</Text>
                          <Text style={styles.otpBannerHint}>
                            Share with workers to confirm attendance
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.otpBannerCode}>{gigOtp}</Text>
                    </View>
                  )}
                  <Text style={styles.summary}>
                    {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
                    {pending > 0 ? ` · ${pending} pending` : ""}
                  </Text>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Feather name="users" size={48} color={T.textMuted} />
                <Text style={styles.emptyText}>No applicants yet</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>
    </>
  );
}

// ── Detail Sheet ─────────────────────────────────────────────────────────────

type DetailSheetProps = {
  item: ApplicantListItem;
  isActing: boolean;
  isChatting: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  onChat: () => void;
  onNoShow: () => void;
  onRate: () => void;
};

function DetailSheet({
  item,
  isActing,
  isChatting,
  onClose,
  onAccept,
  onReject,
  onChat,
  onNoShow,
  onRate,
}: DetailSheetProps) {
  const p = item.applicant;
  const workerMomentum = (p as any).worker_momentum ?? 500;

  return (
    <View style={styles.sheet}>
      {/* Handle */}
      <View style={styles.sheetHandle} />

      {/* Header row */}
      <View style={styles.sheetHeader}>
        <View style={styles.sheetAvatar}>
          <Text style={styles.sheetAvatarText}>
            {(p.first_name?.[0] ?? p.display_name[0]).toUpperCase()}
          </Text>
        </View>
        <View style={styles.sheetNameBlock}>
          <View style={styles.sheetNameRow}>
            <Text style={styles.sheetName}>{p.display_name}</Text>
            {p.is_verified && (
              <Feather name="check-circle" size={15} color={T.primary} />
            )}
            {p.id_verified && (
              <Feather name="shield" size={15} color={T.success} />
            )}
          </View>
          {p.city && (
            <Text style={styles.sheetLocation}>
              <Feather name="map-pin" size={12} color={T.textMuted} /> {p.city}
            </Text>
          )}
        </View>
        <StatusChip status={item.status} />
        <Pressable style={styles.sheetClose} onPress={onClose} hitSlop={10}>
          <Feather name="x" size={20} color={T.textMuted} />
        </Pressable>
      </View>

      <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{p.total_gigs_completed}</Text>
            <Text style={styles.statLabel}>Gigs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <MomentumBadge score={workerMomentum} variant="stat" />
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(p.reliability_score * 100)}%
            </Text>
            <Text style={styles.statLabel}>Reliable</Text>
          </View>
        </View>

        {/* Application message */}
        {item.message && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Application Note</Text>
            <Text style={styles.message}>&ldquo;{item.message}&rdquo;</Text>
          </View>
        )}

        {/* Bio */}
        {p.bio ? (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.bioText}>{p.bio}</Text>
          </View>
        ) : null}

        {/* Languages */}
        {p.languages.length > 0 && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Languages</Text>
            <View style={styles.chipRow}>
              {p.languages.map((l) => (
                <View key={l} style={styles.langChip}>
                  <Text style={styles.langChipText}>{langLabel(l)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills */}
        {p.skills.length > 0 && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Skills</Text>
            <View style={styles.chipRow}>
              {p.skills.map((s) => (
                <View key={s} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>{skillLabel(s)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Work Experience */}
        {p.work_experience.length > 0 && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Work Experience</Text>
            {p.work_experience.map((w, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineBody}>
                  <Text style={styles.timelineTitle}>{w.role}</Text>
                  <Text style={styles.timelineCompany}>{w.company}</Text>
                  <Text style={styles.timelineMeta}>
                    {w.from_year} – {w.to_year ?? "Present"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {p.education_entries.length > 0 && (
          <View style={styles.profileSection}>
            <Text style={styles.sectionLabel}>Education</Text>
            {p.education_entries.map((e, i) => {
              const isStudent = e.passing_year > CURRENT_YEAR;
              return (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineBody}>
                    <View style={styles.timelineTitleRow}>
                      <Text style={styles.timelineTitle}>{degreeLabel(e.degree)}</Text>
                      {isStudent && (
                        <View style={styles.studentBadge}>
                          <Text style={styles.studentBadgeText}>Student</Text>
                        </View>
                      )}
                    </View>
                    {e.field ? (
                      <Text style={styles.timelineCompany}>{e.field}</Text>
                    ) : null}
                    <Text style={styles.timelineMeta}>
                      {e.college}
                      {isStudent ? ` · Graduating ${e.passing_year}` : ` · ${e.passing_year}`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Applied at */}
        <Text style={styles.appliedAt}>
          Applied{" "}
          {new Date(item.applied_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        {/* OTP banner (assignment = assigned) */}
        {item.status === "accepted" && item.assignment_status === "assigned" && item.assignment_otp && (
          <View style={styles.sheetOtpBanner}>
            <Feather name="key" size={16} color={T.selText} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetOtpLabel}>Check-in Code</Text>
              <Text style={styles.sheetOtpHint}>Worker enters this to confirm attendance</Text>
            </View>
            <Text style={styles.sheetOtpCode}>{item.assignment_otp}</Text>
          </View>
        )}

        {/* Assignment status badges */}
        {item.assignment_status === "completed" && (
          <View style={styles.completedBadge}>
            <Feather name="check-circle" size={14} color={T.success} />
            <Text style={styles.completedText}>Attended</Text>
          </View>
        )}
        {item.assignment_status === "no_show" && (
          <View style={styles.noShowBadge}>
            <Feather name="user-x" size={14} color={T.error} />
            <Text style={styles.noShowText}>No-Show</Text>
          </View>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.sheetActions}>
        {/* Chat — always */}
        <Pressable
          style={[styles.actionBtn, styles.chatBtn, isChatting && { opacity: 0.6 }]}
          onPress={onChat}
          disabled={isChatting}
        >
          {isChatting ? (
            <ActivityIndicator size="small" color={T.ctaText} />
          ) : (
            <Feather name="message-circle" size={16} color={T.ctaText} />
          )}
          <Text style={styles.chatBtnText}>Chat</Text>
        </Pressable>

        {/* Pending: reject + accept */}
        {item.status === "pending" && (
          <>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={onReject}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator size="small" color={T.error} />
              ) : (
                <>
                  <Feather name="x" size={16} color={T.error} />
                  <Text style={[styles.actionText, { color: T.error }]}>Reject</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={onAccept}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator size="small" color={T.textInverse} />
              ) : (
                <>
                  <Feather name="check" size={16} color={T.textInverse} />
                  <Text style={[styles.actionText, { color: T.textInverse }]}>Accept</Text>
                </>
              )}
            </Pressable>
          </>
        )}

        {/* Assigned: no-show */}
        {item.status === "accepted" && item.assignment_status === "assigned" && (
          <Pressable
            style={[styles.actionBtn, styles.noShowBtn]}
            onPress={onNoShow}
            disabled={isActing}
          >
            {isActing ? (
              <ActivityIndicator size="small" color={T.error} />
            ) : (
              <>
                <Feather name="user-x" size={16} color={T.error} />
                <Text style={[styles.actionText, { color: T.error }]}>No-Show</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Completed: rate */}
        {item.assignment_status === "completed" && !item.has_been_rated && (
          <Pressable style={[styles.actionBtn, styles.rateBtn]} onPress={onRate}>
            <Feather name="star" size={16} color={T.textInverse} />
            <Text style={[styles.actionText, { color: T.textInverse }]}>Rate Worker</Text>
          </Pressable>
        )}
        {item.assignment_status === "completed" && item.has_been_rated && (
          <View style={styles.ratedBadge}>
            <Feather name="check" size={13} color={T.success} />
            <Text style={styles.ratedText}>Rated</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ── StatusChip ───────────────────────────────────────────────────────────────

function StatusChip({
  status,
  small,
}: {
  status: ApplicantListItem["status"];
  small?: boolean;
}) {
  const config: Record<typeof status, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: T.warning, bg: "#FEF3C7" },
    accepted: { label: "Accepted", color: T.success, bg: "#DCFCE7" },
    rejected: { label: "Rejected", color: T.error, bg: "#FEE2E2" },
    withdrawn: { label: "Withdrawn", color: T.textMuted, bg: T.border },
  };
  const c = config[status];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.color, fontSize: small ? 10 : 11 }]}>
        {c.label}
      </Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // ── App header ──
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    padding: 4,
    width: 38,
  },
  appHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: T.textInverse,
    flex: 1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 24,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: 60,
  },

  // ── Header block ──
  headerBlock: {
    gap: 10,
    marginBottom: 8,
  },
  otpBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.selBg,
    borderWidth: 1.5,
    borderColor: T.selBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  otpBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  otpBannerLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: T.selText,
  },
  otpBannerHint: {
    fontSize: 11,
    color: T.selText,
    marginTop: 1,
  },
  otpBannerCode: {
    fontSize: 28,
    fontWeight: "900",
    color: T.selText,
    letterSpacing: 6,
  },
  summary: {
    fontSize: 13,
    color: T.textMuted,
  },

  // ── Compact row ──
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowAvatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: T.avatarText,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  rowName: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text,
    flexShrink: 1,
  },
  rowMeta: {
    fontSize: 12,
    color: T.textMuted,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  rowOtpBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: T.selBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rowOtpText: {
    fontSize: 11,
    fontWeight: "800",
    color: T.selText,
    letterSpacing: 1,
  },

  // ── Modal overlay ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  // ── Detail sheet ──
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sheetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sheetAvatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: T.avatarText,
  },
  sheetNameBlock: {
    flex: 1,
    gap: 2,
  },
  sheetNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sheetName: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
  },
  sheetLocation: {
    fontSize: 12,
    color: T.textMuted,
  },
  sheetClose: {
    padding: 4,
  },
  sheetScroll: {
    paddingHorizontal: 20,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: "row",
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
  },
  statLabel: {
    fontSize: 11,
    color: T.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: T.border,
    marginVertical: 4,
  },

  // ── Profile sections inside sheet ──
  profileSection: {
    marginBottom: 14,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  bioText: {
    fontSize: 14,
    color: T.textSub,
    lineHeight: 20,
  },

  // ── Language / skill chips ──
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  langChip: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  langChipText: {
    fontSize: 12,
    color: T.textSub,
  },
  skillChip: {
    backgroundColor: T.selBg,
    borderWidth: 1,
    borderColor: T.selBorder,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  skillChipText: {
    fontSize: 12,
    color: T.selText,
    fontWeight: "500",
  },

  // ── Timeline (work / education) ──
  timelineItem: {
    flexDirection: "row",
    gap: 12,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.primary,
    marginTop: 5,
    flexShrink: 0,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 2,
    marginBottom: 4,
  },
  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.text,
  },
  timelineCompany: {
    fontSize: 13,
    color: T.textSub,
  },
  timelineMeta: {
    fontSize: 12,
    color: T.textMuted,
  },
  studentBadge: {
    backgroundColor: T.selBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  studentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: T.selText,
  },

  // ── Message / date ──
  message: {
    fontSize: 13,
    color: T.textSub,
    fontStyle: "italic",
    lineHeight: 18,
  },
  appliedAt: {
    fontSize: 11,
    color: T.textMuted,
    marginBottom: 12,
  },

  // ── OTP inside sheet ──
  sheetOtpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.selBg,
    borderWidth: 1,
    borderColor: T.selBorder,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  sheetOtpLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: T.selText,
  },
  sheetOtpHint: {
    fontSize: 11,
    color: T.selText,
    marginTop: 1,
  },
  sheetOtpCode: {
    fontSize: 24,
    fontWeight: "900",
    color: T.selText,
    letterSpacing: 4,
  },

  // ── Status badges inside sheet ──
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  completedText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.success,
  },
  noShowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  noShowText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.error,
  },

  // ── Sheet action buttons ──
  sheetActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 10,
  },
  chatBtn: {
    backgroundColor: T.ctaBg,
    borderWidth: 1,
    borderColor: T.ctaBg,
    flex: 0,
    paddingHorizontal: 16,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: T.ctaText,
  },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: T.error,
  },
  acceptBtn: {
    backgroundColor: T.success,
  },
  noShowBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: T.error,
  },
  rateBtn: {
    backgroundColor: T.accent,
  },
  ratedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
  },
  ratedText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.success,
  },

  // ── Misc ──
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontWeight: "600",
  },
  errorText: {
    fontSize: 15,
    color: T.textSub,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: T.textMuted,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: T.ctaBg,
    borderRadius: 8,
  },
  retryText: {
    color: T.ctaText,
    fontWeight: "600",
  },
});
