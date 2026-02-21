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
        {/* Poster Momentum — shown on explore cards so workers can trust the poster */}
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
        <Text style={styles.company} numberOfLines={1}>{gig.company_name}</Text>
      ) : null}

      {/* Pay — prominent on explore */}
      <View style={styles.payRow}>
        <Text style={[styles.payAmount, isExplore && styles.payAmountExplore]}>
          {formatPay(gig.pay_amount, gig.pay_type)}
        </Text>
      </View>

      {/* Details grid */}
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
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={13} color={T.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {gig.venue_name}, {gig.city}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.slotsChip}>
          <Feather name="users" size={12} color={spotsLeft <= 3 ? T.secondary : T.textMuted} />
          <Text style={[styles.slotsText, spotsLeft <= 3 && styles.slotsUrgent]}>
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

      {/* Language tags (explore only) */}
      {isExplore && gig.languages_required.length > 0 ? (
        <View style={styles.tagsRow}>
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
  },
  company: {
    fontSize: 13,
    color: T.textSub,
    marginTop: 2,
  },
  payRow: {
    marginTop: 10,
  },
  payAmount: {
    fontSize: 22,
    fontWeight: "bold",
    color: T.success,
  },
  payAmountExplore: {
    fontSize: 32,
  },
  details: {
    marginTop: 14,
    gap: 8,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: T.textSub,
    flex: 1,
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
  slotsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  slotsText: {
    fontSize: 13,
    color: T.textSub,
  },
  slotsUrgent: {
    color: T.secondary,
    fontWeight: "600",
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
    textTransform: "capitalize",
  },
});
