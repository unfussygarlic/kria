/**
 * Intro carousel — 3-slide onboarding shown to new installs BEFORE the phone
 * OTP flow. Auto-skips to /login once seen on this device.
 *
 * Redesigned 2026-08-23 for the new visual system: SHADOW-lifted icon rings,
 * TYPE tokens, S/R spacing, gradient CTA.
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
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";

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

  if (!checked) return <View style={styles.screen} />;

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.screen}>
      <View style={[styles.topBar, { paddingTop: insets.top + S.xs }]}>
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
            <View style={styles.iconStack}>
              <LinearGradient
                colors={[s.accent + "33", "transparent"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.iconGlow}
              />
              <View style={[styles.iconRing, { backgroundColor: s.accent + "18" }]}>
                <Feather name={s.icon} size={rw(48)} color={s.accent} />
              </View>
            </View>

            <View style={styles.copy}>
              <Text style={[styles.eyebrow, { color: s.accent }]}>
                {s.eyebrow.toUpperCase()}
              </Text>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.body}>{s.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + S.lg }]}>
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
          <LinearGradient
            colors={T.gradAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.ctaText}>{isLast ? "Get Started" : "Next"}</Text>
          <Feather
            name={isLast ? "arrow-right" : "chevron-right"}
            size={rw(18)}
            color="#FFFFFF"
          />
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
    paddingHorizontal: S.lg,
    paddingBottom: S.xs,
  },
  skipText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.textMuted,
    padding: 4,
  },
  slide: {
    flex: 1,
    paddingHorizontal: S.xxl,
    justifyContent: "center",
    alignItems: "center",
    gap: S.hero,
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
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.lg,
  },
  copy: {
    alignItems: "center",
    gap: S.sm,
  },
  eyebrow: {
    ...TYPE.label,
    letterSpacing: 2.4,
  },
  title: {
    ...TYPE.title1,
    fontSize: 34,
    lineHeight: 40,
    color: T.text,
    textAlign: "center",
  },
  body: {
    ...TYPE.bodyLg,
    color: T.textSub,
    textAlign: "center",
    marginTop: S.xxs,
  },
  footer: {
    paddingHorizontal: S.xl,
    gap: S.lg,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
    backgroundColor: T.surface2,
  },
  cta: {
    height: rw(56),
    borderRadius: R.chip,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    ...SHADOW.lg,
  },
  ctaText: {
    ...TYPE.title3,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});
