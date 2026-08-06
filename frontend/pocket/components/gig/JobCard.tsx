/**
 * JobCard — reusable gig card used in three contexts:
 *  "explore"  — large full-screen card in the swipe deck (worker view)
 *  "space"    — compact list card in Post Space (poster view, shows applicants)
 *  "event"    — compact list card in Event detail (poster view, shows applicants)
 */

import { memo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions, Image, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { MomentumBadge } from "@/components/momentum/MomentumBadge";
import { HostAvatarChip } from "@/components/gig/HostAvatarChip";
import type { HostSummary } from "@/lib/api/gigs";

const SCREEN_H = Dimensions.get("window").height;
import { Gig, GigCategory } from "@/types/database";
import { T, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";

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
 * zone at bottom) so the overlay stack (host chip, momentum, spots, time
 * pill) lands in the same places on both branches.
 */
function FallbackHero({
  gig,
  categoryColor,
  categoryLabel,
}: {
  gig: Gig;
  categoryColor: string;
  categoryLabel: string;
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

      {/* Bottom text zone — mirrors compositor's baked layout (chip → title → pay → venue) */}
      <View style={styles.fallbackTextZone}>
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
        <Image source={{ uri: gig.cover_image_url }} style={styles.coverImage} resizeMode="cover" />
      ) : (
        <FallbackHero
          gig={gig}
          categoryColor={categoryColor}
          categoryLabel={getCategoryLabel(gig.category)}
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

      {/* Bottom-left floating: host avatar chip. ONLY on the fallback branch —
          the compositor bakes host_name into the cover PNG's bottom text zone,
          so overlaying a chip there duplicates content and clips the baked
          text (2026-08-06 fix). */}
      {host && !gig.cover_image_url && (
        <View style={styles.coverHostChipWrap}>
          <HostAvatarChip host={host} />
        </View>
      )}
    </View>
  ) : (
    <View
      style={[styles.card, styles.cardCompact]}
      pointerEvents="auto"
    >

      {/* ── Compact variant header row ── */}
      {!isExplore && (
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
          {/* marginLeft: "auto" pushes this to the row's far end without
              disturbing the badges' own layout — stays in-flow, no absolute
              positioning, so it can't overlap the title text below. */}
          {gig.cover_image_square_url && (
            <Image source={{ uri: gig.cover_image_square_url }} style={styles.thumbnail} />
          )}
        </View>
      )}

      {/* ── Body content ── */}
      <View style={isExplore ? styles.body : undefined}>
        {/* Title */}
        <Text style={[styles.title, isExplore && styles.titleExplore]} numberOfLines={isExplore ? 3 : 2}>
          {gig.title}
        </Text>

        {/* Company */}
        {gig.company_name ? (
          <Text style={[styles.company, isExplore && styles.companyExplore]} numberOfLines={1}>
            {gig.company_name}
          </Text>
        ) : null}

        {/* Description (explore only) */}
        {isExplore && gig.description ? (
          <Text style={styles.description} numberOfLines={4}>{gig.description}</Text>
        ) : null}

        {/* Pay */}
        <View style={[styles.payRow, isExplore && styles.payRowExplore]}>
          <Text style={[styles.payAmount, isExplore && styles.payAmountExplore]}>
            {formatPay(gig.pay_amount, gig.pay_type)}
          </Text>
        </View>

        {/* Details grid */}
        <View style={[styles.details, isExplore && styles.detailsExplore]}>
          <View style={[styles.detailItem, isExplore && styles.detailItemExplore]}>
            <Feather name="calendar" size={isExplore ? 15 : 13} color={isExplore ? T.primary : T.textMuted} />
            <Text style={[styles.detailText, isExplore && styles.detailTextExplore]}>
              {formatDate(gig.event_date)}
              {gig.is_multi_day && gig.event_end_date ? ` – ${formatDate(gig.event_end_date)}` : ""}
            </Text>
          </View>
          <View style={[styles.detailItem, isExplore && styles.detailItemExplore]}>
            <Feather name="clock" size={isExplore ? 15 : 13} color={isExplore ? T.primary : T.textMuted} />
            <Text style={[styles.detailText, isExplore && styles.detailTextExplore]}>
              {formatTime(gig.shift_start_time)} – {formatTime(gig.shift_end_time)}
              {gig.report_time ? ` · Report ${formatTime(gig.report_time)}` : ""}
            </Text>
          </View>
          <View style={[styles.detailItem, isExplore && styles.detailItemExplore]}>
            <Feather name="map-pin" size={isExplore ? 15 : 13} color={isExplore ? T.primary : T.textMuted} />
            <Text style={[styles.detailText, isExplore && styles.detailTextExplore]} numberOfLines={1}>
              {gig.venue_name}, {gig.city}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, isExplore && styles.footerExplore]}>
          <View style={[styles.slotsChip, isExplore && styles.slotsChipExplore]}>
            <Feather name="users" size={isExplore ? 15 : 12} color={spotsLeft <= 3 ? T.tertiary : (isExplore ? T.text : T.textMuted)} />
            <Text style={[styles.slotsText, isExplore && styles.slotsTextExplore, spotsLeft <= 3 && styles.slotsUrgent]}>
              {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
            </Text>
          </View>

          {(variant === "space" || variant === "event") && applicationCount !== undefined ? (
            <View style={styles.applicantsChip}>
              <Feather name="user-check" size={12} color={T.primary} />
              <Text style={styles.applicantsText}>
                {applicationCount} {applicationCount === 1 ? "applicant" : "applicants"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Tags + requirements (explore only) */}
        {isExplore ? (
          <View style={[styles.tagsRow, styles.tagsRowExplore]}>
            {gig.languages_required.slice(0, 3).map((lang) => (
              <View key={lang} style={styles.tag}>
                <Text style={styles.tagText}>{lang}</Text>
              </View>
            ))}
            {gig.gender_preference !== "any" ? (
              <View style={[styles.tag, styles.tagGender]}>
                <Text style={[styles.tagText, styles.tagGenderText]}>{gig.gender_preference} only</Text>
              </View>
            ) : null}
            {gig.dress_code ? (
              <View style={styles.tagReq}>
                <Feather name="scissors" size={10} color={T.textMuted} />
                <Text style={styles.tagReqText}>{gig.dress_code}</Text>
              </View>
            ) : null}
            {gig.experience_required ? (
              <View style={styles.tagReq}>
                <Feather name="award" size={10} color={T.textMuted} />
                <Text style={styles.tagReqText}>Experience required</Text>
              </View>
            ) : null}
            {gig.requirements_note ? (
              <View style={[styles.tagReq, styles.tagReqNote]}>
                <Text style={styles.tagReqText} numberOfLines={2}>{gig.requirements_note}</Text>
              </View>
            ) : null}
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  cardExplore: {
    borderRadius: 24,
    minHeight: SCREEN_H * 0.65,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 12,
  },
  cardCompact: {
    padding: 16,
    borderRadius: 14,
  },

  // ── Explore variant, cover-art card (gig.cover_image_url present) ──
  cardExploreCover: {
    borderRadius: 24,
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
    top: 16,
    right: 16,
    gap: 8,
    alignItems: "flex-end",
  },
  coverSlotsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coverSlotsText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
  },
  coverTimePillWrap: {
    position: "absolute",
    top: 16,
    left: 16,
  },
  timeToStartPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.primary,
  },
  timeToStartText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#0e0e0e",
  },
  coverHostChipWrap: {
    position: "absolute",
    left: 16,
    bottom: 16,
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
    top: 80,
    left: -20,
    right: -20,
    textAlign: "center",
    fontSize: 78,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 3,
  },
  fallbackTextZone: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 28,
    gap: 8,
  },
  fallbackChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  fallbackChipText: {
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  fallbackTitle: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#ffffff",
    lineHeight: 38,
  },
  fallbackPay: {
    fontSize: 34,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    marginTop: 6,
  },
  fallbackVenue: {
    fontSize: 17,
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },

  // ── Category header (explore only) ──────────────────────────
  categoryHeader: {
    height: 116,
    justifyContent: "flex-end",
    padding: 14,
    paddingTop: 16,
    gap: 8,
  },
  categoryHeroLabel: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 2,
    opacity: 0.22,
    alignSelf: "center",
    marginBottom: 2,
  },
  categoryGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(19,19,19,0.7)",
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
    letterSpacing: 0.3,
  },

  // ── Compact variant header ───────────────────────────────────
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginLeft: "auto",
    backgroundColor: T.surface2,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.3,
  },

  // ── Boost badge ─────────────────────────────────────────────
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: T.momentumLight,
    borderRadius: 6,
  },
  boostText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.momentum,
  },

  // ── Body ─────────────────────────────────────────────────────
  body: {
    padding: 20,
    paddingBottom: 24,
    gap: 0,
  },

  // ── Title ────────────────────────────────────────────────────
  title: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: 24,
  },
  titleExplore: {
    fontSize: 24,
    lineHeight: 31,
    textAlign: "center",
    fontFamily: "SpaceGrotesk_700Bold",
    marginBottom: 4,
  },

  // ── Company ──────────────────────────────────────────────────
  company: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    marginTop: 2,
  },
  companyExplore: {
    textAlign: "center",
    color: T.textMuted,
    marginBottom: 4,
  },

  // ── Description ──────────────────────────────────────────────
  description: {
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },

  // ── Pay ──────────────────────────────────────────────────────
  payRow: {
    marginTop: 10,
  },
  payRowExplore: {
    alignItems: "center",
    marginTop: 12,
  },
  payAmount: {
    fontSize: 22,
    fontWeight: "bold",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.success,
  },
  payAmountExplore: {
    fontSize: 30,
    textAlign: "center",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.success,
  },

  // ── Details ──────────────────────────────────────────────────
  details: {
    marginTop: 14,
    gap: 8,
  },
  detailsExplore: {
    gap: 10,
    marginTop: 14,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailItemExplore: {
    justifyContent: "center",
  },
  detailText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    flex: 1,
  },
  detailTextExplore: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
    flex: 0,
    textAlign: "center",
  },

  // ── Footer ───────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  footerExplore: {
    justifyContent: "center",
  },
  slotsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  slotsChipExplore: {
    gap: 7,
  },
  slotsText: {
    fontSize: 13,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  slotsTextExplore: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  slotsUrgent: {
    color: T.tertiary,
    fontWeight: "700",
  },
  applicantsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  applicantsText: {
    fontSize: 13,
    color: T.primary,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },

  // ── Tags ─────────────────────────────────────────────────────
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
  },
  tagsRowExplore: {
    justifyContent: "center",
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(212,255,0,0.10)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(212,255,0,0.18)",
  },
  tagGender: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  tagText: {
    fontSize: 12,
    color: T.primary,
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
  },
  tagGenderText: {
    color: T.textSub,
  },
  tagReq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.surface2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  tagReqNote: {
    flex: 1,
    flexShrink: 1,
  },
  tagReqText: {
    fontSize: 12,
    color: T.textSub,
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
    textTransform: "capitalize",
  },
});
