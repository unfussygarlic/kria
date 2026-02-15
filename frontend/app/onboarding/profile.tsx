import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/constants/colors";
import { GenderType } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";

const TOTAL_STEPS = 4;

function maxDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  return d;
}

function defaultDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 20);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface GenderOption {
  value: GenderType;
  label: string;
  emoji: string;
}

const GENDER_OPTIONS: GenderOption[] = [
  { value: "male", label: "Male", emoji: "♂" },
  { value: "female", label: "Female", emoji: "♀" },
  { value: "non_binary", label: "Non-Binary", emoji: "⚧" },
];

export default function OnboardingProfileScreen() {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [dob, setDob] = useState<Date>(defaultDob());
  const [dobSelected, setDobSelected] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [gender, setGender] = useState<GenderType | null>(null);

  const [city, setCity] = useState("Bangalore");
  const [state, setState] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const goNext = () => { setError(""); setStep((s) => (s + 1) as 1 | 2 | 3 | 4); };
  const goBack = () => { setError(""); setStep((s) => (s - 1) as 1 | 2 | 3 | 4); };

  const handleStep1 = () => {
    if (!firstName.trim()) { setError("Please enter your first name"); return; }
    if (!lastName.trim()) { setError("Please enter your last name"); return; }
    goNext();
  };

  const onDateChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) { setDob(selected); setDobSelected(true); }
  };
  const handleStep2 = () => {
    if (!dobSelected) { setError("Please select your date of birth"); return; }
    goNext();
  };

  const handleStep3 = () => {
    if (!gender) { setError("Please select how you identify"); return; }
    goNext();
  };

  const handleSubmit = async () => {
    if (!city.trim()) { setError("Please enter your city"); return; }
    if (!state.trim()) { setError("Please enter your state"); return; }
    if (!gender) return;

    setIsLoading(true);
    setError("");

    const result = await updateProfile({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: `${firstName.trim()} ${lastName.trim()}`,
      date_of_birth: dob.toISOString().split("T")[0],
      gender,
      city: city.trim(),
      state: state.trim(),
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOnboarded(true);
      router.replace("/(main)/(tabs)");
    }
  };

  const StepHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <View style={styles.stepHeader}>
      <Text style={styles.stepIndicator}>{step} of {TOTAL_STEPS}</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      {subtitle && <Text style={styles.stepSubtitle}>{subtitle}</Text>}
    </View>
  );

  // ── Step 1: Name ─────────────────────────────────────────────────────────
  if (step === 1) {
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
          <StepHeader
            title={"What's your\nname?"}
            subtitle="This is how gig posters and workers will see you."
          />

          <View style={styles.nameRow}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="First"
                placeholderTextColor={Colors.text.muted}
                value={firstName}
                onChangeText={(t) => { setFirstName(t); setError(""); }}
                autoFocus
                returnKeyType="next"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Last"
                placeholderTextColor={Colors.text.muted}
                value={lastName}
                onChangeText={(t) => { setLastName(t); setError(""); }}
                returnKeyType="done"
                onSubmitEditing={handleStep1}
              />
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <StickyFooter>
          <Pressable
            style={[styles.button, (!firstName.trim() || !lastName.trim()) && styles.buttonDisabled]}
            onPress={handleStep1}
            disabled={!firstName.trim() || !lastName.trim()}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </Pressable>
        </StickyFooter>
      </KeyboardAvoidingView>
    );
  }

  // ── Step 2: Date of Birth ─────────────────────────────────────────────────
  if (step === 2) {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <StepHeader
            title={"When were\nyou born?"}
            subtitle="We use this to show age-appropriate gigs."
          />

          <Pressable
            style={styles.dateButton}
            onPress={() => setShowPicker(true)}
          >
            <Text style={styles.dateButtonLabel}>Date of Birth</Text>
            <Text
              style={[
                styles.dateButtonValue,
                !dobSelected && { color: Colors.text.muted },
              ]}
            >
              {dobSelected ? formatDate(dob) : "Tap to select"}
            </Text>
          </Pressable>

          {showPicker && (
            <DateTimePicker
              value={dob}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              maximumDate={maxDob()}
              onChange={onDateChange}
            />
          )}

          {showPicker && Platform.OS === "ios" && (
            <Pressable
              style={styles.pickerDoneButton}
              onPress={() => { setShowPicker(false); setDobSelected(true); }}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </Pressable>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        {!showPicker && (
          <StickyFooter>
            <Pressable
              style={[styles.button, !dobSelected && styles.buttonDisabled]}
              onPress={handleStep2}
              disabled={!dobSelected}
            >
              <Text style={styles.buttonText}>Continue →</Text>
            </Pressable>
          </StickyFooter>
        )}
      </View>
    );
  }

  // ── Step 3: Gender ────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <View style={styles.screen}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>

          <StepHeader
            title={"How do you\nidentify?"}
            subtitle="Helps posters find the right fit for their gig requirements."
          />

          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.genderCard,
                  gender === opt.value && styles.genderCardSelected,
                ]}
                onPress={() => { setGender(opt.value); setError(""); }}
              >
                <Text style={styles.genderEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.genderLabel,
                    gender === opt.value && styles.genderLabelSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        <StickyFooter>
          <Pressable
            style={[styles.button, !gender && styles.buttonDisabled]}
            onPress={handleStep3}
            disabled={!gender}
          >
            <Text style={styles.buttonText}>Continue →</Text>
          </Pressable>
        </StickyFooter>
      </View>
    );
  }

  // ── Step 4: Location ──────────────────────────────────────────────────────
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
        <Pressable onPress={goBack}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <StepHeader
          title={"Where are\nyou based?"}
          subtitle="We'll show you gigs close to home."
        />

        <View style={styles.field}>
          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Bangalore"
            placeholderTextColor={Colors.text.muted}
            value={city}
            onChangeText={setCity}
            autoFocus
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>State *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Karnataka"
            placeholderTextColor={Colors.text.muted}
            value={state}
            onChangeText={setState}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Saving..." : "Let's Go!"}
          </Text>
        </Pressable>
      </StickyFooter>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 24,
    gap: 24,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary.DEFAULT,
  },

  stepHeader: {
    gap: 8,
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary.DEFAULT,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  stepTitle: {
    fontSize: 34,
    fontWeight: "bold",
    color: Colors.text.primary,
    lineHeight: 42,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
  },

  nameRow: {
    flexDirection: "row",
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: Colors.text.primary,
  },

  dateButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary.DEFAULT,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  dateButtonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dateButtonValue: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.primary[50],
    borderRadius: 8,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary.DEFAULT,
  },

  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 16,
    gap: 8,
  },
  genderCardSelected: {
    borderColor: Colors.primary.DEFAULT,
    backgroundColor: Colors.primary[50],
  },
  genderEmoji: {
    fontSize: 28,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.text.secondary,
  },
  genderLabelSelected: {
    color: Colors.primary.DEFAULT,
  },

  error: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: Colors.primary.DEFAULT,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 18,
    fontWeight: "600",
  },
});
