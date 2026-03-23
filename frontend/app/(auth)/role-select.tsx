import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { rf, rw } from "@/constants/responsive";

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const setActiveRole = useAuthStore((s) => s.setActiveRole);

  const handleSelect = (role: "seeker" | "finder") => {
    setActiveRole(role);
    router.replace("/(main)/(tabs)/home");
  };

  return (
    <LinearGradient
      colors={T.gradDark}
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + rw(24) }]}
    >
      {/* ── App wordmark ── */}
      <View style={styles.top}>
        <Text style={styles.appName}>{L.APP_NAME}</Text>
        <Text style={styles.title}>{L.ROLE_SELECT_TITLE}</Text>
        <Text style={styles.sub}>{L.ROLE_SELECT_SUB}</Text>
      </View>

      {/* ── Role cards ── */}
      <View style={styles.cards}>
        {/* Seeker */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.cardSeeker, pressed && styles.cardPressed]}
          onPress={() => handleSelect("seeker")}
        >
          <View style={styles.iconWrap}>
            <Feather name="briefcase" size={rw(36)} color={T.textInverse} />
          </View>
          <Text style={styles.cardRole}>{L.SEEKER}</Text>
          <Text style={styles.cardTagline}>{L.SEEKER_TAGLINE}</Text>
          <View style={styles.cardCta}>
            <Text style={styles.cardCtaText}>Enter as {L.SEEKER}</Text>
            <Feather name="arrow-right" size={rw(16)} color={T.textInverse} />
          </View>
        </Pressable>

        {/* Finder */}
        <Pressable
          style={({ pressed }) => [styles.card, styles.cardFinder, pressed && styles.cardPressed]}
          onPress={() => handleSelect("finder")}
        >
          <View style={[styles.iconWrap, styles.iconWrapDark]}>
            <Feather name="layers" size={rw(36)} color={T.textInverse} />
          </View>
          <Text style={styles.cardRole}>{L.FINDER}</Text>
          <Text style={[styles.cardTagline, styles.cardTaglineDark]}>{L.FINDER_TAGLINE}</Text>
          <View style={[styles.cardCta, styles.cardCtaDark]}>
            <Text style={styles.cardCtaText}>Enter as {L.FINDER}</Text>
            <Feather name="arrow-right" size={rw(16)} color={T.textInverse} />
          </View>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: rw(24),
    justifyContent: "space-between",
  },

  // ── Top ──────────────────────────────────────────────────────────────────
  top: {
    paddingTop: rw(48),
    gap: rw(10),
  },
  appName: {
    fontSize: rf(32),
    fontWeight: "800",
    color: T.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: rf(22),
    fontWeight: "700",
    color: T.textInverse,
    lineHeight: rf(30),
    marginTop: rw(4),
  },
  sub: {
    fontSize: rf(13),
    color: "rgba(255,255,255,0.45)",
  },

  // ── Cards ────────────────────────────────────────────────────────────────
  cards: {
    gap: rw(16),
    paddingBottom: rw(8),
  },
  card: {
    borderRadius: rw(20),
    padding: rw(24),
    gap: rw(8),
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardSeeker: {
    backgroundColor: T.primary,
  },
  cardFinder: {
    backgroundColor: "#2B2B2B",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  iconWrap: {
    width: rw(60),
    height: rw(60),
    borderRadius: rw(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: rw(4),
  },
  iconWrapDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardRole: {
    fontSize: rf(24),
    fontWeight: "800",
    color: T.textInverse,
  },
  cardTagline: {
    fontSize: rf(14),
    color: "rgba(255,255,255,0.8)",
    lineHeight: rf(20),
  },
  cardTaglineDark: {
    color: "rgba(255,255,255,0.55)",
  },
  cardCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    marginTop: rw(8),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "flex-start",
    paddingHorizontal: rw(14),
    paddingVertical: rw(8),
    borderRadius: rw(10),
  },
  cardCtaDark: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cardCtaText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: T.textInverse,
  },
});
