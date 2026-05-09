import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { T } from "@/constants/colors";
import { calculateCompletion } from "@/lib/profileCompletion";

// ── 2×2 quick action box ─────────────────────────────────────────────────────

function QuickBox({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.quickBox, pressed && styles.quickBoxPressed]}
      onPress={onPress}
    >
      <View style={[styles.quickIcon, accent && styles.quickIconAccent]}>
        <Feather name={icon} size={20} color={accent ? T.avatarText : T.text} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { myMomentum, fetchMyMomentum } = useMomentumStore();

  useEffect(() => {
    fetchMyMomentum();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const displayName = profile
    ? profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.display_name
    : "";

  const avatarLetter =
    (profile?.first_name?.charAt(0) || profile?.display_name?.charAt(0) || "?").toUpperCase();

  const completion = profile ? calculateCompletion(profile) : null;

  const gigsDone = myMomentum?.worker?.gig_count ?? profile?.total_gigs_completed ?? 0;
  const momentumScore = myMomentum?.worker?.score ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* Top nav bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <Feather name="x" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Profile</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.phone}>{profile?.phone}</Text>

        {/* Verified badge only */}
        {profile?.is_verified && (
          <View style={styles.verifiedBadge}>
            <Feather name="check-circle" size={12} color="#16a34a" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}
      </View>

      {/* Profile Completion Card (hidden at 100%) */}
      {completion && completion.percentage < 100 && (
        <View style={styles.completionCard}>
          <View style={styles.completionRow}>
            <Text style={styles.completionTitle}>Complete your profile</Text>
            <Text style={styles.completionPct}>{completion.percentage}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${completion.percentage}%` as any }]}
            />
          </View>
          {completion.missing.length > 0 && (
            <Text style={styles.completionMissing} numberOfLines={2}>
              Missing: {completion.missing.slice(0, 3).join(", ")}
              {completion.missing.length > 3 ? ` +${completion.missing.length - 3} more` : ""}
            </Text>
          )}
          <Pressable style={styles.completionButton} onPress={() => router.push("/(main)/edit-profile")}>
            <Text style={styles.completionButtonText}>Complete Profile →</Text>
          </Pressable>
        </View>
      )}

      {/* Stats — Gigs Done + Momentum only */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{gigsDone}</Text>
          <Text style={styles.statLabel}>Gigs Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: T.momentum }]}>{momentumScore}</Text>
          <Text style={styles.statLabel}>Momentum</Text>
        </View>
      </View>

      {/* 2×2 Quick Actions */}
      <View style={styles.quickGrid}>
        <QuickBox
          icon="edit-2"
          label="Edit Profile"
          accent
          onPress={() => router.push("/(main)/edit-profile")}
        />
        <QuickBox
          icon="award"
          label="My Badges"
          onPress={() => router.push("/(main)/badges")}
        />
        <QuickBox
          icon="settings"
          label="Settings"
        />
        <QuickBox
          icon="help-circle"
          label="Help & Support"
        />
      </View>

      {/* Secondary list — Verify Identity */}
      <View style={styles.menu}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(main)/verify-identity")}
        >
          <Feather
            name={profile?.id_verified ? "shield" : "shield-off"}
            size={20}
            color={profile?.id_verified ? "#16a34a" : T.text}
          />
          <Text style={styles.menuItemText}>Verify Identity</Text>
          {profile?.id_verified ? (
            <Text style={styles.verifiedTag}>Verified</Text>
          ) : (
            <Feather name="chevron-right" size={20} color={T.textMuted} />
          )}
        </Pressable>
      </View>

      {/* Sign Out */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Feather name="log-out" size={20} color={T.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      <Text style={styles.version}>Kria v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: T.surface,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: T.text,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: T.surface,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: T.avatarText,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: T.text,
  },
  phone: {
    fontSize: 14,
    color: T.textSub,
    marginTop: 4,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    marginTop: 10,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },

  // ── Completion card ──
  completionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: T.primary,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.text,
  },
  completionPct: {
    fontSize: 20,
    fontWeight: "bold",
    color: T.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: T.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: T.primary,
    borderRadius: 3,
  },
  completionMissing: {
    fontSize: 12,
    color: T.textMuted,
  },
  completionButton: {
    alignSelf: "flex-end",
  },
  completionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.primary,
  },

  // ── Stats ──
  stats: {
    flexDirection: "row",
    backgroundColor: T.surface,
    marginTop: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: T.text,
  },
  statLabel: {
    fontSize: 12,
    color: T.textSub,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: T.border,
  },

  // ── 2×2 Quick grid ──
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  quickBox: {
    width: "47.5%",
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
    alignItems: "flex-start",
  },
  quickBoxPressed: {
    opacity: 0.75,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  quickIconAccent: {
    backgroundColor: T.avatarBg,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text,
  },

  // ── Secondary menu ──
  menu: {
    backgroundColor: T.surface,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: T.text,
  },
  verifiedTag: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },

  // ── Footer ──
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: T.error,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: T.textMuted,
    marginTop: 20,
  },
});
