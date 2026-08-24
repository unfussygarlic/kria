import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useGigStore } from "@/stores/gigStore";
import { T, CategoryColors } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import { GigCategories, Languages } from "@/constants/config";
import { GigCategory, PayType, GenderPreference } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";

export default function PostGigScreen() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [category, setCategory] = useState<GigCategory | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [eventName, setEventName] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<PayType>("fixed");
  const [venueName, setVenueName] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [eventDate, setEventDate] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [slots, setSlots] = useState("1");
  const [dressCode, setDressCode] = useState("");
  const [genderPreference, setGenderPreference] = useState<GenderPreference>("any");
  const [languages, setLanguages] = useState<string[]>(["english"]);

  const createGig = useGigStore((s) => s.createGig);

  const handleSubmit = async () => {
    if (!category || !title || !payAmount || !venueName || !eventDate) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    const result = await createGig({
      category,
      title,
      description: description || null,
      company_name: companyName || null,
      event_name: eventName || null,
      pay_amount: parseFloat(payAmount),
      pay_type: payType,
      venue_name: venueName,
      city,
      event_date: eventDate,
      shift_start_time: shiftStart,
      shift_end_time: shiftEnd,
      slots_total: parseInt(slots, 10) || 1,
      dress_code: dressCode || null,
      gender_preference: genderPreference,
      languages_required: languages,
      status: "open",
    });

    setIsSubmitting(false);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      Alert.alert("Success", "Your gig has been posted!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      if (languages.length > 1) setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  // ── Step 1: Category ──────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={styles.screen}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Text style={styles.stepTitle}>What type of gig?</Text>
          <Text style={styles.stepSubtitle}>Select a category</Text>

          <View style={styles.categoryGrid}>
            {GigCategories.map((cat) => (
              <Pressable
                key={cat.value}
                style={[
                  styles.categoryCard,
                  category === cat.value && styles.categoryCardSelected,
                  {
                    borderColor:
                      category === cat.value
                        ? CategoryColors[cat.value]
                        : T.border,
                  },
                ]}
                onPress={() => setCategory(cat.value as GigCategory)}
              >
                <View
                  style={[
                    styles.categoryIcon,
                    { backgroundColor: CategoryColors[cat.value] + "20" },
                  ]}
                >
                  <Feather
                    name={cat.icon as any}
                    size={24}
                    color={CategoryColors[cat.value]}
                  />
                </View>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <StickyFooter>
          <Pressable
            style={[styles.nextButton, !category && styles.nextButtonDisabled]}
            onPress={() => category && setStep(2)}
            disabled={!category}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={20} color={T.ctaText} />
          </Pressable>
        </StickyFooter>
      </View>
    );
  }

  // ── Step 2: Basic Info ────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backStep} onPress={() => setStep(1)}>
            <Feather name="arrow-left" size={20} color={T.primary} />
            <Text style={styles.backStepText}>Back</Text>
          </Pressable>

          <Text style={styles.stepTitle}>Gig Details</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Registration Desk Staff Needed"
                placeholderTextColor={T.textMuted}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Company/Organization</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., TechEvents India"
                placeholderTextColor={T.textMuted}
                value={companyName}
                onChangeText={setCompanyName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Event Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Bangalore Tech Summit 2026"
                placeholderTextColor={T.textMuted}
                value={eventName}
                onChangeText={setEventName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the gig, responsibilities, etc."
                placeholderTextColor={T.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>

        <StickyFooter>
          <Pressable
            style={[styles.nextButton, !title && styles.nextButtonDisabled]}
            onPress={() => title && setStep(3)}
            disabled={!title}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={20} color={T.ctaText} />
          </Pressable>
        </StickyFooter>
      </KeyboardAvoidingView>
    );
  }

  // ── Step 3: Pay, Location, Time ───────────────────────────────────────────
  if (step === 3) {
    return (
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable style={styles.backStep} onPress={() => setStep(2)}>
            <Feather name="arrow-left" size={20} color={T.primary} />
            <Text style={styles.backStepText}>Back</Text>
          </Pressable>

          <Text style={styles.stepTitle}>Pay & Schedule</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.field, { flex: 2 }]}>
                <Text style={styles.label}>Pay Amount (₹) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="500"
                  placeholderTextColor={T.textMuted}
                  value={payAmount}
                  onChangeText={setPayAmount}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Type</Text>
                <View style={styles.payTypeContainer}>
                  {(["fixed", "hourly", "per_day"] as PayType[]).map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.payTypeOption,
                        payType === type && styles.payTypeOptionSelected,
                      ]}
                      onPress={() => setPayType(type)}
                    >
                      <Text
                        style={[
                          styles.payTypeText,
                          payType === type && styles.payTypeTextSelected,
                        ]}
                      >
                        {type === "fixed" ? "Fixed" : type === "hourly" ? "/hr" : "/day"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Venue Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., KTPO Convention Center"
                placeholderTextColor={T.textMuted}
                value={venueName}
                onChangeText={setVenueName}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="Bangalore"
                placeholderTextColor={T.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Event Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-03-15"
                placeholderTextColor={T.textMuted}
                value={eventDate}
                onChangeText={setEventDate}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>Start Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:00"
                  placeholderTextColor={T.textMuted}
                  value={shiftStart}
                  onChangeText={setShiftStart}
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.label}>End Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="18:00"
                  placeholderTextColor={T.textMuted}
                  value={shiftEnd}
                  onChangeText={setShiftEnd}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Number of Workers Needed</Text>
              <TextInput
                style={styles.input}
                placeholder="5"
                placeholderTextColor={T.textMuted}
                value={slots}
                onChangeText={setSlots}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>

        <StickyFooter>
          <Pressable
            style={[
              styles.nextButton,
              (!payAmount || !venueName || !eventDate) && styles.nextButtonDisabled,
            ]}
            onPress={() => payAmount && venueName && eventDate && setStep(4)}
            disabled={!payAmount || !venueName || !eventDate}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Feather name="arrow-right" size={20} color={T.ctaText} />
          </Pressable>
        </StickyFooter>
      </KeyboardAvoidingView>
    );
  }

  // ── Step 4: Requirements & Submit ─────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable style={styles.backStep} onPress={() => setStep(3)}>
          <Feather name="arrow-left" size={20} color={T.primary} />
          <Text style={styles.backStepText}>Back</Text>
        </Pressable>

        <Text style={styles.stepTitle}>Requirements</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Dress Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Formal - black trousers, white shirt"
              placeholderTextColor={T.textMuted}
              value={dressCode}
              onChangeText={setDressCode}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Gender Preference</Text>
            <View style={styles.genderContainer}>
              {(["any", "male", "female"] as GenderPreference[]).map((pref) => (
                <Pressable
                  key={pref}
                  style={[
                    styles.genderOption,
                    genderPreference === pref && styles.genderOptionSelected,
                  ]}
                  onPress={() => setGenderPreference(pref)}
                >
                  <Text
                    style={[
                      styles.genderText,
                      genderPreference === pref && styles.genderTextSelected,
                    ]}
                  >
                    {pref === "any" ? "Any" : pref === "male" ? "Male" : "Female"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Languages Required</Text>
            <View style={styles.chipContainer}>
              {Languages.slice(0, 6).map((lang) => (
                <Pressable
                  key={lang.value}
                  style={[
                    styles.chip,
                    languages.includes(lang.value) && styles.chipSelected,
                  ]}
                  onPress={() => toggleLanguage(lang.value)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      languages.includes(lang.value) && styles.chipTextSelected,
                    ]}
                  >
                    {lang.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Posting..." : "Post Gig"}
          </Text>
        </Pressable>
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: S.md,
    paddingBottom: S.lg,
  },
  backStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: S.md,
  },
  backStepText: {
    ...TYPE.body,
    color: T.primary,
  },
  stepTitle: {
    ...TYPE.title1,
    color: T.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    ...TYPE.body,
    color: T.textSub,
    marginBottom: S.lg,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.sm,
    marginBottom: S.xs,
  },
  categoryCard: {
    width: "47%",
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    alignItems: "center",
    ...SHADOW.card,
  },
  categoryCardSelected: {
    backgroundColor: T.selBg,
  },
  categoryIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: S.xs,
  },
  categoryLabel: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
    textAlign: "center",
  },
  form: {
    gap: S.lg,
    marginTop: S.xs,
  },
  field: {
    gap: S.xs,
  },
  row: {
    flexDirection: "row",
    gap: S.sm,
  },
  label: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },
  input: {
    backgroundColor: T.surface2,
    borderRadius: R.input,
    paddingHorizontal: S.md,
    height: rw(52),
    ...TYPE.bodyLg,
    color: T.text,
    ...SHADOW.sm,
  },
  textArea: {
    height: rw(100),
    paddingTop: S.sm,
  },
  payTypeContainer: {
    flexDirection: "row",
    gap: S.xs,
  },
  payTypeOption: {
    flex: 1,
    paddingVertical: S.sm,
    borderRadius: R.button,
    backgroundColor: T.surface2,
    alignItems: "center",
  },
  payTypeOptionSelected: {
    backgroundColor: T.selBg,
  },
  payTypeText: {
    ...TYPE.caption,
    color: T.textSub,
  },
  payTypeTextSelected: {
    color: T.selText,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  genderContainer: {
    flexDirection: "row",
    gap: S.xs,
  },
  genderOption: {
    flex: 1,
    paddingVertical: S.sm,
    borderRadius: R.button,
    backgroundColor: T.surface2,
    alignItems: "center",
  },
  genderOptionSelected: {
    backgroundColor: T.selBg,
  },
  genderText: {
    ...TYPE.body,
    color: T.textSub,
  },
  genderTextSelected: {
    color: T.selText,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.xs,
  },
  chip: {
    paddingHorizontal: S.md,
    paddingVertical: S.xs,
    borderRadius: R.chip,
    backgroundColor: T.surface2,
    ...SHADOW.sm,
  },
  chipSelected: {
    backgroundColor: T.selBg,
  },
  chipText: {
    ...TYPE.body,
    color: T.textSub,
  },
  chipTextSelected: {
    color: T.selText,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs,
    backgroundColor: T.ctaBg,
    height: rw(56),
    borderRadius: R.button,
    ...SHADOW.md,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: T.ctaText,
    ...TYPE.title3,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: T.success,
    height: rw(56),
    borderRadius: R.button,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    ...TYPE.title3,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
});
