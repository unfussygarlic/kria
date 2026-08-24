/**
 * GrowthNudge — dynamic "next unlock" prompt on Pocket Home.
 *
 * Replaces empty space with an actionable next step. Only ONE nudge shows
 * at a time (top priority wins) so we never clutter Home with a list of
 * TODOs — that's what the profile screen is for.
 *
 * Priority order (highest first):
 *   1. Verify ID       — biggest signal to hosts, unlocks ID-verified badge
 *   2. Complete profile — bio + skills; bumps profile completion + Momentum
 *   3. Momentum band   — "N pts to Trusted" when close to a band threshold
 *   4. Streak          — "Keep your streak alive" when streak >= 3
 *
 * If none of the above fires, the component returns null and Home hides
 * the section entirely — no empty rectangle.
 */
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { PressableScale } from "@/components/ui/PressableScale";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type NudgeKind = "verify_id" | "profile" | "band" | "streak";

interface NudgeSpec {
  kind: NudgeKind;
  icon: keyof typeof Feather.glyphMap;
  accent: string;
  eyebrow: string;
  title: string;
  sub: string;
  target: string;
}

const BAND_THRESHOLDS = [
  { min: 0,   max: 99,   label: "Newcomer", color: "#777575", next: 100 },
  { min: 100, max: 299,  label: "Building", color: "#ff7351", next: 300 },
  { min: 300, max: 499,  label: "Reliable", color: "#8097ff", next: 500 },
  { min: 500, max: 699,  label: "Trusted",  color: "#FFC83D", next: 700 },
  { min: 700, max: 899,  label: "Elite",    color: "#D4FF00", next: 900 },
  { min: 900, max: 1000, label: "Legend",   color: "#ffffff", next: null },
] as const;

const NEXT_BAND_DISTANCE = 150;

interface Props {
  profile: Profile | null;
  momentumScore: number | null;
  streakCount: number;
}

export function GrowthNudge({ profile, momentumScore, streakCount }: Props) {
  const spec = pickNudge(profile, momentumScore, streakCount);
  if (!spec) return null;

  return (
    <PressableScale onPress={() => router.push(spec.target as never)} scale={0.98}>
      <View style={styles.card}>
        <View style={[styles.iconRing, { backgroundColor: spec.accent + "18", borderColor: spec.accent + "44" }]}>
          <Feather name={spec.icon} size={rw(20)} color={spec.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.eyebrow, { color: spec.accent }]}>{spec.eyebrow}</Text>
          <Text style={styles.title}>{spec.title}</Text>
          <Text style={styles.sub}>{spec.sub}</Text>
        </View>
        <Feather name="chevron-right" size={rw(20)} color={T.textMuted} />
      </View>
    </PressableScale>
  );
}

function pickNudge(profile: Profile | null, momentumScore: number | null, streak: number): NudgeSpec | null {
  if (!profile) return null;

  // Priority 1 — ID verification. Highest-value nudge, hosts trust verified runners more.
  const verifiedIdTypes = profile.verified_id_types ?? [];
  if (verifiedIdTypes.length === 0) {
    return {
      kind: "verify_id",
      icon: "shield",
      accent: "#8097ff",
      eyebrow: "NEXT UNLOCK",
      title: "Verify your ID",
      sub: "Get hired faster — verified runners land more gigs.",
      target: "/(main)/verify-identity",
    };
  }

  // Priority 2 — bio + skills. Feeds profile completion + Momentum bonus.
  const bioMissing = !profile.bio || profile.bio.trim().length < 20;
  const skillsThin = !profile.skills || profile.skills.length < 3;
  if (bioMissing || skillsThin) {
    const gaps: string[] = [];
    if (bioMissing) gaps.push("a bio");
    if (skillsThin) gaps.push(skillsThin && !bioMissing ? "more skills" : "skills");
    return {
      kind: "profile",
      icon: "user",
      accent: T.primary,
      eyebrow: "COMPLETE YOUR PROFILE",
      title: `Add ${gaps.join(" + ")}`,
      sub: "Full profiles boost your Momentum score and stand out to hosts.",
      target: "/(main)/edit-profile",
    };
  }

  // Priority 3 — near next band threshold. Only fires when the runner is
  // within NEXT_BAND_DISTANCE points of promotion — makes the goal feel close.
  if (momentumScore != null) {
    const band = BAND_THRESHOLDS.find((b) => momentumScore >= b.min && momentumScore <= b.max);
    if (band && band.next !== null) {
      const distance = band.next - momentumScore;
      if (distance > 0 && distance <= NEXT_BAND_DISTANCE) {
        const nextBand = BAND_THRESHOLDS.find((b) => b.min === band.next);
        return {
          kind: "band",
          icon: "trending-up",
          accent: nextBand?.color ?? T.primary,
          eyebrow: "SO CLOSE",
          title: `${distance} pts to ${nextBand?.label ?? "next band"}`,
          sub: "Complete one more gig with a great rating to level up.",
          target: "/(main)/(tabs)/arena",
        };
      }
    }
  }

  // Priority 4 — streak reminder. Only when it feels worth defending.
  if (streak >= 3) {
    return {
      kind: "streak",
      icon: "zap",
      accent: "#FFC83D",
      eyebrow: "STREAK ALERT",
      title: `You're on a ${streak}-day streak`,
      sub: "Apply to a gig today to keep it going.",
      target: "/(main)/(tabs)/explore",
    };
  }

  return null;
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(14),
    padding: rw(16),
    borderRadius: rw(18),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  iconRing: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    fontSize: rf(10),
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  title: {
    fontSize: rf(15),
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: T.text,
    marginBottom: 2,
  },
  sub: {
    fontSize: rf(12),
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    color: T.textMuted,
    lineHeight: rf(16),
  },
});
