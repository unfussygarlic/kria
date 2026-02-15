import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { Colors, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { Gig } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";

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
    if (id) {
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
        <Text>Loading...</Text>
      </View>
    );
  }

  const categoryInfo = GigCategories.find((c) => c.value === gig.category);
  const categoryColor = CategoryColors[gig.category] || Colors.text.muted;
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
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "",
        }}
      />

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
            <Feather name="calendar" size={18} color={Colors.text.secondary} />
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
            <Feather name="clock" size={18} color={Colors.text.secondary} />
            <Text style={styles.detailText}>
              {formatTime(gig.shift_start_time)} -{" "}
              {formatTime(gig.shift_end_time)}
              {gig.report_time && ` (Report by ${formatTime(gig.report_time)})`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="map-pin" size={18} color={Colors.text.secondary} />
            <Text style={styles.detailText}>
              {gig.venue_name}, {gig.city}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Feather name="users" size={18} color={Colors.text.secondary} />
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
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push(`/(main)/gig/applicants/${id}`)}
          >
            <Feather name="users" size={20} color={Colors.text.inverse} />
            <Text style={styles.primaryButtonText}>Manage Applicants</Text>
          </Pressable>
        ) : (
          <Pressable
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
          </Pressable>
        )}
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 12,
  },
  categoryText: {
    color: Colors.text.inverse,
    fontSize: 12,
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  company: {
    fontSize: 16,
    color: Colors.text.secondary,
    marginTop: 4,
  },
  eventName: {
    fontSize: 14,
    color: Colors.primary.DEFAULT,
    marginTop: 4,
  },
  payContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 16,
    gap: 4,
  },
  payAmount: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.success,
  },
  payType: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  details: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  detailText: {
    fontSize: 14,
    color: Colors.text.primary,
    flex: 1,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  requirement: {
    marginBottom: 12,
  },
  requirementLabel: {
    fontSize: 12,
    color: Colors.text.muted,
    marginBottom: 4,
  },
  requirementValue: {
    fontSize: 14,
    color: Colors.text.primary,
  },
  primaryButton: {
    backgroundColor: Colors.primary.DEFAULT,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.text.muted,
  },
  primaryButtonText: {
    color: Colors.text.inverse,
    fontSize: 18,
    fontWeight: "600",
  },
});
