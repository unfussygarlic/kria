import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Linking,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGigStore } from "@/stores/gigStore";
import { useAuthStore } from "@/stores/authStore";
import { useSavedGigsStore } from "@/stores/savedGigsStore";
import { PressableScale } from "@/components/ui/PressableScale";
import { Skeleton } from "@/components/ui/Skeleton";
import { HostAvatarChip } from "@/components/gig/HostAvatarChip";
import { T, CategoryColors } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { GigCategories } from "@/constants/config";
import { Gig } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { rw } from "@/constants/responsive";

export default function GigDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [gig, setGig] = useState<Gig | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  const getGig = useGigStore((s) => s.getGig);
  const applyToGig = useGigStore((s) => s.applyToGig);
  const myApplications = useGigStore((s) => s.myApplications);
  const hosts = useGigStore((s) => s.hosts);
  const profile = useAuthStore((s) => s.profile);
  const savedIds = useSavedGigsStore((s) => s.ids);
  const toggleSaved = useSavedGigsStore((s) => s.toggle);
  const hydrateSaved = useSavedGigsStore((s) => s.hydrate);
  const isSaved = id ? savedIds.has(id) : false;

  useEffect(() => {
    hydrateSaved();
  }, [hydrateSaved]);

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
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton width="100%" height={rw(320)} borderRadius={rw(16)} style={{ aspectRatio: 4 / 5, height: undefined }} />
        <Skeleton width={rw(120)} height={rw(24)} borderRadius={rw(6)} style={{ marginTop: rw(20) }} />
        <Skeleton width="80%" height={rw(28)} borderRadius={rw(6)} style={{ marginTop: rw(12) }} />
        <Skeleton width="50%" height={rw(18)} borderRadius={rw(4)} style={{ marginTop: rw(6) }} />
        <Skeleton width={rw(160)} height={rw(38)} borderRadius={rw(8)} style={{ marginTop: rw(20) }} />
        <View style={{ marginTop: rw(24), gap: rw(10) }}>
          <Skeleton width="90%" height={rw(16)} borderRadius={rw(4)} />
          <Skeleton width="70%" height={rw(16)} borderRadius={rw(4)} />
          <Skeleton width="80%" height={rw(16)} borderRadius={rw(4)} />
        </View>
      </ScrollView>
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
        {/* Cover art */}
        {gig.cover_image_url && (
          <Image source={{ uri: gig.cover_image_url }} style={styles.cover} resizeMode="cover" />
        )}

        {/* Category Badge + Save toggle */}
        <View style={styles.topRow}>
          <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.categoryText}>{categoryInfo?.label}</Text>
          </View>
          {!isOwnGig && (
            <Pressable
              onPress={() => id && toggleSaved(id)}
              hitSlop={10}
              style={[styles.saveButton, isSaved && styles.saveButtonActive]}
            >
              <Feather
                name="bookmark"
                size={18}
                color={isSaved ? T.selText : T.text}
              />
              <Text style={[styles.saveButtonText, isSaved && styles.saveButtonTextActive]}>
                {isSaved ? "Saved" : "Save"}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Title and Company */}
        <Text style={styles.title}>{gig.title}</Text>
        {gig.company_name && (
          <Text style={styles.company}>{gig.company_name}</Text>
        )}
        {gig.event_name && (
          <Text style={styles.eventName}>{gig.event_name}</Text>
        )}

        {/* Host trust chip — face + verified + rating */}
        {hosts[gig.poster_id] && (
          <View style={styles.hostChipRow}>
            <HostAvatarChip host={hosts[gig.poster_id]!} />
          </View>
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
    padding: S.md,
    paddingBottom: S.lg,
  },
  cover: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: R.hero,
    marginBottom: S.md,
    backgroundColor: T.surface2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.sm,
    gap: S.xs,
  },
  categoryBadge: {
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
    ...SHADOW.sm,
  },
  categoryText: {
    color: "#FFFFFF",
    ...TYPE.label,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
    backgroundColor: T.surface1,
    ...SHADOW.sm,
  },
  saveButtonActive: {
    backgroundColor: T.selBg,
  },
  saveButtonText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  saveButtonTextActive: {
    color: T.selText,
  },
  title: {
    ...TYPE.title1,
    color: T.text,
  },
  company: {
    ...TYPE.bodyLg,
    color: T.textSub,
    marginTop: S.xxs,
  },
  eventName: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.primary,
    marginTop: S.xxs,
  },
  hostChipRow: {
    marginTop: S.sm,
    alignSelf: "flex-start",
  },
  payContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: S.md,
    gap: S.xxs,
  },
  payAmount: {
    ...TYPE.title1,
    fontSize: 28,
    color: T.success,
  },
  payType: {
    ...TYPE.bodyLg,
    color: T.textSub,
  },
  details: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    marginTop: S.lg,
    gap: S.sm,
    ...SHADOW.card,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
  },
  detailText: {
    ...TYPE.body,
    color: T.text,
    flex: 1,
  },
  detailLink: {
    color: T.primary,
    textDecorationLine: "underline",
  },
  section: {
    marginTop: S.xl,
  },
  sectionTitle: {
    ...TYPE.title3,
    color: T.text,
    marginBottom: S.sm,
  },
  description: {
    ...TYPE.body,
    color: T.textSub,
  },
  requirement: {
    marginBottom: S.sm,
  },
  requirementLabel: {
    ...TYPE.label,
    color: T.textMuted,
    marginBottom: 4,
  },
  requirementValue: {
    ...TYPE.body,
    color: T.text,
  },
  primaryButton: {
    backgroundColor: T.ctaBg,
    height: rw(56),
    borderRadius: R.button,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: S.xs,
    ...SHADOW.md,
  },
  primaryButtonDisabled: {
    backgroundColor: T.textMuted,
  },
  primaryButtonText: {
    color: T.ctaText,
    ...TYPE.title3,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
