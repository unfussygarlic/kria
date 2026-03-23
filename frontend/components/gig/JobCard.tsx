/**
 * JobCard — reusable gig card used in three contexts:
 *  "explore"  — large full-screen card in the swipe deck (worker view)
 *  "space"    — compact list card in Post Space (poster view, shows applicants)
 *  "event"    — compact list card in Event detail (poster view, shows applicants)
 */

import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
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

export function JobCard({ gig, variant, applicationCount, posterMomentum, onPress }: JobCardProps) {
  const categoryColor = getCategoryColor(gig.category);
  const spotsLeft = gig.slots_total - gig.slots_filled;
  const isExplore = variant === "explore";

  const content = (
    <View
      style={[styles.card, isExplore ? styles.cardExplore : styles.cardCompact]}
      pointerEvents={isExplore ? "none" : "auto"}
    >
      {/* Header row: category badge + optional boost */}
      <View style={[styles.headerRow, isExplore && styles.headerRowExplore]}>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{getCategoryLabel(gig.category)}</Text>
        </View>
        {gig.momentum_boost > 0 && (
          <View style={styles.boostBadge}>
            <Feather name="zap" size={11} color={T.momentum} />
            <Text style={styles.boostText}>Boosted</Text>
          </View>
        )}
        {/* Finder Momentum — shown on explore cards so workers can trust the finder */}
        {isExplore && posterMomentum !== undefined && (
          <MomentumBadge score={posterMomentum} variant="chip" />
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, isExplore && styles.titleExplore]} numberOfLines={isExplore ? 3 : 2}>
        {gig.title}
      </Text>

      {/* Company */}
      {gig.company_name ? (
        <Text style={[styles.company, isExplore && styles.companyExplore]} numberOfLines={1}>{gig.company_name}</Text>
      ) : null}

      {/* Description (explore only) */}
      {isExplore && gig.description ? (
        <Text style={styles.description} numberOfLines={4}>{gig.description}</Text>
      ) : null}

      {/* Pay — prominent on explore */}
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
          <Feather name="users" size={isExplore ? 15 : 12} color={spotsLeft <= 3 ? T.secondary : (isExplore ? T.text : T.textMuted)} />
          <Text style={[styles.slotsText, isExplore && styles.slotsTextExplore, spotsLeft <= 3 && styles.slotsUrgent]}>
            {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
          </Text>
        </View>

        {/* Applicant count for poster views */}
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
              <Text style={styles.tagText}>{gig.gender_preference} only</Text>
            </View>
          ) : null}
          {gig.dress_code ? (
            <View style={styles.tagReq}>
              <Feather name="scissors" size={10} color={T.textSub} />
              <Text style={styles.tagReqText}>{gig.dress_code}</Text>
            </View>
          ) : null}
          {gig.experience_required ? (
            <View style={styles.tagReq}>
              <Feather name="award" size={10} color={T.textSub} />
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
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: T.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  cardExplore: {
    padding: 24,
    paddingBottom: 28,
    borderRadius: 24,
    minHeight: SCREEN_H * 0.60,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardCompact: {
    padding: 16,
    borderRadius: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  headerRowExplore: {
    justifyContent: "center",
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: T.textInverse,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
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
    color: T.momentum,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
    lineHeight: 24,
  },
  titleExplore: {
    fontSize: 26,
    lineHeight: 34,
    textAlign: "center",
  },
  company: {
    fontSize: 13,
    color: T.textSub,
    marginTop: 2,
  },
  companyExplore: {
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: T.textSub,
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  payRow: {
    marginTop: 10,
  },
  payRowExplore: {
    alignItems: "center",
  },
  payAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: T.success,
  },
  payAmountExplore: {
    fontSize: 32,
    textAlign: "center",
  },
  details: {
    marginTop: 14,
    gap: 8,
  },
  detailsExplore: {
    gap: 10,
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
    color: T.textSub,
    flex: 1,
  },
  detailTextExplore: {
    fontSize: 15,
    fontWeight: "600",
    color: T.text,
    flex: 0,
    textAlign: "center",
  },
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
    color: T.textSub,
  },
  slotsTextExplore: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
  },
  slotsUrgent: {
    color: T.secondary,
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
  },
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
    backgroundColor: T.primary50,
    borderRadius: 20,
  },
  tagGender: {
    backgroundColor: T.secondary50 ?? "#FFF7ED",
  },
  tagText: {
    fontSize: 12,
    color: T.primary,
    fontWeight: "500",
  },
  tagReq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: T.surface,
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
    textTransform: "capitalize",
  },
});
