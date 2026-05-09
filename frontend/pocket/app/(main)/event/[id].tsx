import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getEvent } from "@/lib/api/events";
import { EventResponse, EventJobSummary } from "@/types/database";
import { T, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { formatDate, formatTime, formatPay } from "@/components/gig/JobCard";
import { useAuthStore } from "@/stores/authStore";

// ── Job row inside event ──────────────────────────────────────────────────────

function EventJobRow({ job, onPress, isHost }: { job: EventJobSummary; onPress: () => void; isHost: boolean }) {
  const catColor = CategoryColors[job.category] || T.textMuted;
  const catLabel = GigCategories.find((c) => c.value === job.category)?.label ?? job.category;
  const spotsLeft = job.slots_total - job.slots_filled;

  return (
    <Pressable style={styles.jobRow} onPress={onPress}>
      <View style={[styles.catDot, { backgroundColor: catColor }]} />
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.jobTitleRow}>
          <Text style={styles.jobTitle} numberOfLines={1}>{job.title}</Text>
          <View style={[styles.catBadge, { backgroundColor: catColor }]}>
            <Text style={styles.catBadgeText}>{catLabel}</Text>
          </View>
        </View>
        <View style={styles.jobMeta}>
          <Text style={styles.jobMetaText}>
            {formatTime(job.shift_start_time)} – {formatTime(job.shift_end_time)}
          </Text>
          <Text style={styles.jobMetaSep}>·</Text>
          <Text style={styles.jobMetaText}>{formatPay(job.pay_amount, job.pay_type)}</Text>
          <Text style={styles.jobMetaSep}>·</Text>
          <Text style={[styles.jobMetaText, spotsLeft <= 3 && { color: T.tertiary }]}>
            {spotsLeft} spots left
          </Text>
        </View>
        {isHost && job.application_count > 0 ? (
          <View style={styles.applicantsChip}>
            <Feather name="user-check" size={11} color={T.primary} />
            <Text style={styles.applicantsText}>
              {job.application_count} pending {job.application_count === 1 ? "applicant" : "applicants"}
            </Text>
          </View>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={T.textMuted} />
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError("");
    const result = await getEvent(id);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEvent(result.data);
    }
  };

  useEffect(() => { load(); }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error || "Event not found."}</Text>
        <Pressable style={styles.retryBtn} onPress={load}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const isHost = event.poster_id === profile?.id;
  const totalApplicants = event.jobs.reduce((s, j) => s + j.application_count, 0);

  return (
    <View style={styles.screen}>
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{event.title}</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Event info card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="calendar" size={16} color={T.textMuted} />
            <Text style={styles.infoText}>{formatDate(event.event_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={16} color={T.textMuted} />
            <Text style={styles.infoText}>{event.venue_name}, {event.city}</Text>
          </View>
          {event.description ? (
            <Text style={styles.description}>{event.description}</Text>
          ) : null}

          <View style={styles.summaryRow}>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>{event.jobs.length}</Text>
              <Text style={styles.summaryLabel}>Jobs</Text>
            </View>
            <View style={styles.summaryChip}>
              <Text style={styles.summaryValue}>
                {event.jobs.reduce((s, j) => s + j.slots_total, 0)}
              </Text>
              <Text style={styles.summaryLabel}>Total Slots</Text>
            </View>
            {isHost ? (
              <View style={styles.summaryChip}>
                <Text style={[styles.summaryValue, { color: T.primary }]}>
                  {totalApplicants}
                </Text>
                <Text style={styles.summaryLabel}>Applicants</Text>
              </View>
            ) : (
              <View style={styles.summaryChip}>
                <Text style={styles.summaryValue}>
                  {event.jobs.reduce((s, j) => s + (j.slots_total - j.slots_filled), 0)}
                </Text>
                <Text style={styles.summaryLabel}>Open Slots</Text>
              </View>
            )}
          </View>
        </View>

        {/* Jobs list */}
        <Text style={styles.sectionTitle}>Jobs in this Event</Text>
        <View style={styles.jobsList}>
          {event.jobs.map((job) => (
            <EventJobRow
              key={job.id}
              job={job}
              isHost={isHost}
              onPress={() =>
                isHost
                  ? router.push(`/(main)/gig/applicants/${job.id}`)
                  : router.push(`/(main)/gig/${job.id}` as any)
              }
            />
          ))}
        </View>
      </ScrollView>

      {isHost && (
        <StickyFooter>
          <Pressable
            style={styles.addJobButton}
            onPress={() => router.push(`/(main)/event/add-job?eventId=${id}`)}
          >
            <Feather name="plus" size={20} color={T.ctaText} />
            <Text style={styles.addJobText}>Add Another Job</Text>
          </Pressable>
        </StickyFooter>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  center: { justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: T.text, flex: 1, textAlign: "center" },
  content: { padding: 16, gap: 16, paddingBottom: 24 },
  infoCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, color: T.textSub, flex: 1 },
  description: { fontSize: 14, color: T.textSub, lineHeight: 20 },
  summaryRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  summaryChip: {
    flex: 1,
    alignItems: "center",
    backgroundColor: T.bg,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  summaryValue: { fontSize: 20, fontWeight: "700", color: T.text },
  summaryLabel: { fontSize: 11, color: T.textMuted, fontWeight: "600" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: T.text },
  jobsList: { gap: 8 },
  // Job row
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  catDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  jobTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  jobTitle: { fontSize: 15, fontWeight: "600", color: T.text, flex: 1 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  catBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  jobMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  jobMetaText: { fontSize: 12, color: T.textSub },
  jobMetaSep: { fontSize: 12, color: T.textMuted },
  applicantsChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  applicantsText: { fontSize: 12, color: T.primary, fontWeight: "600" },
  // Footer
  addJobButton: {
    backgroundColor: T.ctaBg,
    height: 54,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  addJobText: { color: T.ctaText, fontSize: 17, fontWeight: "600" },
  // Error
  errorText: { fontSize: 15, color: T.error, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: T.ctaBg,
    borderRadius: 10,
  },
  retryText: { fontSize: 15, fontWeight: "600", color: T.ctaText },
});
