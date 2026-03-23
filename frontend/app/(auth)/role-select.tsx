import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
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
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + rw(8), paddingBottom: insets.bottom + rw(24) },
      ]}
    >
      {/* ── App wordmark ── */}
      <View style={styles.top}>
        <Text style={styles.appName}>{L.APP_NAME}</Text>
        <Text style={styles.title}>{L.ROLE_SELECT_TITLE}</Text>
        <Text style={styles.sub}>{L.ROLE_SELECT_SUB}</Text>
      </View>

      {/* ── Role cards ── */}
      <View style={styles.cards}>

        {/* Seeker — electric lime */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => handleSelect("seeker")}
        >
          <View style={styles.cardLime}>
            <View style={[styles.iconWrap, styles.iconWrapLime]}>
              <Feather name="briefcase" size={rw(32)} color="#000" />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.cardRole, styles.cardRoleDark]}>{L.SEEKER}</Text>
              <Text style={[styles.cardTagline, styles.cardTaglineDark]}>{L.SEEKER_TAGLINE}</Text>
            </View>
            <View style={[styles.cardCta, styles.cardCtaLime]}>
              <Text style={[styles.cardCtaText, { color: "#000" }]}>Enter as {L.SEEKER}</Text>
              <Feather name="arrow-right" size={rw(15)} color="#000" />
            </View>
          </View>
        </Pressable>

        {/* Finder — glass surface with white accent */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => handleSelect("finder")}
        >
          <View style={styles.cardGlass}>
            {/* Cobalt glow at top-right */}
            <View style={styles.cardGlowAccent} />
            <View style={[styles.iconWrap, styles.iconWrapGlass]}>
              <Feather name="layers" size={rw(32)} color={T.secondary} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardRole}>{L.FINDER}</Text>
              <Text style={[styles.cardTagline, styles.cardTaglineGlass]}>{L.FINDER_TAGLINE}</Text>
            </View>
            <View style={[styles.cardCta, styles.cardCtaGlass]}>
              <Text style={[styles.cardCtaText, { color: T.secondary }]}>Enter as {L.FINDER}</Text>
              <Feather name="arrow-right" size={rw(15)} color={T.secondary} />
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
    paddingHorizontal: rw(20),
    justifyContent: "space-between",
  },

  // ── Top ──────────────────────────────────────────────────────────────────
  top: {
    paddingTop: rw(40),
    gap: rw(10),
  },
  appName: {
    fontSize: rf(34),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.primary,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: rf(22),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: rf(30),
    marginTop: rw(4),
  },
  sub: {
    fontSize: rf(14),
    color: T.textMuted,
    lineHeight: rf(20),
  },

  // ── Cards ────────────────────────────────────────────────────────────────
  cards: {
    gap: rw(14),
    paddingBottom: rw(8),
  },
  card: {
    borderRadius: rw(20),
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.88,
  },

  // Lime card (Seeker)
  cardLime: {
    backgroundColor: T.primary,
    padding: rw(24),
    gap: rw(12),
    overflow: "hidden",
  },

  // Glass card (Finder)
  cardGlass: {
    backgroundColor: T.surface1,
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(24),
    gap: rw(12),
    overflow: "hidden",
  },
  cardGlowAccent: {
    position: "absolute",
    top: -rw(30),
    right: -rw(30),
    width: rw(100),
    height: rw(100),
    borderRadius: rw(50),
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  iconWrap: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(14),
    backgroundColor: "rgba(0,0,0,0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapLime: {
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  iconWrapGlass: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  cardBody: {
    gap: rw(4),
  },
  cardRole: {
    fontSize: rf(24),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#fff",
  },
  cardRoleDark: {
    color: "#000",
  },
  cardTagline: {
    fontSize: rf(14),
    color: "rgba(255,255,255,0.75)",
    lineHeight: rf(20),
  },
  cardTaglineDark: {
    color: "rgba(0,0,0,0.65)",
  },
  cardTaglineGlass: {
    color: T.textMuted,
  },

  cardCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    backgroundColor: "rgba(0,0,0,0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: rw(14),
    paddingVertical: rw(9),
    borderRadius: rw(10),
  },
  cardCtaLime: {
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  cardCtaGlass: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardCtaText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
  },
});
