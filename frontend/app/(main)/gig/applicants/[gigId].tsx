import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getApplicants,
  acceptApplicant,
  rejectApplicant,
  ApplicantListItem,
} from "@/lib/api/applicants";
import { createConversation } from "@/lib/api/chat";
import { T } from "@/constants/colors";

export default function ApplicantsScreen() {
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [chatInProgress, setChatInProgress] = useState<string | null>(null);

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
              setApplicants((prev) =>
                prev.map((a) =>
                  a.application_id === item.application_id
                    ? { ...a, status: "accepted" }
                    : a
                )
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
      router.push(`/(main)/chat/${result.data.id}`);
    }
  };

  const renderItem = ({ item }: { item: ApplicantListItem }) => {
    const p = item.applicant;
    const isActing = actionInProgress === item.application_id;
    const isChatting = chatInProgress === item.application_id;
    const reputation = p.worker_reputation ?? 0;
    const stars = Math.round(reputation);

    return (
      <View style={styles.card}>
        {/* Avatar placeholder + name */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(p.first_name?.[0] ?? p.display_name[0]).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{p.display_name}</Text>
              {p.is_verified && (
                <Feather name="check-circle" size={14} color={T.primary} />
              )}
              {p.id_verified && (
                <Feather name="shield" size={14} color={T.success} />
              )}
            </View>
            {p.city && (
              <Text style={styles.location}>
                <Feather name="map-pin" size={12} color={T.textMuted} /> {p.city}
              </Text>
            )}
          </View>
          <StatusChip status={item.status} />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{p.total_gigs_completed}</Text>
            <Text style={styles.statLabel}>Gigs Done</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {reputation > 0 ? reputation.toFixed(1) : "—"}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {Math.round(p.reliability_score * 100)}%
            </Text>
            <Text style={styles.statLabel}>Reliable</Text>
          </View>
        </View>

        {/* Languages / skills */}
        {(p.languages.length > 0 || p.skills.length > 0) && (
          <View style={styles.tagsRow}>
            {p.languages.slice(0, 3).map((lang) => (
              <View key={lang} style={styles.tag}>
                <Text style={styles.tagText}>{lang}</Text>
              </View>
            ))}
            {p.skills.slice(0, 2).map((skill) => (
              <View key={skill} style={[styles.tag, styles.tagSkill]}>
                <Text style={[styles.tagText, styles.tagSkillText]}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Message */}
        {item.message && (
          <Text style={styles.message}>&ldquo;{item.message}&rdquo;</Text>
        )}

        {/* Applied at */}
        <Text style={styles.appliedAt}>
          Applied {new Date(item.applied_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>

        {/* Chat button — always visible */}
        <Pressable
          style={[styles.chatBtn, isChatting && { opacity: 0.6 }]}
          onPress={() => handleChat(item)}
          disabled={isChatting}
        >
          {isChatting ? (
            <ActivityIndicator size="small" color={T.primary} />
          ) : (
            <Feather name="message-circle" size={15} color={T.primary} />
          )}
          <Text style={styles.chatBtnText}>Chat</Text>
        </Pressable>

        {/* Action buttons (only for pending) */}
        {item.status === "pending" && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
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
              onPress={() => handleAccept(item)}
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
          </View>
        )}
      </View>
    );
  };

  const pending = applicants.filter((a) => a.status === "pending").length;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Applicants",
          headerTintColor: T.primary,
        }}
      />
      <View style={styles.container}>
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
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              applicants.length > 0 ? (
                <Text style={styles.summary}>
                  {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
                  {pending > 0 ? ` · ${pending} pending` : ""}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Feather name="users" size={48} color={T.textMuted} />
                <Text style={styles.emptyText}>No applicants yet</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

function StatusChip({ status }: { status: ApplicantListItem["status"] }) {
  const config: Record<typeof status, { label: string; color: string; bg: string }> = {
    pending: { label: "Pending", color: T.warning, bg: "#FEF3C7" },
    accepted: { label: "Accepted", color: T.success, bg: "#DCFCE7" },
    rejected: { label: "Rejected", color: T.error, bg: "#FEE2E2" },
    withdrawn: { label: "Withdrawn", color: T.textMuted, bg: T.border },
  };
  const c = config[status];
  return (
    <View style={[styles.chip, { backgroundColor: c.bg }]}>
      <Text style={[styles.chipText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
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
    gap: 12,
  },
  summary: {
    fontSize: 13,
    color: T.textMuted,
    marginBottom: 4,
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.primary100,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: T.primary,
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: T.text,
  },
  location: {
    fontSize: 12,
    color: T.textMuted,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: T.bg,
    borderRadius: 8,
    padding: 10,
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
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: T.primary50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: T.primary,
    textTransform: "capitalize",
  },
  tagSkill: {
    backgroundColor: T.secondary50 ?? "#FFF7ED",
  },
  tagSkillText: {
    color: T.secondary,
  },
  message: {
    fontSize: 13,
    color: T.textSub,
    fontStyle: "italic",
    lineHeight: 18,
  },
  appliedAt: {
    fontSize: 11,
    color: T.textMuted,
  },
  chatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: T.primary50,
    borderRadius: 8,
    marginBottom: 4,
  },
  chatBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.primary,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 8,
  },
  rejectBtn: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: T.error,
  },
  acceptBtn: {
    backgroundColor: T.success,
  },
  actionText: {
    fontSize: 14,
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
    backgroundColor: T.primary,
    borderRadius: 8,
  },
  retryText: {
    color: T.textInverse,
    fontWeight: "600",
  },
});
