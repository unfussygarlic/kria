import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";
import { Colors } from "@/constants/colors";
import { calculateCompletion } from "@/lib/profileCompletion";

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const wallet = useWalletStore((s) => s.wallet);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const displayName = profile
    ? profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.display_name
    : "";

  const avatarLetter =
    (profile?.first_name?.charAt(0) || profile?.display_name?.charAt(0) || "?").toUpperCase();

  const completion = profile ? calculateCompletion(profile) : null;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{avatarLetter}</Text>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.phone}>{profile?.phone}</Text>

        {/* Badges */}
        <View style={styles.badges}>
          {profile?.is_student && (
            <View style={styles.badge}>
              <Feather name="book" size={12} color={Colors.primary.DEFAULT} />
              <Text style={styles.badgeText}>Student</Text>
            </View>
          )}
          {profile?.is_verified && (
            <View style={[styles.badge, styles.verifiedBadge]}>
              <Feather name="check-circle" size={12} color={Colors.success} />
              <Text style={[styles.badgeText, { color: Colors.success }]}>
                Verified
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Profile Completion Card (hidden at 100%) */}
      {completion && completion.percentage < 100 && (
        <View style={styles.completionCard}>
          <View style={styles.completionRow}>
            <Text style={styles.completionTitle}>Complete your profile</Text>
            <Text style={styles.completionPct}>{completion.percentage}%</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${completion.percentage}%` as any },
              ]}
            />
          </View>

          {completion.missing.length > 0 && (
            <Text style={styles.completionMissing} numberOfLines={2}>
              Missing: {completion.missing.slice(0, 3).join(", ")}
              {completion.missing.length > 3
                ? ` +${completion.missing.length - 3} more`
                : ""}
            </Text>
          )}

          <Pressable
            style={styles.completionButton}
            onPress={() => router.push("/(main)/edit-profile")}
          >
            <Text style={styles.completionButtonText}>Complete Profile →</Text>
          </Pressable>
        </View>
      )}

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile?.total_gigs_completed || 0}
          </Text>
          <Text style={styles.statLabel}>Gigs Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {profile?.worker_reputation?.toFixed(1) || "-"}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: Colors.momentum.DEFAULT }]}>
            {wallet?.balance || 0}
          </Text>
          <Text style={styles.statLabel}>Momentum</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(main)/wallet")}
        >
          <Feather name="zap" size={20} color={Colors.text.primary} />
          <Text style={styles.menuItemText}>Momentum Wallet</Text>
          <Feather name="chevron-right" size={20} color={Colors.text.muted} />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Feather name="award" size={20} color={Colors.text.primary} />
          <Text style={styles.menuItemText}>My Badges</Text>
          <Feather name="chevron-right" size={20} color={Colors.text.muted} />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Feather name="clock" size={20} color={Colors.text.primary} />
          <Text style={styles.menuItemText}>Gig History</Text>
          <Feather name="chevron-right" size={20} color={Colors.text.muted} />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(main)/edit-profile")}
        >
          <Feather name="edit-2" size={20} color={Colors.text.primary} />
          <Text style={styles.menuItemText}>Edit Profile</Text>
          <Feather name="chevron-right" size={20} color={Colors.text.muted} />
        </Pressable>

        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(main)/verify-identity")}
        >
          <Feather
            name={profile?.id_verified ? "shield" : "shield-off"}
            size={20}
            color={profile?.id_verified ? Colors.success : Colors.text.primary}
          />
          <Text style={styles.menuItemText}>Verify Identity</Text>
          {profile?.id_verified ? (
            <Text style={styles.verifiedTag}>Verified</Text>
          ) : (
            <Feather name="chevron-right" size={20} color={Colors.text.muted} />
          )}
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Feather name="settings" size={20} color={Colors.text.primary} />
          <Text style={styles.menuItemText}>Settings</Text>
          <Feather name="chevron-right" size={20} color={Colors.text.muted} />
        </Pressable>

        <Pressable style={styles.menuItem}>
          <Feather name="help-circle" size={20} color={Colors.text.primary} />
          <Text style={styles.menuItemText}>Help & Support</Text>
          <Feather name="chevron-right" size={20} color={Colors.text.muted} />
        </Pressable>
      </View>

      {/* Sign Out */}
      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Feather name="log-out" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </Pressable>

      {/* App Version */}
      <Text style={styles.version}>Kriya v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: Colors.surface,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary.DEFAULT,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  phone: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: Colors.primary[50],
  },
  verifiedBadge: {
    backgroundColor: "#DCFCE7",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary.DEFAULT,
  },

  // ── Completion card ──────────────────────────────────────────
  completionCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.primary[100],
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  completionPct: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary.DEFAULT,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary.DEFAULT,
    borderRadius: 3,
  },
  completionMissing: {
    fontSize: 12,
    color: Colors.text.muted,
  },
  completionButton: {
    alignSelf: "flex-end",
  },
  completionButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary.DEFAULT,
  },

  // ── Stats ────────────────────────────────────────────────────
  stats: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
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
    color: Colors.text.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },

  // ── Menu ─────────────────────────────────────────────────────
  menu: {
    backgroundColor: Colors.surface,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text.primary,
  },
  verifiedTag: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.success,
  },

  // ── Footer ───────────────────────────────────────────────────
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.error,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.text.muted,
    marginTop: 24,
    marginBottom: 32,
  },
});
