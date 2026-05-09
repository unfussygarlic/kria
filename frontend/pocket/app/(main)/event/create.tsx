import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useGigStore } from "@/stores/gigStore";
import { T, CategoryColors } from "@/constants/colors";
import { GigCategories } from "@/constants/config";
import { GigCategory } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";
import { JobInEventCreate } from "@/lib/api/events";

const TOTAL_STEPS = 3;

function formatDateDisplay(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();
  const createEvent = useGigStore((s) => s.createEvent);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Step 1: Event basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("");
  const [eventDate, setEventDate] = useState<Date>(new Date());
  const [dateSelected, setDateSelected] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── Step 2: First job
  const [selectedCategory, setSelectedCategory] = useState<GigCategory | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<"fixed" | "hourly" | "per_day">("fixed");
  const [slotsTotal, setSlotsTotal] = useState("1");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");

  const goNext = () => { setError(""); setStep((s) => (s + 1) as 1 | 2 | 3); };
  const goBack = () => { setError(""); setStep((s) => (s - 1) as 1 | 2 | 3); };

  const validateStep1 = () => {
    if (!title.trim()) { setError("Event title is required"); return false; }
    if (!venueName.trim()) { setError("Venue name is required"); return false; }
    if (!city.trim()) { setError("City is required"); return false; }
    if (!dateSelected) { setError("Please select an event date"); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!selectedCategory) { setError("Please select a job category"); return false; }
    if (!jobTitle.trim()) { setError("Job title is required"); return false; }
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
      setError("Please enter a valid pay amount"); return false;
    }
    if (!shiftStart || !shiftEnd) { setError("Shift times are required"); return false; }
    return true;
  };

  const handlePost = async () => {
    if (!validateStep2()) return;
    setIsLoading(true);
    setError("");

    const job: JobInEventCreate = {
      category: selectedCategory!,
      title: jobTitle.trim(),
      pay_amount: Number(payAmount),
      pay_type: payType,
      slots_total: parseInt(slotsTotal) || 1,
      shift_start_time: shiftStart,
      shift_end_time: shiftEnd,
    };

    const result = await createEvent({
      title: title.trim(),
      description: description.trim() || null,
      venue_name: venueName.trim(),
      city: city.trim(),
      event_date: eventDate.toISOString().split("T")[0],
      jobs: [job],
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setStep(1);
    } else {
      router.replace("/(main)/(tabs)/space");
    }
  };

  // ── Step 3: Review ────────────────────────────────────────────────────────
  if (step === 3) {
    const cat = GigCategories.find((c) => c.value === selectedCategory);
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={T.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Review Event</Text>
          <Text style={styles.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.body}>
          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Event</Text>
            <Text style={styles.reviewValue}>{title}</Text>
            <Text style={styles.reviewMeta}>{venueName}, {city} · {formatDateDisplay(eventDate)}</Text>
            {description ? <Text style={styles.reviewDesc}>{description}</Text> : null}
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>First Job</Text>
            <View style={[styles.catBadge, { backgroundColor: CategoryColors[selectedCategory!] || T.textMuted }]}>
              <Text style={styles.catBadgeText}>{cat?.label}</Text>
            </View>
            <Text style={styles.reviewValue}>{jobTitle}</Text>
            <Text style={styles.reviewMeta}>
              ₹{Number(payAmount).toLocaleString("en-IN")}{payType === "hourly" ? "/hr" : payType === "per_day" ? "/day" : ""} ·
              {" "}{slotsTotal} {parseInt(slotsTotal) === 1 ? "slot" : "slots"} ·
              {" "}{shiftStart} – {shiftEnd}
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <StickyFooter>
          <Pressable
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePost}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>{isLoading ? "Posting..." : "Post Event"}</Text>
          </Pressable>
        </StickyFooter>
      </View>
    );
  }

  // ── Step 2: First job ─────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={goBack} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={T.text} />
          </Pressable>
          <Text style={styles.headerTitle}>First Job</Text>
          <Text style={styles.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
        </View>

        <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          {/* Category grid */}
          <Text style={styles.sectionTitle}>Job Category</Text>
          <View style={styles.categoryGrid}>
            {GigCategories.map((cat) => (
              <Pressable
                key={cat.value}
                style={[
                  styles.catCard,
                  selectedCategory === cat.value && styles.catCardSelected,
                ]}
                onPress={() => { setSelectedCategory(cat.value as GigCategory); setError(""); }}
              >
                <View style={[styles.catDot, { backgroundColor: CategoryColors[cat.value] || T.textMuted }]} />
                <Text style={[styles.catLabel, selectedCategory === cat.value && styles.catLabelSelected]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Job title */}
          <View style={styles.field}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Event Cook"
              placeholderTextColor={T.textMuted}
              value={jobTitle}
              onChangeText={(t) => { setJobTitle(t); setError(""); }}
            />
          </View>

          {/* Pay */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.label}>Pay Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1500"
                placeholderTextColor={T.textMuted}
                value={payAmount}
                onChangeText={(t) => { setPayAmount(t); setError(""); }}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Per</Text>
              <View style={styles.payTypeRow}>
                {(["fixed", "hourly", "per_day"] as const).map((pt) => (
                  <Pressable
                    key={pt}
                    style={[styles.payTypeBtn, payType === pt && styles.payTypeBtnSelected]}
                    onPress={() => setPayType(pt)}
                  >
                    <Text style={[styles.payTypeBtnText, payType === pt && styles.payTypeBtnTextSelected]}>
                      {pt === "fixed" ? "Fixed" : pt === "hourly" ? "Hour" : "Day"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          {/* Slots + Shift */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Slots</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                placeholderTextColor={T.textMuted}
                value={slotsTotal}
                onChangeText={setSlotsTotal}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Start Time</Text>
              <TextInput
                style={styles.input}
                placeholder="09:00"
                placeholderTextColor={T.textMuted}
                value={shiftStart}
                onChangeText={setShiftStart}
                autoCapitalize="none"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>End Time</Text>
              <TextInput
                style={styles.input}
                placeholder="17:00"
                placeholderTextColor={T.textMuted}
                value={shiftEnd}
                onChangeText={setShiftEnd}
                autoCapitalize="none"
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <StickyFooter>
          <Pressable style={styles.button} onPress={() => { if (validateStep2()) goNext(); }}>
            <Text style={styles.buttonText}>Review →</Text>
          </Pressable>
        </StickyFooter>
      </View>
    );
  }

  // ── Step 1: Event basics ──────────────────────────────────────────────────
  return (
    <View
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Create Event</Text>
        <Text style={styles.stepIndicator}>{step}/{TOTAL_STEPS}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.field}>
          <Text style={styles.label}>Event Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Sharma Wedding"
            placeholderTextColor={T.textMuted}
            value={title}
            onChangeText={(t) => { setTitle(t); setError(""); }}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Venue *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Hotel Grand Ashoka"
            placeholderTextColor={T.textMuted}
            value={venueName}
            onChangeText={(t) => { setVenueName(t); setError(""); }}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Bangalore"
            placeholderTextColor={T.textMuted}
            value={city}
            onChangeText={(t) => { setCity(t); setError(""); }}
          />
        </View>

        {/* Date picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Date *</Text>
          <Pressable
            style={[styles.input, styles.dateButton]}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={dateSelected ? styles.dateText : styles.datePlaceholder}>
              {dateSelected ? formatDateDisplay(eventDate) : "Tap to select date"}
            </Text>
          </Pressable>
        </View>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={eventDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={new Date()}
              textColor="#000000"
              accentColor={T.primary}
              themeVariant="light"
              onChange={(_: DateTimePickerEvent, d?: Date) => {
                if (Platform.OS === "android") setShowDatePicker(false);
                if (d) { setEventDate(d); setDateSelected(true); }
              }}
            />
            {Platform.OS === "ios" && (
              <Pressable
                style={styles.doneButton}
                onPress={() => { setShowDatePicker(false); setDateSelected(true); }}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Brief description of the event..."
            placeholderTextColor={T.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[styles.button, (!title.trim() || !venueName.trim() || !city.trim()) && styles.buttonDisabled]}
          onPress={() => { if (validateStep1()) goNext(); }}
          disabled={!title.trim() || !venueName.trim() || !city.trim()}
        >
          <Text style={styles.buttonText}>Next: Add First Job →</Text>
        </Pressable>
      </StickyFooter>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
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
  headerTitle: { fontSize: 17, fontWeight: "600", color: T.text },
  stepIndicator: { fontSize: 13, color: T.textMuted, fontWeight: "600" },
  body: { padding: 20, gap: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: T.text },
  field: { gap: 6 },
  row: { flexDirection: "row", gap: 10 },
  label: { fontSize: 13, fontWeight: "600", color: T.textSub },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: T.text,
  },
  multiline: { height: 88, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  dateButton: { justifyContent: "center" },
  dateText: { fontSize: 15, color: T.text },
  datePlaceholder: { fontSize: 15, color: T.textMuted },
  datePickerContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  doneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: T.ctaBg,
    borderRadius: 8,
    marginTop: 8,
  },
  doneButtonText: { fontSize: 15, fontWeight: "600", color: T.ctaText },
  // Category grid
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  catCardSelected: { borderColor: T.selBorder, backgroundColor: T.selBg },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 13, color: T.textSub, fontWeight: "500" },
  catLabelSelected: { color: T.selText, fontWeight: "700" },
  // Pay type buttons
  payTypeRow: { flexDirection: "column", gap: 4 },
  payTypeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  payTypeBtnSelected: { borderColor: T.selBorder, backgroundColor: T.selBg },
  payTypeBtnText: { fontSize: 12, color: T.textSub, fontWeight: "500" },
  payTypeBtnTextSelected: { color: T.selText, fontWeight: "700" },
  // Review card
  reviewCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: T.border,
  },
  reviewLabel: { fontSize: 11, fontWeight: "700", color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  reviewValue: { fontSize: 18, fontWeight: "700", color: T.text },
  reviewMeta: { fontSize: 14, color: T.textSub },
  reviewDesc: { fontSize: 14, color: T.textSub, lineHeight: 20 },
  catBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  catBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  // Shared
  error: { color: T.error, fontSize: 14, textAlign: "center" },
  button: {
    backgroundColor: T.ctaBg,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: T.ctaText, fontSize: 17, fontWeight: "600" },
});
