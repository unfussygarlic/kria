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
import { useLocalSearchParams, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  getApplicants,
  acceptApplicant,
  rejectApplicant,
  ApplicantListItem,
} from "@/lib/api/applicants";
import { Colors } from "@/constants/colors";

export default function ApplicantsScreen() {
  const { gigId } = useLocalSearchParams<{ gigId: string }>();
  const [applicants, setApplicants] = useState<ApplicantListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

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

  const renderItem = ({ item }: { item: ApplicantListItem }) => {
    const p = item.applicant;
    const isActing = actionInProgress === item.application_id;
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
                <Feather name="check-circle" size={14} color={Colors.primary.DEFAULT} />
              )}
              {p.id_verified && (
                <Feather name="shield" size={14} color={Colors.success} />
              )}
            </View>
            {p.city && (
              <Text style={styles.location}>
                <Feather name="map-pin" size={12} color={Colors.text.muted} /> {p.city}
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

        {/* Action buttons (only for pending) */}
        {item.status === "pending" && (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleReject(item)}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <>
                  <Feather name="x" size={16} color={Colors.error} />
                  <Text style={[styles.actionText, { color: Colors.error }]}>Reject</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.acceptBtn]}
              onPress={() => handleAccept(item)}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator size="small" color={Colors.text.inverse} />
              ) : (
                <>
                  <Feather name="check" size={16} color={Colors.text.inverse} />
                  <Text style={[styles.actionText, { color: Colors.text.inverse }]}>Accept</Text>
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
          headerTintColor: Colors.primary.DEFAULT,
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary.DEFAULT} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Feather name="alert-circle" size={48} color={Colors.error} />
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
                <Feather name="users" size={48} color={Colors.text.muted} />
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
    pending: { label: "Pending", color: Colors.warning, bg: "#FEF3C7" },
    accepted: { label: "Accepted", color: Colors.success, bg: "#DCFCE7" },
    rejected: { label: "Rejected", color: Colors.error, bg: "#FEE2E2" },
    withdrawn: { label: "Withdrawn", color: Colors.text.muted, bg: Colors.border },
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
    backgroundColor: Colors.background,
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
    color: Colors.text.muted,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary.DEFAULT,
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
    color: Colors.text.primary,
  },
  location: {
    fontSize: 12,
    color: Colors.text.muted,
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
    backgroundColor: Colors.background,
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
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.text.muted,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    color: Colors.primary.DEFAULT,
    textTransform: "capitalize",
  },
  tagSkill: {
    backgroundColor: Colors.secondary[50] ?? "#FFF7ED",
  },
  tagSkillText: {
    color: Colors.secondary.DEFAULT,
  },
  message: {
    fontSize: 13,
    color: Colors.text.secondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  appliedAt: {
    fontSize: 11,
    color: Colors.text.muted,
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
    borderColor: Colors.error,
  },
  acceptBtn: {
    backgroundColor: Colors.success,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.muted,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: Colors.primary.DEFAULT,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.text.inverse,
    fontWeight: "600",
  },
});
