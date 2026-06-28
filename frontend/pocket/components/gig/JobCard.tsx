/**
 * JobCard — reusable gig card used in three contexts:
 *  "explore"  — large full-screen card in the swipe deck (worker view)
 *  "space"    — compact list card in Post Space (poster view, shows applicants)
 *  "event"    — compact list card in Event detail (poster view, shows applicants)
 */

import { memo } from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { MomentumBadge } from "@/components/momentum/MomentumBadge";

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
  onPress?: () => void;
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

export const JobCard = memo(function JobCard({ gig, variant, applicationCount, posterMomentum, onPress }: JobCardProps) {
  const categoryColor = getCategoryColor(gig.category);
  const spotsLeft = gig.slots_total - gig.slots_filled;
  const isExplore = variant === "explore";

  const content = (
    <View
      style={[styles.card, isExplore ? styles.cardExplore : styles.cardCompact]}
      pointerEvents={isExplore ? "none" : "auto"}
    >
      {/* ── Explore variant: category gradient color block at top ── */}
      {isExplore && (
        <View style={styles.categoryHeader}>
          <LinearGradient
            colors={[categoryColor + "CC", categoryColor + "44"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.categoryGradient}
          />
          {/* Large category name centred in the header */}
          <Text style={[styles.categoryHeroLabel, { color: categoryColor }]} numberOfLines={1}>
            {getCategoryLabel(gig.category).toUpperCase()}
          </Text>
          {/* Bottom row: pill + boost + momentum */}
          <View style={styles.categoryBadgesRow}>
            <View style={[styles.categoryPill, { borderColor: categoryColor + "70" }]}>
              <View style={[styles.categoryDot, { backgroundColor: categoryColor }]} />
              <Text style={styles.categoryPillText}>{getCategoryLabel(gig.category)}</Text>
            </View>
            {gig.momentum_boost > 0 && (
              <View style={styles.boostBadge}>
                <Feather name="zap" size={11} color={T.momentum} />
                <Text style={styles.boostText}>Boosted</Text>
              </View>
            )}
            {posterMomentum !== undefined && (
              <MomentumBadge score={posterMomentum} variant="chip" />
            )}
          </View>
        </View>
      )}

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
