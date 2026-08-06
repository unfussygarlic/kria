/**
 * PrimaryCTA — the big "Find gigs nearby" button on Pocket Home.
 *
 * Answers the "what do I do next?" question that plain marketing headers
 * ("Hot near you") can't. Includes a live nearby-count as social proof
 * ("12 new near Bengaluru today") — DoorDash-style demand signal.
 *
 * Tapping navigates to /(main)/(tabs)/explore. Falls back to a subtler
 * copy variant when we don't have a fresh count yet.
 */
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { PressableScale } from "@/components/ui/PressableScale";

interface Props {
  nearbyCount: number | null;   // null when unknown (loading)
  cityLabel: string | null;     // e.g. "Bengaluru" — omitted when unknown
  onPress: () => void;
}

export function PrimaryCTA({ nearbyCount, cityLabel, onPress }: Props) {
  const hasCount = nearbyCount !== null && nearbyCount > 0;
  const social = hasCount
    ? `${nearbyCount}${nearbyCount >= 20 ? "+" : ""} new near ${cityLabel ?? "you"} today`
    : "Swipe on live gigs, apply in a tap";

  return (
    <PressableScale onPress={onPress} scale={0.97}>
      <LinearGradient
        colors={T.gradBrand as unknown as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.iconWrap}>
          <Feather name="zap" size={rw(22)} color="#0e0e0e" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Find gigs nearby</Text>
          <Text style={styles.sub}>{social}</Text>
        </View>
        <Feather name="arrow-right" size={rw(22)} color="#0e0e0e" />
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(14),
    paddingHorizontal: rw(18),
    paddingVertical: rw(18),
    borderRadius: rw(20),
    // Elevation for prominence — this is the primary CTA
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: "rgba(14,14,14,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: rf(17),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#0e0e0e",
    letterSpacing: -0.2,
  },
  sub: {
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: "rgba(14,14,14,0.72)",
    marginTop: 2,
  },
});
