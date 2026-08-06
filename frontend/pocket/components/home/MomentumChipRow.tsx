/**
 * MomentumChipRow — compact Momentum summary for Home.
 *
 * Replaces the full-hero BandHeroCard in the revamped Home layout. Momentum
 * is still important, but it's no longer competing with the earnings card
 * and the primary CTA for the runner's first-glance attention. Full
 * animated experience remains one tap away on the Arena tab.
 *
 * Layout: [big band-coloured score] · [band label + progress-to-next] · [→]
 * Compact ~72 px tall, sits below "Hot near you".
 */
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { PressableScale } from "@/components/ui/PressableScale";
import { getBand } from "@/constants/momentum";

interface Props {
  score: number;
  streak: number;
  onPress: () => void;
}

// Band thresholds — mirrors BAND_RANGES in home.tsx and backend momentum config.
const BAND_MAX: Record<string, number> = {
  Newcomer: 99,
  Building: 299,
  Reliable: 499,
  Trusted: 699,
  Elite: 899,
  Legend: 1000,
};

export function MomentumChipRow({ score, streak, onPress }: Props) {
  const band = getBand(score);
  const bandMax = BAND_MAX[band.label] ?? 1000;
  const bandMin = bandMax === 99 ? 0 : Object.values(BAND_MAX).find((m) => m < bandMax) ?? 0;
  const isLegend = band.label === "Legend";
  const pointsToNext = isLegend ? 0 : Math.max(0, bandMax + 1 - score);
  const progress = isLegend ? 1 : (score - bandMin) / (bandMax + 1 - bandMin);

  return (
    <PressableScale onPress={onPress} scale={0.98}>
      <View style={styles.card}>
        {/* Big band-coloured score badge */}
        <View style={[styles.scoreBadge, { backgroundColor: band.color + "22", borderColor: band.color + "50" }]}>
          <Text style={[styles.scoreText, { color: band.color }]}>{score}</Text>
        </View>

        {/* Middle: band label + progress bar or streak */}
        <View style={{ flex: 1, gap: rw(6) }}>
          <View style={styles.labelRow}>
            <Text style={styles.eyebrow}>MOMENTUM</Text>
            <View style={[styles.bandPill, { backgroundColor: band.color + "1a" }]}>
              <View style={[styles.bandDot, { backgroundColor: band.color }]} />
              <Text style={[styles.bandLabel, { color: band.color }]}>{band.label}</Text>
            </View>
            {streak > 0 && (
              <Text style={styles.streak}>🔥 {streak}d</Text>
            )}
          </View>
          {!isLegend ? (
            <>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, Math.max(3, progress * 100))}%`, backgroundColor: band.color },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>{pointsToNext} pts to next band</Text>
            </>
          ) : (
            <Text style={[styles.progressLabel, { color: band.color }]}>Maximum rank achieved</Text>
          )}
        </View>

        <Feather name="chevron-right" size={rw(18)} color={T.textMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(14),
    padding: rw(14),
    borderRadius: rw(18),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  scoreBadge: {
    width: rw(64),
    height: rw(64),
    borderRadius: rw(16),
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreText: {
    fontSize: rf(24),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: -0.5,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
    flexWrap: "wrap",
  },
  eyebrow: {
    fontSize: rf(10),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textMuted,
    letterSpacing: 1.4,
  },
  bandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
    paddingHorizontal: rw(8),
    paddingVertical: 3,
    borderRadius: rw(999),
  },
  bandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bandLabel: {
    fontSize: rf(11),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.4,
  },
  streak: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#FFC83D",
  },
  progressTrack: {
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: rf(11),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
  },
});
