import { useEffect } from "react";
import { ScrollView, View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { rf, rw } from "@/constants/responsive";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const activeRole = useAuthStore((s) => s.activeRole);
  const { myMomentum, fetchMyMomentum } = useMomentumStore();

  const isFinder = activeRole === "finder";

  const firstName = profile?.first_name || profile?.display_name || "there";
  const avatarLetter =
    (profile?.first_name?.charAt(0) || profile?.display_name?.charAt(0) || "?").toUpperCase();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? L.GREETING_MORNING : hour < 17 ? L.GREETING_AFTERNOON : L.GREETING_EVENING;

  useEffect(() => {
    fetchMyMomentum();
  }, []);

  // Show role-specific momentum score
  const momentumData = isFinder ? myMomentum?.poster : myMomentum?.worker;
  const topScore = momentumData?.score ?? null;
  const topColor = momentumData?.band_color;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: rw(32) }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + rw(12) }]}>
        <View>
          <Text style={styles.appName}>{L.APP_NAME}</Text>
          <Text style={styles.tagline}>{L.TAGLINE}</Text>
        </View>
        <Pressable
          style={styles.avatarButton}
          onPress={() => router.push("/(main)/(tabs)/profile")}
        >
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </Pressable>
      </View>

      {/* ── Greeting ── */}
      <View style={styles.greetingSection}>
        <Text style={styles.greetingText}>
          {greeting}, {firstName}!
        </Text>
        <Text style={styles.greetingSub}>
          {isFinder ? L.GREETING_SUB_FINDER : L.GREETING_SUB_SEEKER}
        </Text>
      </View>

      {/* ── Momentum section ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{L.YOUR_MOMENTUM}</Text>
        <Pressable onPress={() => router.push("/(main)/(tabs)/arena")}>
          <Text style={styles.sectionLink}>{L.VIEW_DETAILS}</Text>
        </Pressable>
      </View>
      <Pressable
        style={styles.momentumCard}
        onPress={() => router.push("/(main)/(tabs)/arena")}
      >
        <LinearGradient colors={["#2B2B2B", "#111111"]} style={styles.momentumGrad}>
          <View style={styles.momentumRoleRow}>
            <Feather
              name={isFinder ? "layers" : "briefcase"}
              size={13}
              color="rgba(255,255,255,0.5)"
            />
            <Text style={styles.momentumRoleLabel}>
              {isFinder ? L.FINDER : L.SEEKER} · Score
            </Text>
          </View>
          <Text style={[styles.momentumScore, { color: topColor ?? T.accent }]}>
            {topScore ?? "—"}
          </Text>
        </LinearGradient>
      </Pressable>

      {/* ── Quick actions ── */}
      <Text style={[styles.sectionTitle, { paddingHorizontal: rw(20), marginBottom: rw(12) }]}>
        Quick Actions
      </Text>

      {isFinder ? <FinderActions /> : <SeekerActions />}

      {/* ── Create event banner — Finder only ── */}
      {isFinder && (
        <Pressable
          style={styles.eventBanner}
          onPress={() => router.push("/(main)/event/create")}
        >
          <View>
            <Text style={styles.eventBannerTitle}>{L.ACTION_HOST_EVENT}</Text>
            <Text style={styles.eventBannerSub}>{L.ACTION_HOST_EVENT_SUB}</Text>
          </View>
          <Feather name="calendar" size={rw(32)} color={T.primary} />
        </Pressable>
      )}
    </ScrollView>
  );
}

// ── Seeker quick actions ───────────────────────────────────────────────────────

function SeekerActions() {
  return (
    <View style={styles.actionsGrid}>
      <Pressable
        style={[styles.actionCard, styles.actionCardPrimary]}
        onPress={() => router.push("/(main)/(tabs)/explore")}
      >
        <Feather name="compass" size={rw(28)} color={T.textInverse} />
        <Text style={[styles.actionLabel, { color: T.textInverse }]}>{L.ACTION_EXPLORE_GIGS}</Text>
        <Text style={[styles.actionSub, { color: "rgba(255,255,255,0.75)" }]}>
          {L.ACTION_FIND_NEXT_GIG}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardMid]}
        onPress={() => router.push("/(main)/(tabs)/space")}
      >
        <Feather name="layers" size={rw(28)} color={T.text} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_MY_SPACE}</Text>
        <Text style={[styles.actionSub, { color: T.textSub }]}>
          My applications
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardAccent]}
        onPress={() => router.push("/(main)/(tabs)/arena")}
      >
        <Feather name="zap" size={rw(28)} color={T.text} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_ARENA}</Text>
        <Text style={[styles.actionSub, { color: T.textSub }]}>
          {L.ACTION_ARENA_SUB}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardDark]}
        onPress={() => router.push("/(main)/(tabs)/explore")}
      >
        <Feather name="search" size={rw(28)} color={T.textInverse} />
        <Text style={[styles.actionLabel, { color: T.textInverse }]}>Search Gigs</Text>
        <Text style={[styles.actionSub, { color: "rgba(255,255,255,0.6)" }]}>
          Filter by category
        </Text>
      </Pressable>
    </View>
  );
}

// ── Finder quick actions ───────────────────────────────────────────────────────

function FinderActions() {
  return (
    <View style={styles.actionsGrid}>
      <Pressable
        style={[styles.actionCard, styles.actionCardDark]}
        onPress={() => router.push("/(main)/post")}
      >
        <Feather name="briefcase" size={rw(28)} color={T.textInverse} />
        <Text style={[styles.actionLabel, { color: T.textInverse }]}>{L.ACTION_POST_GIG}</Text>
        <Text style={[styles.actionSub, { color: "rgba(255,255,255,0.6)" }]}>
          {L.ACTION_HIRE_TODAY}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardPrimary]}
        onPress={() => router.push("/(main)/event/create")}
      >
        <Feather name="calendar" size={rw(28)} color={T.textInverse} />
        <Text style={[styles.actionLabel, { color: T.textInverse }]}>{L.ACTION_CREATE_EVENT}</Text>
        <Text style={[styles.actionSub, { color: "rgba(255,255,255,0.75)" }]}>
          Bundle multiple gigs
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardMid]}
        onPress={() => router.push("/(main)/(tabs)/space")}
      >
        <Feather name="layers" size={rw(28)} color={T.text} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_MY_SPACE}</Text>
        <Text style={[styles.actionSub, { color: T.textSub }]}>
          {L.ACTION_MY_SPACE_SUB}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardAccent]}
        onPress={() => router.push("/(main)/(tabs)/arena")}
      >
        <Feather name="zap" size={rw(28)} color={T.text} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_ARENA}</Text>
        <Text style={[styles.actionSub, { color: T.textSub }]}>
          {L.ACTION_ARENA_SUB}
        </Text>
      </Pressable>
    </View>
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

  // ── Momentum ──────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rw(20),
    marginBottom: rw(12),
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: T.text,
  },
  sectionLink: {
    fontSize: rf(13),
    color: T.primary,
    fontWeight: "600",
  },
  momentumCard: {
    marginHorizontal: rw(16),
    borderRadius: rw(16),
    overflow: "hidden",
    marginBottom: rw(24),
  },
  momentumGrad: {
    paddingHorizontal: rw(20),
    paddingVertical: rw(14),
    alignItems: "center",
    gap: rw(4),
  },
  momentumRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  momentumRoleLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  momentumScore: {
    fontSize: rf(32),
    fontWeight: "800",
    lineHeight: rf(36),
  },

  // ── Quick actions ─────────────────────────────────────────────
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
  actionCardAccent: {
    backgroundColor: T.primary50,
    borderWidth: 1,
    borderColor: T.primary100,
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
