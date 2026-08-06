/**
 * EarningsCard — hero card at the top of Pocket Home.
 *
 * Sets the tone: this app makes you money. Shows this-week's earnings big,
 * with a subtitle for gig count + next payout date. Falls back gracefully
 * to a "Complete your first gig" prompt for brand-new runners.
 *
 * Positioning: sits directly under the greeting bar. First thing the
 * runner sees on app open — before the CTA, before Momentum, before gigs.
 * (Every top gig app does this: DoorDash's earnings pill, Uber's Home
 * earnings summary, Instacart's daily progress tracker.)
 */
import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { PressableScale } from "@/components/ui/PressableScale";
import type { EarningsSummary } from "@/lib/api/earnings";

interface Props {
  summary: EarningsSummary | null;
  onPress?: () => void;
}

function formatPayoutDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { weekday: "long" });
}

function formatMoney(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function EarningsCard({ summary, onPress }: Props) {
  const trend = useMemo(() => {
    if (!summary) return null;
    const diff = summary.this_week - summary.last_week;
    if (summary.last_week === 0 && summary.this_week === 0) return null;
    if (summary.last_week === 0) return { label: "First earnings", positive: true };
    const pct = Math.round((diff / summary.last_week) * 100);
    return { label: `${pct >= 0 ? "+" : ""}${pct}% vs last week`, positive: pct >= 0 };
  }, [summary]);

  // Brand-new runner — no completed gigs ever. Show a warm invite instead
  // of a "₹0" number that reads as bad.
  if (summary && summary.lifetime_gig_count === 0) {
    return (
      <PressableScale onPress={onPress} scale={0.98}>
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconRing}>
            <Feather name="dollar-sign" size={rw(22)} color={T.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.emptyTitle}>Ready to earn?</Text>
            <Text style={styles.emptySub}>Complete your first gig to start tracking your earnings here.</Text>
          </View>
          <Feather name="chevron-right" size={rw(20)} color={T.textMuted} />
        </View>
      </PressableScale>
    );
  }

  // Loading skeleton — subtle placeholder that matches the real card's height
  if (!summary) {
    return (
      <View style={[styles.card, styles.skeleton]}>
        <View style={styles.skeletonEyebrow} />
        <View style={styles.skeletonAmount} />
        <View style={styles.skeletonSub} />
      </View>
    );
  }

  return (
    <PressableScale onPress={onPress} scale={0.98}>
      <LinearGradient
        colors={["#1a1919", "#0e0e0e"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Ambient glow — subtle lime radial in the corner */}
        <View style={styles.glow} />

        <View style={styles.headerRow}>
          <Text style={styles.eyebrow}>THIS WEEK</Text>
          {trend && (
            <View style={styles.trendChip}>
              <Feather
                name={trend.positive ? "trending-up" : "trending-down"}
                size={rw(11)}
                color={trend.positive ? T.primary : T.error}
              />
              <Text
                style={[
                  styles.trendText,
                  { color: trend.positive ? T.primary : T.error },
                ]}
              >
                {trend.label}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.amount}>{formatMoney(summary.this_week)}</Text>

        <View style={styles.subRow}>
          <Feather name="check-circle" size={rw(13)} color={T.textMuted} />
          <Text style={styles.subText}>
            {summary.week_gig_count} {summary.week_gig_count === 1 ? "gig" : "gigs"} this week
          </Text>
          <View style={styles.dot} />
          <Feather name="calendar" size={rw(13)} color={T.textMuted} />
          <Text style={styles.subText}>Payout {formatPayoutDay(summary.next_payout_date)}</Text>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: rw(20),
    padding: rw(20),
    paddingTop: rw(18),
    paddingBottom: rw(18),
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    position: "relative",
  },
  glow: {
    position: "absolute",
    top: -rw(60),
    right: -rw(60),
    width: rw(180),
    height: rw(180),
    borderRadius: rw(90),
    backgroundColor: "rgba(212,255,0,0.10)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: rw(8),
  },
  eyebrow: {
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.textMuted,
    letterSpacing: 1.6,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(8),
    paddingVertical: rw(3),
    borderRadius: rw(999),
    backgroundColor: "rgba(212,255,0,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,255,0,0.20)",
  },
  trendText: {
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.2,
  },
  amount: {
    fontSize: rf(44),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    letterSpacing: -1,
    marginBottom: rw(10),
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    flexWrap: "wrap",
  },
  subText: {
    fontSize: rf(13),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textSub,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: T.textMuted,
    marginHorizontal: rw(4),
  },

  // ── Empty state — brand-new runner ──
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(14),
    padding: rw(18),
    borderRadius: rw(20),
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
  },
  emptyIconRing: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: "rgba(212,255,0,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    marginBottom: 2,
  },
  emptySub: {
    fontSize: rf(12),
    fontWeight: "400",
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
    lineHeight: rf(16),
  },

  // ── Skeleton ──
  skeleton: {
    minHeight: rw(140),
    justifyContent: "space-between",
  },
  skeletonEyebrow: {
    width: rw(72),
    height: rw(12),
    borderRadius: 4,
    backgroundColor: T.surface2,
  },
  skeletonAmount: {
    width: rw(160),
    height: rw(44),
    borderRadius: 8,
    backgroundColor: T.surface2,
    marginTop: rw(8),
  },
  skeletonSub: {
    width: rw(200),
    height: rw(14),
    borderRadius: 4,
    backgroundColor: T.surface2,
    marginTop: rw(10),
  },
});
