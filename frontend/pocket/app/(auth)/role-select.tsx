/**
 * Role select — currently redirects straight to Runner since the Host mobile
 * experience is disabled. Kept as a dedicated screen so we can re-enable the
 * Host card without touching auth flow.
 *
 * Redesigned 2026-08-23: Runner card uses gradient hero + SHADOW; Host card
 * uses a solid surface with primary accent.
 */

import { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { L } from "@/constants/labels";
import { rw } from "@/constants/responsive";

const SHOW_HOST_ROLE = false;

export default function RoleSelectScreen() {
  const insets = useSafeAreaInsets();
  const setActiveRole = useAuthStore((s) => s.setActiveRole);

  useEffect(() => {
    if (!SHOW_HOST_ROLE) {
      setActiveRole("runner");
      router.replace("/(main)/(tabs)/home");
    }
  }, []);

  const handleSelect = (role: "runner" | "host") => {
    setActiveRole(role);
    router.replace("/(main)/(tabs)/home");
  };

  return (
    <View
      style={[
        styles.screen,
        { paddingTop: insets.top + S.xs, paddingBottom: insets.bottom + S.lg },
      ]}
    >
      <View style={styles.top}>
        <Text style={styles.appName}>{L.APP_NAME}</Text>
        <Text style={styles.title}>{L.ROLE_SELECT_TITLE}</Text>
        <Text style={styles.sub}>{L.ROLE_SELECT_SUB}</Text>
      </View>

      <View style={styles.cards}>
        {/* Runner — brand gradient */}
        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => handleSelect("runner")}
        >
          <LinearGradient
            colors={T.gradAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardBody}
          >
            <View style={styles.iconWrapLight}>
              <Feather name="briefcase" size={rw(32)} color="#FFFFFF" />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardRoleLight}>{L.RUNNER}</Text>
              <Text style={styles.cardTaglineLight}>{L.RUNNER_TAGLINE}</Text>
            </View>
            <View style={styles.cardCtaLight}>
              <Text style={styles.cardCtaTextLight}>Enter as {L.RUNNER}</Text>
              <Feather name="arrow-right" size={rw(15)} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Pressable>

        {/* Host — subdued surface card (kept for when the mobile Host experience returns) */}
        {SHOW_HOST_ROLE && (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => handleSelect("host")}
          >
            <View style={styles.cardBodyHost}>
              <View style={styles.iconWrapHost}>
                <Feather name="layers" size={rw(32)} color={T.secondary} />
              </View>
              <View style={styles.cardCopy}>
                <Text style={styles.cardRole}>{L.HOST}</Text>
                <Text style={styles.cardTagline}>{L.HOST_TAGLINE}</Text>
              </View>
              <View style={styles.cardCtaHost}>
                <Text style={[styles.cardCtaText, { color: T.secondary }]}>Enter as {L.HOST}</Text>
                <Feather name="arrow-right" size={rw(15)} color={T.secondary} />
              </View>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
    paddingHorizontal: S.lg,
    justifyContent: "space-between",
  },

  top: {
    paddingTop: S.hero,
    gap: S.sm,
  },
  appName: {
    ...TYPE.title1,
    fontSize: 34,
    color: T.primary,
    letterSpacing: -0.5,
  },
  title: {
    ...TYPE.title2,
    color: T.text,
    marginTop: S.xxs,
  },
  sub: {
    ...TYPE.body,
    color: T.textMuted,
  },

  cards: {
    gap: S.sm,
    paddingBottom: S.xs,
  },
  card: {
    borderRadius: R.hero,
    overflow: "hidden",
    ...SHADOW.lg,
  },
  cardPressed: {
    opacity: 0.9,
  },

  cardBody: {
    padding: S.xl,
    gap: S.sm,
    overflow: "hidden",
  },
  cardBodyHost: {
    backgroundColor: T.surface1,
    padding: S.xl,
    gap: S.sm,
  },

  iconWrapLight: {
    width: rw(56),
    height: rw(56),
    borderRadius: R.thumb,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapHost: {
    width: rw(56),
    height: rw(56),
    borderRadius: R.thumb,
    backgroundColor: T.secondary + "18",
    justifyContent: "center",
    alignItems: "center",
  },

  cardCopy: {
    gap: 4,
  },
  cardRole: {
    ...TYPE.title2,
    color: T.text,
  },
  cardRoleLight: {
    ...TYPE.title2,
    color: "#FFFFFF",
  },
  cardTagline: {
    ...TYPE.body,
    color: T.textSub,
  },
  cardTaglineLight: {
    ...TYPE.body,
    color: "rgba(255,255,255,0.85)",
  },

  cardCtaLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignSelf: "flex-start",
    paddingHorizontal: S.md,
    paddingVertical: 9,
    borderRadius: R.button,
  },
  cardCtaTextLight: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardCtaHost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.secondary + "18",
    alignSelf: "flex-start",
    paddingHorizontal: S.md,
    paddingVertical: 9,
    borderRadius: R.button,
  },
  cardCtaText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
