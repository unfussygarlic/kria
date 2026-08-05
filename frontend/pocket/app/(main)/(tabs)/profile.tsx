import { useEffect } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Share } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
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

  const handleShareProfile = async () => {
    if (!profile) return;
    // public_slug is backfilled at migration time (0032), so this should
    // always be set for anyone who's completed onboarding. Falls back to
    // the raw user id if it isn't for any reason.
    const slug = profile.public_slug ?? profile.id;
    const url = `https://trykria.com/p/${slug}`;
    const name = profile.first_name || profile.display_name || "This runner";
    await Share.share({
      message: `${name} on Kria — verified gig worker. See their profile: ${url}`,
      url,
    });
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: rw(48) }}>
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

        {/* Verified badge */}
        {profile?.is_verified && (
          <View style={styles.verifiedBadge}>
            <Feather name="check-circle" size={12} color="#16a34a" />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        )}

        {/* Bio */}
        {profile?.bio ? (
          <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
        ) : null}

        {/* Skills chips (top 5) */}
        {profile?.skills && profile.skills.length > 0 && (
          <View style={styles.skillRow}>
            {profile.skills.slice(0, 5).map((skill) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill.replace(/_/g, " ")}</Text>
              </View>
            ))}
            {profile.skills.length > 5 && (
              <View style={styles.skillChip}>
                <Text style={styles.skillChipText}>+{profile.skills.length - 5}</Text>
              </View>
            )}
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

      {/* Stats — Gigs Done + Momentum + Streak */}
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
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <View style={styles.streakStatRow}>
            {(profile?.streak_count ?? 0) > 0 && <Text style={styles.streakStatEmoji}>🔥</Text>}
            <Text style={[styles.statValue, { color: "#FFC83D" }]}>{profile?.streak_count ?? 0}</Text>
          </View>
          <Text style={styles.statLabel}>Day Streak</Text>
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
          icon="share-2"
          label="Share Profile"
          onPress={handleShareProfile}
        />
        <QuickBox
          icon="award"
          label="My Badges"
          onPress={() => router.push("/(main)/badges")}
        />
        <QuickBox
          icon="settings"
          label="Settings"
          onPress={() => router.push("/(main)/settings")}
        />
      </View>

      {/* Secondary list — Verify Identity */}
      <View style={styles.menu}>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push("/(main)/verify-identity")}
        >
          <Feather
            name={(profile?.verified_id_types ?? []).length > 0 ? "shield" : "shield-off"}
            size={20}
            color={(profile?.verified_id_types ?? []).length > 0 ? T.success : T.text}
          />
          <Text style={styles.menuItemText}>Verify Identity</Text>
          {(profile?.verified_id_types ?? []).length > 0 ? (
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
    paddingHorizontal: rw(16),
    paddingBottom: rw(12),
    backgroundColor: T.surface,
  },
  closeButton: {
    width: rw(34),
    height: rw(34),
    borderRadius: rw(17),
    backgroundColor: T.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: rf(17),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
  },

  // ── Header ──
  header: {
    alignItems: "center",
    paddingTop: rw(20),
    paddingBottom: rw(24),
    backgroundColor: T.surface,
  },
  avatarContainer: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(40),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: rw(12),
  },
  avatarText: {
    fontSize: rf(32),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.avatarText,
  },
  name: {
    fontSize: rf(24),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  phone: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    marginTop: rw(4),
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(10),
    paddingVertical: rw(4),
    borderRadius: rw(12),
    backgroundColor: "#DCFCE7",
    marginTop: rw(10),
  },
  verifiedText: {
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#16a34a",
  },
  bio: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    textAlign: "center",
    lineHeight: rf(19),
    marginTop: rw(14),
    paddingHorizontal: rw(28),
  },
  skillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: rw(6),
    marginTop: rw(14),
    paddingHorizontal: rw(24),
  },
  skillChip: {
    paddingHorizontal: rw(10),
    paddingVertical: rw(4),
    borderRadius: rw(999),
    backgroundColor: T.surface2,
    borderWidth: 1,
    borderColor: T.border,
  },
  skillChipText: {
    fontSize: rf(11),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
    letterSpacing: 0.2,
  },
  streakStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(3),
  },
  streakStatEmoji: {
    fontSize: rf(18),
  },

  // ── Completion card ──
  completionCard: {
    marginHorizontal: rw(16),
    marginTop: rw(12),
    backgroundColor: T.surface,
    borderRadius: rw(16),
    padding: rw(16),
    gap: rw(10),
    borderWidth: 1,
    borderColor: T.primary,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  completionPct: {
    fontSize: rf(20),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
  },
  progressTrack: {
    height: rw(6),
    backgroundColor: T.border,
    borderRadius: rw(3),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: T.primary,
    borderRadius: rw(3),
  },
  completionMissing: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
  },
  completionButton: {
    alignSelf: "flex-end",
  },
  completionButtonText: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
  },

  // ── Stats ──
  stats: {
    flexDirection: "row",
    backgroundColor: T.surface,
    marginTop: rw(8),
    paddingVertical: rw(20),
    paddingHorizontal: rw(16),
  },
  stat: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: rf(24),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  statLabel: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    marginTop: rw(4),
  },
  statDivider: {
    width: 1,
    backgroundColor: T.border,
  },

  // ── 2×2 Quick grid ──
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(10),
    marginHorizontal: rw(16),
    marginTop: rw(16),
  },
  quickBox: {
    width: "47.5%",
    backgroundColor: T.surface,
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    paddingVertical: rw(20),
    paddingHorizontal: rw(16),
    gap: rw(12),
    alignItems: "flex-start",
  },
  quickBoxPressed: {
    opacity: 0.75,
  },
  quickIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(12),
    backgroundColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  quickIconAccent: {
    backgroundColor: T.avatarBg,
  },
  quickLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
  },

  // ── Secondary menu ──
  menu: {
    backgroundColor: T.surface,
    marginTop: rw(16),
    marginHorizontal: rw(16),
    borderRadius: rw(16),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: T.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(16),
    paddingVertical: rw(16),
    gap: rw(12),
  },
  menuItemText: {
    flex: 1,
    fontSize: rf(16),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
  },
  verifiedTag: {
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "#16a34a",
  },

  // ── Footer ──
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rw(8),
    marginTop: rw(16),
    marginHorizontal: rw(16),
    paddingVertical: rw(16),
    borderRadius: rw(16),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.error,
  },
  signOutText: {
    fontSize: rf(16),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.error,
  },
  version: {
    textAlign: "center",
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
    marginTop: rw(20),
  },
});
