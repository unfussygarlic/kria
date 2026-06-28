import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { PressableScale } from "@/components/ui/PressableScale";
import { T, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { Gig } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { rf, rw } from "@/constants/responsive";

export default function GigDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const getGig = useGigStore((s) => s.getGig);
  const applyToGig = useGigStore((s) => s.applyToGig);
  const myApplications = useGigStore((s) => s.myApplications);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!id) return;
    // Check the in-memory deck first — avoids a round-trip when user taps from explore
    const cached = useGigStore.getState().gigs.find((g) => g.id === id);
    if (cached) {
      setGig(cached);
    } else {
      getGig(id).then(setGig);
    }
  }, [id]);

  useEffect(() => {
    const applied = myApplications.some((app) => app.gig.id === id);
    setHasApplied(applied);
  }, [myApplications, id]);

  const handleApply = async () => {
    if (!id) return;

    setIsApplying(true);
    const result = await applyToGig(id);
    setIsApplying(false);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      setHasApplied(true);
      Alert.alert("Success", "Your application has been submitted!");
    }
  };

  if (!gig) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  const categoryInfo = GigCategories.find((c) => c.value === gig.category);
  const categoryColor = CategoryColors[gig.category] || T.textMuted;
  const isOwnGig = gig.poster_id === profile?.id;

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.categoryText}>{categoryInfo?.label}</Text>
        </View>

        {/* Title and Company */}
        <Text style={styles.title}>{gig.title}</Text>
        {gig.company_name && (
          <Text style={styles.company}>{gig.company_name}</Text>
        )}
        {gig.event_name && (
          <Text style={styles.eventName}>{gig.event_name}</Text>
        )}

        {/* Pay */}
        <View style={styles.payContainer}>
          <Text style={styles.payAmount}>
            ₹{gig.pay_amount.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.payType}>
            {gig.pay_type === "fixed"
              ? "Fixed"
              : gig.pay_type === "hourly"
              ? "/ hour"
              : "/ day"}
          </Text>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Feather name="calendar" size={18} color={T.textSub} />
            <Text style={styles.detailText}>
              {new Date(gig.event_date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
              {gig.is_multi_day &&
                gig.event_end_date &&
                ` - ${new Date(gig.event_end_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="clock" size={18} color={T.textSub} />
            <Text style={styles.detailText}>
              {formatTime(gig.shift_start_time)} -{" "}
              {formatTime(gig.shift_end_time)}
              {gig.report_time && ` (Report by ${formatTime(gig.report_time)})`}
            </Text>
          </View>

          <Pressable
            style={styles.detailRow}
            onPress={() => {
              if (gig.venue_lat != null && gig.venue_lng != null) {
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${gig.venue_lat},${gig.venue_lng}`
                );
              }
            }}
            disabled={gig.venue_lat == null}
          >
            <Feather name="map-pin" size={18} color={gig.venue_lat != null ? T.primary : T.textSub} />
            <Text style={[styles.detailText, gig.venue_lat != null && styles.detailLink]}>
              {gig.venue_name}, {gig.city}
            </Text>
            {gig.venue_lat != null && (
              <Feather name="external-link" size={14} color={T.primary} />
            )}
          </Pressable>

          <View style={styles.detailRow}>
            <Feather name="users" size={18} color={T.textSub} />
            <Text style={styles.detailText}>
              {gig.slots_filled} / {gig.slots_total} spots filled
            </Text>
          </View>
        </View>

        {/* Description */}
        {gig.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{gig.description}</Text>
          </View>
        )}

        {/* Requirements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>

          {gig.dress_code && (
            <View style={styles.requirement}>
              <Text style={styles.requirementLabel}>Dress Code</Text>
              <Text style={styles.requirementValue}>{gig.dress_code}</Text>
            </View>
          )}

          {gig.languages_required && gig.languages_required.length > 0 && (
            <View style={styles.requirement}>
              <Text style={styles.requirementLabel}>Languages</Text>
              <Text style={styles.requirementValue}>
                {gig.languages_required.join(", ")}
              </Text>
            </View>
          )}

          {gig.gender_preference !== "any" && (
            <View style={styles.requirement}>
              <Text style={styles.requirementLabel}>Gender</Text>
              <Text style={styles.requirementValue}>
                {gig.gender_preference === "male" ? "Male only" : "Female only"}
              </Text>
            </View>
          )}

          {gig.experience_required && (
            <View style={styles.requirement}>
              <Text style={styles.requirementLabel}>Experience</Text>
              <Text style={styles.requirementValue}>
                Prior event experience required
              </Text>
            </View>
          )}

          {gig.requirements_note && (
            <View style={styles.requirement}>
              <Text style={styles.requirementLabel}>Note</Text>
              <Text style={styles.requirementValue}>{gig.requirements_note}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky footer — always visible, no absolute positioning */}
      <StickyFooter>
        {isOwnGig ? (
          <PressableScale
            style={styles.primaryButton}
            onPress={() => router.push(`/(main)/gig/applicants/${id}`)}
          >
            <Feather name="users" size={20} color={T.ctaText} />
            <Text style={styles.primaryButtonText}>Manage Applicants</Text>
          </PressableScale>
        ) : (
          <PressableScale
            style={[
              styles.primaryButton,
              (hasApplied || gig.slots_filled >= gig.slots_total) &&
                styles.primaryButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={hasApplied || isApplying || gig.slots_filled >= gig.slots_total}
          >
            <Text style={styles.primaryButtonText}>
              {hasApplied
                ? "Applied"
                : gig.slots_filled >= gig.slots_total
                ? "Slots Full"
                : isApplying
                ? "Applying..."
                : "Apply Now"}
            </Text>
          </PressableScale>
        )}
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: T.bg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: rw(16),
    paddingBottom: rw(24),
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: rw(12),
    paddingVertical: rw(6),
    borderRadius: rw(6),
    marginBottom: rw(12),
  },
  categoryText: {
    color: T.textInverse,
    fontSize: rf(12),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
  title: {
    fontSize: rf(24),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  company: {
    fontSize: rf(16),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    marginTop: rw(4),
  },
  eventName: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.primary,
    marginTop: rw(4),
  },
  payContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: rw(16),
    gap: rw(4),
  },
  payAmount: {
    fontSize: rf(28),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.success,
  },
  payType: {
    fontSize: rf(16),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
  },
  details: {
    backgroundColor: T.surface,
    borderRadius: rw(12),
    padding: rw(16),
    marginTop: rw(20),
    gap: rw(12),
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
  },
  detailText: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
    flex: 1,
  },
  detailLink: {
    color: T.primary,
    textDecorationLine: "underline",
  },
  section: {
    marginTop: rw(24),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
    marginBottom: rw(12),
  },
  description: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    lineHeight: rf(22),
  },
  requirement: {
    marginBottom: rw(12),
  },
  requirementLabel: {
    fontSize: rf(12),
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.textMuted,
    marginBottom: rw(4),
  },
  requirementValue: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
  },
  primaryButton: {
    backgroundColor: T.ctaBg,
    height: rw(56),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: rw(8),
  },
  primaryButtonDisabled: {
    backgroundColor: T.textMuted,
  },
  primaryButtonText: {
    color: T.ctaText,
    fontSize: rf(18),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
