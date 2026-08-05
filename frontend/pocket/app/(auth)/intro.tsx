/**
 * Intro carousel — 3-slide onboarding shown to new installs BEFORE the phone
 * OTP flow. Explains what Kria is, how earning works, and what verification
 * unlocks. Auto-skips to /login once a user has seen it (SecureStore flag).
 *
 * Fires once per install. Skip button + swipe-through both mark seen so the
 * runner never sees this again after finishing it.
 */

import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";

const { width: SCREEN_W } = Dimensions.get("window");
const SEEN_KEY = "intro_seen_v1";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
};

const SLIDES: Slide[] = [
  {
    eyebrow: "Welcome to Kria",
    title: "Real gigs.\nFast money.",
    body: "Swipe on paid gigs near you — events, catering, promos, hospitality. Apply in a tap, work the shift, get paid.",
    icon: "zap",
    accent: T.primary,
  },
  {
    eyebrow: "You're the standard",
    title: "Build your Momentum.",
    body: "Every gig you show up for earns Momentum — a portable trust score hosts use to hire. Show up, get better gigs.",
    icon: "trending-up",
    accent: "#FFC83D",
  },
  {
    eyebrow: "One-time",
    title: "Verify once,\nget hired faster.",
    body: "Verified runners land more gigs and better pay. Aadhaar or Passport — takes 30 seconds.",
    icon: "shield",
    accent: "#8097ff",
  },
];

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Auto-skip if the user has already been through this on this device.
  useEffect(() => {
    SecureStore.getItemAsync(SEEN_KEY)
      .then((seen) => {
        if (seen) router.replace("/(auth)/login");
        else setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const finish = async () => {
    try {
      await SecureStore.setItemAsync(SEEN_KEY, "1");
    } catch {
      // Non-fatal — worst case the user sees the intro again next launch.
    }
    router.replace("/(auth)/login");
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * SCREEN_W, animated: true });
    } else {
      finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  // Hide until the SecureStore check completes so we don't flash then redirect.
  if (!checked) return <View style={styles.screen} />;

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      {/* Skip top-right */}
      <View style={[styles.topBar, { paddingTop: insets.top + rw(8) }]}>
        <Pressable onPress={finish} hitSlop={10}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_W }]}>
            {/* Big colored icon */}
            <View style={styles.iconStack}>
              <LinearGradient
                colors={[s.accent + "44", "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.iconGlow}
              />
              <View style={[styles.iconRing, { borderColor: s.accent + "55" }]}>
                <Feather name={s.icon} size={rw(48)} color={s.accent} />
              </View>
            </View>

            {/* Copy */}
            <View style={styles.copy}>
              <Text style={[styles.eyebrow, { color: s.accent }]}>{s.eyebrow.toUpperCase()}</Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots + CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + rw(20) }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && { width: rw(24), backgroundColor: T.primary },
              ]}
            />
          ))}
        </View>
        <Pressable style={styles.cta} onPress={handleNext}>
          <LinearGradient colors={T.gradBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Text style={styles.ctaText}>{isLast ? "Get Started" : "Next"}</Text>
          <Feather name={isLast ? "arrow-right" : "chevron-right"} size={rw(18)} color="#0e0e0e" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: rw(20),
    paddingBottom: rw(8),
  },
  skipText: {
    fontSize: rf(14),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
    padding: rw(4),
  },
  slide: {
    flex: 1,
    paddingHorizontal: rw(32),
    justifyContent: "center",
    alignItems: "center",
    gap: rw(40),
  },
  iconStack: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconGlow: {
    position: "absolute",
    width: rw(280),
    height: rw(280),
    borderRadius: rw(140),
  },
  iconRing: {
    width: rw(120),
    height: rw(120),
    borderRadius: rw(60),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(19,19,19,0.6)",
  },
  copy: {
    alignItems: "center",
    gap: rw(10),
  },
  eyebrow: {
    fontSize: rf(11),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 2.4,
  },
  title: {
    fontSize: rf(34),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    textAlign: "center",
    lineHeight: rf(40),
    letterSpacing: -0.5,
  },
  body: {
    fontSize: rf(15),
    fontWeight: "400",
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    textAlign: "center",
    lineHeight: rf(22),
    marginTop: rw(4),
  },
  footer: {
    paddingHorizontal: rw(24),
    gap: rw(20),
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: rw(6),
  },
  dot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cta: {
    height: rw(54),
    borderRadius: rw(999),
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: rw(6),
  },
  ctaText: {
    fontSize: rf(16),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#0e0e0e",
    letterSpacing: 0.3,
  },
});
