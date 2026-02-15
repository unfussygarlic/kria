import { View, Text, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Gig } from "@/types/database";
import { Colors, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";

interface GigCardProps {
  gig: Gig;
  onPress: () => void;
}

export function GigCard({ gig, onPress }: GigCardProps) {
  const categoryInfo = GigCategories.find((c) => c.value === gig.category);
  const categoryColor = CategoryColors[gig.category] || Colors.text.muted;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const spotsLeft = gig.slots_total - gig.slots_filled;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.categoryBadge, { backgroundColor: categoryColor }]}
        >
          <Text style={styles.categoryText}>{categoryInfo?.label}</Text>
        </View>
        {gig.momentum_boost > 0 && (
          <View style={styles.boostBadge}>
            <Feather name="zap" size={12} color={Colors.momentum.DEFAULT} />
            <Text style={styles.boostText}>Boosted</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>
        {gig.title}
      </Text>

      {/* Company */}
      {gig.company_name && (
        <Text style={styles.company}>{gig.company_name}</Text>
      )}

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailItem}>
          <Feather name="calendar" size={14} color={Colors.text.muted} />
          <Text style={styles.detailText}>
            {formatDate(gig.event_date)}
            {gig.is_multi_day && " - " + formatDate(gig.event_end_date!)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="clock" size={14} color={Colors.text.muted} />
          <Text style={styles.detailText}>
            {formatTime(gig.shift_start_time)} - {formatTime(gig.shift_end_time)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Feather name="map-pin" size={14} color={Colors.text.muted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {gig.venue_name}
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.payContainer}>
          <Text style={styles.payAmount}>
            ₹{gig.pay_amount.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.payType}>
            {gig.pay_type === "fixed"
              ? ""
              : gig.pay_type === "hourly"
              ? "/hr"
              : "/day"}
          </Text>
        </View>
        <View style={styles.spotsContainer}>
          <Text
            style={[
              styles.spotsText,
              spotsLeft <= 3 && styles.spotsTextUrgent,
            ]}
          >
            {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: Colors.text.inverse,
    fontSize: 11,
    fontWeight: "600",
  },
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.momentum.light,
    borderRadius: 6,
  },
  boostText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.momentum.DEFAULT,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
    lineHeight: 24,
  },
  company: {
    fontSize: 14,
    color: Colors.text.secondary,
    marginTop: 2,
  },
  details: {
    marginTop: 12,
    gap: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: Colors.text.secondary,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  payContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  payAmount: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.success,
  },
  payType: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  spotsContainer: {},
  spotsText: {
    fontSize: 13,
    color: Colors.text.secondary,
  },
  spotsTextUrgent: {
    color: Colors.secondary.DEFAULT,
    fontWeight: "600",
  },
});
