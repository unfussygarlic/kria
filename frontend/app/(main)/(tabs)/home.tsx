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
import { getBand } from "@/constants/momentum";
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

  const momentumData = isFinder ? myMomentum?.poster : myMomentum?.worker;
  const topScore = momentumData?.score ?? null;
  // Use frontend band colors — backend band_color reflects old theme
  const topColor = topScore != null ? getBand(topScore).color : T.primary;

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

      {/* ── Momentum card ── */}
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
        <View style={styles.momentumCardInner}>
          {/* Glow blob */}
          <View style={[styles.momentumGlow, { backgroundColor: topColor + "20" }]} />
          <View style={styles.momentumRoleRow}>
            <Feather
              name={isFinder ? "layers" : "briefcase"}
              size={13}
              color={T.textMuted}
            />
            <Text style={styles.momentumRoleLabel}>
              {isFinder ? L.FINDER : L.SEEKER} · Score
            </Text>
          </View>
          <Text style={[styles.momentumScore, { color: topColor }]}>
            {topScore ?? "—"}
          </Text>
          <View style={styles.momentumArrow}>
            <Feather name="arrow-right" size={14} color={T.textMuted} />
          </View>
        </View>
      </Pressable>

      {/* ── Quick actions ── */}
      <Text style={styles.quickActionsTitle}>Quick Actions</Text>

      {isFinder ? <FinderActions /> : <SeekerActions />}

      {/* ── Create event banner — Finder only ── */}
      {isFinder && (
        <Pressable
          style={styles.eventBanner}
          onPress={() => router.push("/(main)/event/create")}
        >
          <View style={styles.eventBannerGlow} />
          <View>
            <Text style={styles.eventBannerTitle}>{L.ACTION_HOST_EVENT}</Text>
            <Text style={styles.eventBannerSub}>{L.ACTION_HOST_EVENT_SUB}</Text>
          </View>
          <View style={styles.eventBannerIcon}>
            <Feather name="calendar" size={rw(22)} color={T.secondary} />
          </View>
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
        <LinearGradient
          colors={T.gradBrand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Feather name="compass" size={rw(26)} color="#000" />
        <Text style={[styles.actionLabel, { color: "#000" }]}>{L.ACTION_EXPLORE_GIGS}</Text>
        <Text style={[styles.actionSub, { color: "rgba(0,0,0,0.6)" }]}>
          {L.ACTION_FIND_NEXT_GIG}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardSurface]}
        onPress={() => router.push("/(main)/(tabs)/space")}
      >
        <Feather name="layers" size={rw(26)} color={T.text} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_MY_SPACE}</Text>
        <Text style={[styles.actionSub, { color: T.textMuted }]}>My applications</Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardCyan]}
        onPress={() => router.push("/(main)/(tabs)/arena")}
      >
        <View style={styles.actionCyanGlow} />
        <Feather name="zap" size={rw(26)} color={T.secondary} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_ARENA}</Text>
        <Text style={[styles.actionSub, { color: T.textMuted }]}>{L.ACTION_ARENA_SUB}</Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardElevated]}
        onPress={() => router.push("/(main)/(tabs)/explore")}
      >
        <Feather name="search" size={rw(26)} color={T.textSub} />
        <Text style={[styles.actionLabel, { color: T.text }]}>Search Gigs</Text>
        <Text style={[styles.actionSub, { color: T.textMuted }]}>Filter by category</Text>
      </Pressable>
    </View>
  );
}

// ── Finder quick actions ───────────────────────────────────────────────────────

function FinderActions() {
  return (
    <View style={styles.actionsGrid}>
      <Pressable
        style={[styles.actionCard, styles.actionCardPrimary]}
        onPress={() => router.push("/(main)/post")}
      >
        <LinearGradient
          colors={T.gradBrand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Feather name="briefcase" size={rw(26)} color="#000" />
        <Text style={[styles.actionLabel, { color: "#000" }]}>{L.ACTION_POST_GIG}</Text>
        <Text style={[styles.actionSub, { color: "rgba(0,0,0,0.6)" }]}>
          {L.ACTION_HIRE_TODAY}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardCyan]}
        onPress={() => router.push("/(main)/event/create")}
      >
        <View style={styles.actionCyanGlow} />
        <Feather name="calendar" size={rw(26)} color={T.secondary} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_CREATE_EVENT}</Text>
        <Text style={[styles.actionSub, { color: T.textMuted }]}>Bundle multiple gigs</Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardSurface]}
        onPress={() => router.push("/(main)/(tabs)/space")}
      >
        <Feather name="layers" size={rw(26)} color={T.text} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_MY_SPACE}</Text>
        <Text style={[styles.actionSub, { color: T.textMuted }]}>{L.ACTION_MY_SPACE_SUB}</Text>
      </Pressable>

      <Pressable
        style={[styles.actionCard, styles.actionCardElevated]}
        onPress={() => router.push("/(main)/(tabs)/arena")}
      >
        <Feather name="zap" size={rw(26)} color={T.textSub} />
        <Text style={[styles.actionLabel, { color: T.text }]}>{L.ACTION_ARENA}</Text>
        <Text style={[styles.actionSub, { color: T.textMuted }]}>{L.ACTION_ARENA_SUB}</Text>
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
    backgroundColor: T.surface1,
  },
  appName: {
    fontSize: rf(26),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
    letterSpacing: -0.3,
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
    backgroundColor: "rgba(212,255,0,0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(212,255,0,0.28)",
  },
  avatarLetter: {
    fontSize: rf(17),
    fontWeight: "700",
    color: T.primary,
  },

  // ── Greeting ──────────────────────────────────────────────────
  greetingSection: {
    paddingHorizontal: rw(20),
    paddingVertical: rw(20),
    backgroundColor: T.surface1,
    borderBottomLeftRadius: rw(20),
    borderBottomRightRadius: rw(20),
    marginBottom: rw(20),
  },
  greetingText: {
    fontSize: rf(22),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  greetingSub: {
    fontSize: rf(14),
    color: T.textMuted,
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
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    letterSpacing: 0.2,
  },
  sectionLink: {
    fontSize: rf(13),
    color: T.primary,
    fontWeight: "600",
  },
  momentumCard: {
    marginHorizontal: rw(16),
    borderRadius: rw(18),
    overflow: "hidden",
    marginBottom: rw(24),
  },
  momentumCardInner: {
    backgroundColor: T.surface1,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: rw(20),
    paddingVertical: rw(18),
    alignItems: "center",
    gap: rw(4),
    overflow: "hidden",
  },
  momentumGlow: {
    position: "absolute",
    top: -rw(20),
    left: "50%",
    width: rw(120),
    height: rw(120),
    borderRadius: rw(60),
    marginLeft: -rw(60),
  },
  momentumRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  momentumRoleLabel: {
    fontSize: rf(11),
    fontWeight: "600",
    color: T.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  momentumScore: {
    fontSize: rf(36),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    lineHeight: rf(42),
  },
  momentumArrow: {
    marginTop: rw(4),
  },

  // ── Quick actions ─────────────────────────────────────────────
  quickActionsTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    paddingHorizontal: rw(20),
    marginBottom: rw(12),
    letterSpacing: 0.2,
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
    overflow: "hidden",
  },
  // Violet gradient (featured)
  actionCardPrimary: {
    backgroundColor: T.primaryContainer,
  },
  // Surface card (default)
  actionCardSurface: {
    backgroundColor: T.surface1,
    borderWidth: 1,
    borderColor: T.border,
  },
  // Cobalt-tinted card (Arena/Event)
  actionCardCyan: {
    backgroundColor: T.surface1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  actionCyanGlow: {
    position: "absolute",
    top: -rw(20),
    right: -rw(20),
    width: rw(80),
    height: rw(80),
    borderRadius: rw(40),
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  // Elevated dark card
  actionCardElevated: {
    backgroundColor: T.surface2,
    borderWidth: 1,
    borderColor: T.border,
  },
  actionLabel: {
    fontSize: rf(14),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  actionSub: {
    fontSize: rf(12),
    lineHeight: rf(16),
  },

  // ── Event banner ──────────────────────────────────────────────
  eventBanner: {
    marginHorizontal: rw(16),
    backgroundColor: T.surface1,
    borderRadius: rw(16),
    padding: rw(20),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  eventBannerGlow: {
    position: "absolute",
    top: -rw(20),
    right: rw(20),
    width: rw(80),
    height: rw(80),
    borderRadius: rw(40),
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  eventBannerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    marginBottom: 4,
  },
  eventBannerSub: {
    fontSize: rf(13),
    color: T.textMuted,
    maxWidth: rw(220),
    lineHeight: rf(18),
  },
  eventBannerIcon: {
    width: rw(46),
    height: rw(46),
    borderRadius: rw(12),
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
});
