/**
 * JobCard — reusable gig card used in three contexts:
 *  "explore"  — large full-screen card in the swipe deck (worker view)
 *  "space"    — compact list card in Post Space (poster view, shows applicants)
 *  "event"    — compact list card in Event detail (poster view, shows applicants)
 */

import { memo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Image, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { MomentumBadge } from "@/components/momentum/MomentumBadge";
import { HostAvatarChip } from "@/components/gig/HostAvatarChip";
import type { HostSummary } from "@/lib/api/gigs";
import { Gig, GigCategory } from "@/types/database";
import { T, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { rf, rw } from "@/constants/responsive";

export type JobCardVariant = "explore" | "space" | "event";

interface JobCardProps {
  gig: Gig;
  variant: JobCardVariant;
  applicationCount?: number; // for "space" and "event" variants
  posterMomentum?: number;   // poster's Momentum score, shown on explore cards
  host?: HostSummary;        // poster profile summary, shown on explore cards
  onPress?: () => void;
}

// ── Overlay sub-components (cover variant only) ──────────────────────────────

/** Pulses when urgent (≤3 spots), color escalates amber → coral as slots vanish. */
function SpotsChipOverlay({ spotsLeft }: { spotsLeft: number }) {
  const urgent = spotsLeft <= 3;
  const critical = spotsLeft <= 1;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!urgent) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [urgent, pulse]);

  const bg = critical
    ? "rgba(255,83,49,0.95)"  // coral for last spot
    : urgent
    ? "rgba(255,199,61,0.95)" // amber for ≤3
    : "rgba(19,19,19,0.75)";
  const fg = urgent ? "#0e0e0e" : T.text;

  const Content = (
    <View style={[styles.coverSlotsChip, { backgroundColor: bg }]}>
      <Feather name={urgent ? "zap" : "users"} size={13} color={fg} />
      <Text style={[styles.coverSlotsText, { color: fg }]}>
        {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
      </Text>
    </View>
  );

  // alignSelf: "flex-end" is defensive — the parent coverBadgeStack sets
  // alignItems: "flex-end" but some RN versions don't propagate that through
  // Animated.View, causing the chip to stretch full-width and appear detached
  // from the top-right stack. Explicit alignSelf pins it back to the right.
  return urgent ? (
    <Animated.View style={{ opacity: pulse, alignSelf: "flex-end" }}>{Content}</Animated.View>
  ) : Content;
}

/** Shows "Starts in Xh Ym" or "Starts in Xm" when the shift is within 24h. Otherwise renders nothing. */
function TimeToStartPill({ eventDate, shiftStart }: { eventDate: string; shiftStart: string | null }) {
  const label = computeTimeToStart(eventDate, shiftStart);
  if (!label) return null;
  return (
    <View style={styles.timeToStartPill}>
      <Feather name="clock" size={11} color="#0e0e0e" />
      <Text style={styles.timeToStartText}>{label}</Text>
    </View>
  );
}

function computeTimeToStart(eventDate: string, shiftStart: string | null): string | null {
  const start = new Date(eventDate);
  if (shiftStart) {
    const [hh, mm] = shiftStart.split(":");
    start.setHours(Number(hh ?? 9), Number(mm ?? 0), 0, 0);
  } else {
    start.setHours(9, 0, 0, 0);
  }
  const diffMs = start.getTime() - Date.now();
  if (diffMs <= 0 || diffMs > 24 * 60 * 60 * 1000) return null;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `Starts in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins - hrs * 60;
  return remMins > 0 ? `Starts in ${hrs}h ${remMins}m` : `Starts in ${hrs}h`;
}

/**
 * FallbackHero — typography-first hero shown when a gig has no compositor
 * cover image. Mirrors the compositor's layout (gradient background + text
 * zone at bottom) so the overlay stack (momentum, spots, time pill) lands
 * in the same places on both branches.
 *
 * The host chip lives INSIDE the text zone (above the category chip) rather
 * than as a bottom-left absolute overlay — otherwise it collides with the
 * venue text (fixed 2026-08-07, mirrors the 2026-08-06 fix on the cover
 * branch that removed the chip because the compositor already bakes the
 * host name in).
 */
function FallbackHero({
  gig,
  categoryColor,
  categoryLabel,
  host,
}: {
  gig: Gig;
  categoryColor: string;
  categoryLabel: string;
  host?: HostSummary;
}) {
  return (
    <View style={styles.fallbackHero}>
      <LinearGradient
        colors={[categoryColor + "55", "#0e0e0e"]}
        start={{ x: 0.75, y: 0 }}
        end={{ x: 0.25, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Massive category watermark high up — echoes the icon area of the compositor */}
      <Text style={[styles.fallbackWatermark, { color: categoryColor + "18" }]} numberOfLines={1}>
        {categoryLabel.toUpperCase()}
      </Text>

      {/* Bottom text zone — mirrors compositor's baked layout
          (host → chip → title → pay → venue) */}
      <View style={styles.fallbackTextZone}>
        {host && (
          <View style={styles.fallbackHostRow}>
            <HostAvatarChip host={host} />
          </View>
        )}
        <View style={[styles.fallbackChip, { borderColor: categoryColor, backgroundColor: categoryColor + "22" }]}>
          <Text style={[styles.fallbackChipText, { color: categoryColor }]}>{categoryLabel}</Text>
        </View>
        <Text style={styles.fallbackTitle} numberOfLines={2}>{gig.title}</Text>
        <Text style={[styles.fallbackPay, { color: categoryColor }]}>
          {formatPay(gig.pay_amount, gig.pay_type)}
        </Text>
        <Text style={styles.fallbackVenue} numberOfLines={1}>
          {gig.venue_name}{gig.city ? ` · ${gig.city}` : ""}
        </Text>
      </View>
    </View>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function formatPay(amount: number, type: string): string {
  const formatted = amount.toLocaleString("en-IN");
  if (type === "hourly") return `₹${formatted}/hr`;
  if (type === "per_day") return `₹${formatted}/day`;
  return `₹${formatted}`;
}

export function getCategoryColor(category: GigCategory): string {
  return CategoryColors[category] || T.textMuted;
}

export function getCategoryLabel(category: GigCategory): string {
  return GigCategories.find((c) => c.value === category)?.label ?? category;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const JobCard = memo(function JobCard({ gig, variant, applicationCount, posterMomentum, host, onPress }: JobCardProps) {
  const categoryColor = getCategoryColor(gig.category);
  const spotsLeft = gig.slots_total - gig.slots_filled;
  const isExplore = variant === "explore";

  // Explore cards render as photo-first cards: cover image if the compositor
  // ran, or a typography-first gradient hero if it didn't. Both share the same
  // overlay stack (momentum, boost, spots, host chip, time pill) so the fall-
  // back doesn't feel like a "second-class" experience — just a stylized
  // treatment when there's no photo. Compact variants ("space"/"event") skip
  // both branches and use the hand-built list card below.
  const content = isExplore ? (
    <View style={[styles.card, styles.cardExploreCover]} pointerEvents="none">
      {gig.cover_image_url ? (
        // resizeMode="contain" is defensive — new 1080×1620 covers match the
        // 2:3 container exactly (contain == cover), but any cover generated
        // before the 2026-08-07 compositor bump is 1080×1350 (4:5). With
        // resizeMode="cover" the taller 2:3 container zooms + center-crops
        // those, chopping the baked title/pay/host text on both sides.
        // "contain" fits the full image with letterboxing on the mismatched
        // ones, so old covers stay readable until they're regenerated.
        <Image source={{ uri: gig.cover_image_url }} style={styles.coverImage} resizeMode="contain" />
      ) : (
        <FallbackHero
          gig={gig}
          categoryColor={categoryColor}
          categoryLabel={getCategoryLabel(gig.category)}
          host={host}
        />
      )}

      {/* Top-right stack: momentum + boost + live spots. Only shown when they
          carry real signal — 0-momentum newcomers get no chip (avoids showing
          "0" as if it were a bad score). */}
      <View style={styles.coverBadgeStack}>
        {posterMomentum !== undefined && posterMomentum > 0 && (
          <MomentumBadge score={posterMomentum} variant="chip" />
        )}
        {gig.momentum_boost > 0 && (
          <View style={styles.boostBadge}>
            <Feather name="zap" size={11} color={T.momentum} />
            <Text style={styles.boostText}>Boosted</Text>
          </View>
        )}
        <SpotsChipOverlay spotsLeft={spotsLeft} />
      </View>

      {/* Middle-left floating: time-to-start pill (only within 24h of shift) */}
      {gig.event_date && (
        <View style={styles.coverTimePillWrap}>
          <TimeToStartPill eventDate={gig.event_date} shiftStart={gig.shift_start_time} />
        </View>
      )}
      {/* Host chip: baked into cover on the photo branch; embedded inside
          FallbackHero's text zone on the fallback branch. Either way it's
          not an absolute overlay anymore — was colliding with venue text. */}
    </View>
  ) : (
    <View style={[styles.card, styles.cardCompact]} pointerEvents="auto">
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{getCategoryLabel(gig.category)}</Text>
        </View>
        {gig.momentum_boost > 0 && (
          <View style={styles.boostBadge}>
            <Feather name="zap" size={11} color={T.momentum} />
            <Text style={styles.boostText}>Boosted</Text>
          </View>
        )}
        {gig.cover_image_square_url && (
          <Image source={{ uri: gig.cover_image_square_url }} style={styles.thumbnail} />
        )}
      </View>

      {/* Body */}
      <Text style={styles.title} numberOfLines={2}>{gig.title}</Text>
      {gig.company_name ? (
        <Text style={styles.company} numberOfLines={1}>{gig.company_name}</Text>
      ) : null}

      <View style={styles.payRow}>
        <Text style={styles.payAmount}>{formatPay(gig.pay_amount, gig.pay_type)}</Text>
      </View>

      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Feather name="calendar" size={13} color={T.textMuted} />
          <Text style={styles.detailText}>
            {formatDate(gig.event_date)}
            {gig.is_multi_day && gig.event_end_date ? ` – ${formatDate(gig.event_end_date)}` : ""}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="clock" size={13} color={T.textMuted} />
          <Text style={styles.detailText}>
            {formatTime(gig.shift_start_time)} – {formatTime(gig.shift_end_time)}
            {gig.report_time ? ` · Report ${formatTime(gig.report_time)}` : ""}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={13} color={T.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {gig.venue_name}, {gig.city}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.slotsChip}>
          <Feather name="users" size={12} color={spotsLeft <= 3 ? T.tertiary : T.textMuted} />
          <Text style={[styles.slotsText, spotsLeft <= 3 && styles.slotsUrgent]}>
            {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
          </Text>
        </View>

        {applicationCount !== undefined ? (
          <View style={styles.applicantsChip}>
            <Feather name="user-check" size={12} color={T.primary} />
            <Text style={styles.applicantsText}>
              {applicationCount} {applicationCount === 1 ? "applicant" : "applicants"}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  cardCompact: {
    padding: rw(16),
    borderRadius: rw(14),
  },

  // ── Explore variant, cover-art card (gig.cover_image_url present) ──
  cardExploreCover: {
    borderRadius: rw(24),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  coverImage: {
    width: "100%",
    // 2:3 aspect matches the compositor's 1080×1620 output (2026-08-07). If
    // the compositor's PORTRAIT canvas changes, this must change too — a
    // mismatch stretches or letterboxes existing covers.
    aspectRatio: 2 / 3,
    backgroundColor: T.surface2,
  },
  coverBadgeStack: {
    position: "absolute",
    top: rw(16),
    right: rw(16),
    gap: rw(8),
    alignItems: "flex-end",
  },
  coverSlotsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    paddingHorizontal: rw(10),
    paddingVertical: rw(6),
    borderRadius: rw(20),
  },
  coverSlotsText: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  coverTimePillWrap: {
    position: "absolute",
    top: rw(16),
    left: rw(16),
  },
  timeToStartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
    paddingHorizontal: rw(10),
    paddingVertical: rw(6),
    borderRadius: rw(20),
    backgroundColor: T.primary,
  },
  timeToStartText: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#0e0e0e",
  },

  // ── Fallback hero (no cover image) ─────────────────────────────
  fallbackHero: {
    width: "100%",
    // Must mirror the compositor's PORTRAIT aspectRatio so the FallbackHero
    // and photo branches feel like the same card. See coverImage above.
    aspectRatio: 2 / 3,
    backgroundColor: "#0e0e0e",
    overflow: "hidden",
  },
  fallbackWatermark: {
    position: "absolute",
    // Percentage keeps the watermark visually centered in the upper third
    // regardless of card size (small phones vs large). aspectRatio: 2/3 gives
    // the parent a definite height so % values resolve correctly.
    top: "12%",
    left: rw(-20),
    right: rw(-20),
    textAlign: "center",
    fontSize: rf(78),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 3,
  },
  fallbackTextZone: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: rw(24),
    paddingBottom: rw(28),
    gap: rw(8),
  },
  fallbackHostRow: {
    alignSelf: "flex-start",
    marginBottom: rw(2),
  },
  fallbackChip: {
    alignSelf: "flex-start",
    paddingHorizontal: rw(12),
    paddingVertical: rw(5),
    borderRadius: rw(20),
    borderWidth: 1,
    marginBottom: rw(8),
  },
  fallbackChipText: {
    fontSize: rf(13),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  fallbackTitle: {
    fontSize: rf(34),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    lineHeight: rf(38),
  },
  fallbackPay: {
    fontSize: rf(34),
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    marginTop: rw(6),
  },
  fallbackVenue: {
    fontSize: rf(17),
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: "rgba(255,255,255,0.7)",
    marginTop: rw(4),
  },

  // ── Compact variant styles (space/event) ────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
    marginBottom: rw(10),
  },
  thumbnail: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(10),
    marginLeft: "auto",
    backgroundColor: T.surface2,
  },
  categoryBadge: {
    paddingHorizontal: rw(10),
    paddingVertical: rw(4),
    borderRadius: rw(6),
  },
  categoryText: {
    color: "#fff",
    fontSize: rf(11),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.3,
  },
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(3),
    paddingHorizontal: rw(7),
    paddingVertical: rw(3),
    backgroundColor: T.momentumLight,
    borderRadius: rw(6),
  },
  boostText: {
    fontSize: rf(11),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.momentum,
  },
  title: {
    fontSize: rf(18),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: rf(24),
  },
  company: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    marginTop: rw(2),
  },
  payRow: {
    marginTop: rw(10),
  },
  payAmount: {
    fontSize: rf(22),
    fontWeight: "bold",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.success,
  },
  details: {
    marginTop: rw(14),
    gap: rw(8),
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  detailText: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: rw(16),
    paddingTop: rw(12),
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  slotsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
  },
  slotsText: {
    fontSize: rf(13),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  slotsUrgent: {
    color: T.tertiary,
    fontWeight: "700",
  },
  applicantsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(5),
  },
  applicantsText: {
    fontSize: rf(13),
    color: T.primary,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
