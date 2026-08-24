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
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import { SkillCategories, DegreeOptions, Languages } from "@/constants/config";
import { MomentumBadge } from "@/components/momentum/MomentumBadge";
import { RatingModal } from "@/components/ui/RatingModal";
import { Skeleton } from "@/components/ui/Skeleton";

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
          <View style={styles.listSkeletonWrap}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.listSkeletonRow}>
                <Skeleton width={44} height={44} borderRadius={22} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="60%" height={14} borderRadius={4} />
                  <Skeleton width="40%" height={12} borderRadius={4} />
                </View>
                <Skeleton width={70} height={22} borderRadius={11} />
              </View>
            ))}
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
                <Text style={styles.emptyText}>Waiting for applicants</Text>
                <Text style={styles.emptySub}>
                  Runners nearby will see your gig in Explore. First applications usually land within a few hours.
                </Text>
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
  const workerMomentum = item.momentum_score ?? 0;

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

  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.md,
    paddingBottom: S.sm,
  },
  backBtn: {
    padding: 4,
    width: rw(38),
  },
  appHeaderTitle: {
    ...TYPE.title3,
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: S.sm,
    padding: S.lg,
  },
  list: {
    padding: S.md,
    paddingBottom: S.xxl,
    gap: S.xs,
  },
  separator: {
    height: S.xs,
  },

  headerBlock: {
    gap: S.xs,
    marginBottom: S.xs,
  },
  otpBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.selBg,
    borderRadius: R.card,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    ...SHADOW.card,
  },
  otpBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    flex: 1,
  },
  otpBannerLabel: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.selText,
  },
  otpBannerHint: {
    ...TYPE.label,
    color: T.selText,
    marginTop: 1,
  },
  otpBannerCode: {
    ...TYPE.display,
    fontSize: 28,
    color: T.selText,
    letterSpacing: 6,
  },
  summary: {
    ...TYPE.caption,
    color: T.textMuted,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    ...SHADOW.card,
  },
  rowAvatar: {
    width: rw(38),
    height: rw(38),
    borderRadius: rw(19),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowAvatarText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
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
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
    flexShrink: 1,
  },
  rowMeta: {
    ...TYPE.caption,
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
    ...TYPE.label,
    color: T.selText,
    letterSpacing: 1,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  sheet: {
    backgroundColor: T.surface1,
    borderTopLeftRadius: R.hero,
    borderTopRightRadius: R.hero,
    paddingTop: S.xs,
    paddingBottom: S.lg,
    maxHeight: "80%",
    ...SHADOW.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: T.surface2,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: S.sm,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    paddingHorizontal: S.lg,
    marginBottom: S.sm,
  },
  sheetAvatar: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  sheetAvatarText: {
    ...TYPE.title2,
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
    ...TYPE.title3,
    color: T.text,
  },
  sheetLocation: {
    ...TYPE.caption,
    color: T.textMuted,
  },
  sheetClose: {
    padding: 4,
  },
  sheetScroll: {
    paddingHorizontal: S.lg,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: T.surface2,
    borderRadius: R.card,
    padding: S.sm,
    marginBottom: S.sm,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    ...TYPE.title3,
    color: T.text,
  },
  statLabel: {
    ...TYPE.label,
    color: T.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: T.surface2,
    marginVertical: 4,
  },

  profileSection: {
    marginBottom: S.sm,
    gap: S.xs,
  },
  sectionLabel: {
    ...TYPE.label,
    color: T.textMuted,
  },
  bioText: {
    ...TYPE.body,
    color: T.textSub,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  langChip: {
    backgroundColor: T.surface2,
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.chip,
  },
  langChipText: {
    ...TYPE.caption,
    color: T.textSub,
  },
  skillChip: {
    backgroundColor: T.selBg,
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.chip,
  },
  skillChipText: {
    ...TYPE.caption,
    color: T.selText,
    fontFamily: "Inter_500Medium",
    fontWeight: "500",
  },

  timelineItem: {
    flexDirection: "row",
    gap: S.sm,
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
    paddingBottom: S.sm,
    borderBottomWidth: 1,
    borderBottomColor: T.surface2,
    gap: 2,
    marginBottom: 4,
  },
  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    flexWrap: "wrap",
  },
  timelineTitle: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  timelineCompany: {
    ...TYPE.body,
    color: T.textSub,
  },
  timelineMeta: {
    ...TYPE.caption,
    color: T.textMuted,
  },
  studentBadge: {
    backgroundColor: T.selBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  studentBadgeText: {
    ...TYPE.label,
    fontSize: 10,
    color: T.selText,
  },

  message: {
    ...TYPE.body,
    color: T.textSub,
    fontStyle: "italic",
  },
  appliedAt: {
    ...TYPE.label,
    color: T.textMuted,
    marginBottom: S.sm,
  },

  sheetOtpBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    backgroundColor: T.selBg,
    borderRadius: R.card,
    padding: S.sm,
    marginBottom: S.xs,
  },
  sheetOtpLabel: {
    ...TYPE.label,
    color: T.selText,
  },
  sheetOtpHint: {
    ...TYPE.label,
    fontSize: 10,
    color: T.selText,
    marginTop: 1,
  },
  sheetOtpCode: {
    ...TYPE.title1,
    fontSize: 24,
    color: T.selText,
    letterSpacing: 4,
  },

  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.success + "22",
    borderRadius: R.button,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    alignSelf: "flex-start",
    marginBottom: S.xs,
  },
  completedText: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.success,
  },
  noShowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.error + "22",
    borderRadius: R.button,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    alignSelf: "flex-start",
    marginBottom: S.xs,
  },
  noShowText: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.error,
  },

  sheetActions: {
    flexDirection: "row",
    gap: S.xs,
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: rw(44),
    borderRadius: R.button,
    ...SHADOW.sm,
  },
  actionText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  emptySub: {
    ...TYPE.body,
    color: T.textMuted,
    textAlign: "center",
    paddingHorizontal: S.lg,
    marginTop: 6,
  },
  listSkeletonWrap: {
    padding: S.lg,
    gap: S.sm,
  },
  listSkeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    padding: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    ...SHADOW.card,
  },
  chatBtn: {
    backgroundColor: T.ctaBg,
    flex: 0,
    paddingHorizontal: S.md,
  },
  chatBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.ctaText,
  },
  rejectBtn: {
    backgroundColor: T.error + "22",
  },
  acceptBtn: {
    backgroundColor: T.success,
  },
  noShowBtn: {
    backgroundColor: T.error + "22",
  },
  rateBtn: {
    backgroundColor: T.accent,
  },
  ratedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    backgroundColor: T.success + "22",
    borderRadius: R.button,
  },
  ratedText: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.success,
  },

  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  errorText: {
    ...TYPE.bodyLg,
    color: T.textSub,
    textAlign: "center",
  },
  emptyText: {
    ...TYPE.title3,
    color: T.textMuted,
  },
  retryBtn: {
    paddingHorizontal: S.lg,
    paddingVertical: S.xs,
    backgroundColor: T.ctaBg,
    borderRadius: R.button,
    ...SHADOW.sm,
  },
  retryText: {
    color: T.ctaText,
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
