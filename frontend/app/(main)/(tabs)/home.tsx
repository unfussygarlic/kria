import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useWalletStore } from "@/stores/walletStore";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const wallet = useWalletStore((s) => s.wallet);

  const firstName = profile?.first_name || profile?.display_name || "there";
  const avatarLetter =
    (profile?.first_name?.charAt(0) || profile?.display_name?.charAt(0) || "?").toUpperCase();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: rw(32) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + rw(12) }]}>
        <View>
          <Text style={styles.appName}>Kriya</Text>
          <Text style={styles.tagline}>Your gig marketplace</Text>
        </View>

        {/* Round profile button */}
        <Pressable
          style={styles.avatarButton}
          onPress={() => router.push("/(main)/(tabs)/profile")}
        >
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </Pressable>
      </View>

      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>
          {greeting}, {firstName}!
        </Text>
        <Text style={styles.greetingSub}>Here's what's happening today.</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile?.total_gigs_completed || 0}</Text>
          <Text style={styles.statLabel}>Gigs Done</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {profile?.worker_reputation?.toFixed(1) || "—"}
          </Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={[styles.statCard, styles.statCardAccent]}>
          <Text style={[styles.statValue, { color: T.accent }]}>
            {wallet?.balance || 0}
          </Text>
          <Text style={styles.statLabel}>Momentum</Text>
        </View>
      </View>

      {/* Quick actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <Pressable
          style={[styles.actionCard, styles.actionCardPrimary]}
          onPress={() => router.push("/(main)/(tabs)/explore")}
        >
          <Feather name="compass" size={rw(28)} color={T.textInverse} />
          <Text style={[styles.actionLabel, { color: T.textInverse }]}>
            Explore Gigs
          </Text>
          <Text style={[styles.actionSub, { color: "rgba(255,255,255,0.75)" }]}>
            Find your next gig
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionCard, styles.actionCardDark]}
          onPress={() => router.push("/(main)/post")}
        >
          <Feather name="briefcase" size={rw(28)} color={T.textInverse} />
          <Text style={[styles.actionLabel, { color: T.textInverse }]}>
            Post a Gig
          </Text>
          <Text style={[styles.actionSub, { color: "rgba(255,255,255,0.6)" }]}>
            Hire someone today
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionCard, styles.actionCardMid]}
          onPress={() => router.push("/(main)/(tabs)/space")}
        >
          <Feather name="layers" size={rw(28)} color={T.text} />
          <Text style={[styles.actionLabel, { color: T.text }]}>My Space</Text>
          <Text style={[styles.actionSub, { color: T.textSub }]}>
            Your posts & events
          </Text>
        </Pressable>

        <Pressable
          style={[styles.actionCard, styles.actionCardMid]}
          onPress={() => router.push("/(main)/(tabs)/chat")}
        >
          <Feather name="message-circle" size={rw(28)} color={T.text} />
          <Text style={[styles.actionLabel, { color: T.text }]}>Messages</Text>
          <Text style={[styles.actionSub, { color: T.textSub }]}>
            Chat with employers
          </Text>
        </Pressable>
      </View>

      {/* Create event */}
      <Pressable
        style={styles.eventBanner}
        onPress={() => router.push("/(main)/event/create")}
      >
        <View>
          <Text style={styles.eventBannerTitle}>Host an Event</Text>
          <Text style={styles.eventBannerSub}>
            Create an event and post multiple gigs at once
          </Text>
        </View>
        <Feather name="calendar" size={rw(32)} color={T.primary} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: rw(20),
    paddingBottom: rw(16),
    backgroundColor: T.surface,
  },
  appName: {
    fontSize: rf(26),
    fontWeight: "800",
    color: T.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: rf(12),
    color: T.textMuted,
    marginTop: 2,
  },
  avatarButton: {
    width: rw(42),
    height: rw(42),
    borderRadius: rw(21),
    backgroundColor: T.primary100,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: T.primary200,
  },
  avatarLetter: {
    fontSize: rf(18),
    fontWeight: "700",
    color: T.primary,
  },

  // ── Greeting ──────────────────────────────────────────────────
  greetingSection: {
    paddingHorizontal: rw(20),
    paddingVertical: rw(20),
    backgroundColor: T.surface,
    borderBottomLeftRadius: rw(20),
    borderBottomRightRadius: rw(20),
    marginBottom: rw(16),
  },
  greetingText: {
    fontSize: rf(22),
    fontWeight: "700",
    color: T.text,
  },
  greetingSub: {
    fontSize: rf(14),
    color: T.textSub,
    marginTop: 4,
  },

  // ── Stats ─────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: rw(16),
    gap: rw(10),
    marginBottom: rw(24),
  },
  statCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: rw(14),
    paddingVertical: rw(14),
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: T.border,
  },
  statCardAccent: {
    borderColor: T.primary100,
    backgroundColor: T.primary50,
  },
  statValue: {
    fontSize: rf(22),
    fontWeight: "800",
    color: T.text,
  },
  statLabel: {
    fontSize: rf(11),
    color: T.textSub,
    fontWeight: "600",
  },

  // ── Quick actions ─────────────────────────────────────────────
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: T.text,
    paddingHorizontal: rw(20),
    marginBottom: rw(12),
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: rw(16),
    gap: rw(10),
    marginBottom: rw(24),
  },
  actionCard: {
    width: "47.5%",
    borderRadius: rw(16),
    padding: rw(18),
    gap: rw(8),
  },
  actionCardPrimary: {
    backgroundColor: T.primary,
  },
  actionCardDark: {
    backgroundColor: T.graphite,
  },
  actionCardMid: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  actionLabel: {
    fontSize: rf(15),
    fontWeight: "700",
  },
  actionSub: {
    fontSize: rf(12),
  },

  // ── Event banner ──────────────────────────────────────────────
  eventBanner: {
    marginHorizontal: rw(16),
    backgroundColor: T.surface,
    borderRadius: rw(16),
    padding: rw(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.primary100,
  },
  eventBannerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: T.text,
    marginBottom: 4,
  },
  eventBannerSub: {
    fontSize: rf(13),
    color: T.textSub,
    maxWidth: rw(220),
  },
});
