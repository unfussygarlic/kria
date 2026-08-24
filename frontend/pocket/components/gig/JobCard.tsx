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
import { S, R, SHADOW, TYPE } from "@/constants/design";
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
 * PosterHero — the top ~55% of the explore card when no user photo exists.
 *
 * All-native (no PNG generation). Category-tinted gradient + big Feather
 * icon + bold category name. Info (title / host / pay / venue) sits in
 * a separate zone BELOW this hero, not baked into it — so the same info
 * layout works for both photo and no-photo branches.
 */
function PosterHero({
  categoryColor,
  categoryLabel,
  categoryIconName,
}: {
  categoryColor: string;
  categoryLabel: string;
  categoryIconName: React.ComponentProps<typeof Feather>["name"];
}) {
  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={[categoryColor, mixTowardDark(categoryColor)]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Big soft-white icon centered — the "logo" of the card */}
      <View style={styles.posterIconRing}>
        <Feather name={categoryIconName} size={rw(48)} color="#FFFFFF" />
      </View>
      {/* Category name as a poster subtitle */}
      <Text style={styles.posterCategoryText} numberOfLines={1}>
        {categoryLabel.toUpperCase()}
      </Text>
    </View>
  );
}

/**
 * PhotoHero — user-uploaded image in the top ~55% of the card. Same shape
 * as PosterHero so overlays / info-zone below stay aligned.
 *
 * `resizeMode="cover"` fills the hero flush (image is user-controlled from
 * Grid — we assume reasonable aspect). The legacy `resizeMode="contain"`
 * from the compositor days is gone since we no longer render compositor
 * PNGs (see 2026-08-24 revamp).
 */
function PhotoHero({ uri }: { uri: string }) {
  return <Image source={{ uri }} style={styles.heroPhoto} resizeMode="cover" />;
}

// Mix a color 60% toward near-black. Keeps hue for the gradient end.
function mixTowardDark(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const t = 0.6;
  const px = (n: number) => Math.round(n * (1 - t)).toString(16).padStart(2, "0");
  return `#${px(r)}${px(g)}${px(b)}`;
}

function iconForCategory(cat: GigCategory): React.ComponentProps<typeof Feather>["name"] {
  return (GigCategories.find((c) => c.value === cat)?.icon ?? "briefcase") as React.ComponentProps<typeof Feather>["name"];
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

  // Explore cards are 2:3 portrait split into HERO (top 55%) + INFO (bottom 45%).
  //   • HERO branch: uploaded photo (PhotoHero) OR in-app category poster
  //     (PosterHero — gradient + big icon + category name). No PNG compositor.
  //   • INFO branch: native text — title / host / pay / venue. IDENTICAL
  //     across both hero types so photo vs no-photo doesn't shift layout.
  //   • Overlays (momentum, boost, spots, time pill) sit on the hero half.
  const categoryLabel = getCategoryLabel(gig.category);
  const categoryIconName = iconForCategory(gig.category);

  const content = isExplore ? (
    <View style={[styles.card, styles.cardExplore]} pointerEvents="none">
      {/* ─── HERO (top 55%) ─────────────────────────────────────────── */}
      <View style={styles.heroWrap}>
        {gig.cover_image_url ? (
          <PhotoHero uri={gig.cover_image_url} />
        ) : (
          <PosterHero
            categoryColor={categoryColor}
            categoryLabel={categoryLabel}
            categoryIconName={categoryIconName}
          />
        )}

        {/* Top-right stack: momentum + boost + live spots. Only shown when
            they carry real signal — 0-momentum newcomers get no chip. */}
        <View style={styles.overlayBadgeStack}>
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

        {/* Top-left floating: time-to-start pill (only within 24h of shift) */}
        {gig.event_date && (
          <View style={styles.overlayTimePillWrap}>
            <TimeToStartPill eventDate={gig.event_date} shiftStart={gig.shift_start_time} />
          </View>
        )}
      </View>

      {/* ─── INFO (bottom 45%) ─────────────────────────────────────── */}
      <View style={styles.infoZone}>
        {/* Category chip — top row anchor + host chip on the right */}
        <View style={styles.infoTopRow}>
          <View style={[styles.infoCategoryChip, { backgroundColor: categoryColor + "22" }]}>
            <View style={[styles.infoCategoryDot, { backgroundColor: categoryColor }]} />
            <Text style={[styles.infoCategoryText, { color: categoryColor }]} numberOfLines={1}>
              {categoryLabel}
            </Text>
          </View>
          {host && <HostAvatarChip host={host} />}
        </View>

        <Text style={styles.infoTitle} numberOfLines={2}>{gig.title}</Text>

        <View style={styles.infoFooter}>
          <Text style={[styles.infoPay, { color: categoryColor }]} numberOfLines={1}>
            {formatPay(gig.pay_amount, gig.pay_type)}
          </Text>
          <Text style={styles.infoVenue} numberOfLines={1}>
            {gig.venue_name}{gig.city ? ` · ${gig.city}` : ""}
          </Text>
        </View>
      </View>
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

  // ── Explore variant — 2:3 portrait, split hero + info ──────────
  cardExplore: {
    aspectRatio: 2 / 3,
    borderRadius: R.hero,
    overflow: "hidden",
    backgroundColor: T.surface1,
    ...SHADOW.lg,
  },
  heroWrap: {
    flex: 55,             // top ~55% of the card
    overflow: "hidden",
    backgroundColor: T.surface2,
  },
  // In-app poster hero (no user photo)
  hero: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: S.lg,
    gap: S.sm,
  },
  posterIconRing: {
    width: rw(96),
    height: rw(96),
    borderRadius: rw(48),
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
  },
  posterCategoryText: {
    ...TYPE.label,
    fontSize: rf(14),
    letterSpacing: 2.4,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: S.xs,
  },
  // User-uploaded photo hero
  heroPhoto: {
    width: "100%",
    height: "100%",
    backgroundColor: T.surface2,
  },
  // Info zone (bottom 45%)
  infoZone: {
    flex: 45,
    padding: S.lg,
    justifyContent: "space-between",
    backgroundColor: T.surface1,
  },
  infoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.xs,
  },
  infoCategoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
    flexShrink: 1,
  },
  infoCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  infoCategoryText: {
    ...TYPE.label,
    flexShrink: 1,
  },
  infoTitle: {
    ...TYPE.title2,
    color: T.text,
    marginTop: S.xs,
  },
  infoFooter: {
    gap: 2,
    marginTop: S.xs,
  },
  infoPay: {
    ...TYPE.title2,
    fontSize: rf(22),
  },
  infoVenue: {
    ...TYPE.body,
    color: T.textMuted,
  },

  // ── Overlay stack (top of hero) ────────────────────────────────
  overlayBadgeStack: {
    position: "absolute",
    top: S.sm,
    right: S.sm,
    gap: S.xs,
    alignItems: "flex-end",
  },
  coverSlotsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
  },
  coverSlotsText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },
  overlayTimePillWrap: {
    position: "absolute",
    top: S.sm,
    left: S.sm,
  },
  timeToStartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
    backgroundColor: T.primary,
  },
  timeToStartText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.onPrimary,
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
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_600SemiBold",
    color: T.momentum,
  },
  title: {
    fontSize: rf(18),
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: T.text,
    lineHeight: rf(24),
  },
  company: {
    fontSize: rf(13),
    fontFamily: "Inter_400Regular",
    color: T.textSub,
    marginTop: rw(2),
  },
  payRow: {
    marginTop: rw(10),
  },
  payAmount: {
    fontSize: rf(22),
    fontWeight: "bold",
    fontFamily: "Inter_700Bold",
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
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_400Regular",
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
    fontFamily: "Inter_600SemiBold",
  },
});
