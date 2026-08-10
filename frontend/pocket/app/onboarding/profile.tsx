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
  Modal,
  FlatList,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { GenderType } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";

const TOTAL_STEPS = 4;

// ── India cities with auto-filled state ─────────────────────────────────────

const INDIA_CITIES: { city: string; state: string }[] = [
  { city: "Agra", state: "Uttar Pradesh" },
  { city: "Ahmedabad", state: "Gujarat" },
  { city: "Aligarh", state: "Uttar Pradesh" },
  { city: "Allahabad", state: "Uttar Pradesh" },
  { city: "Amritsar", state: "Punjab" },
  { city: "Amravati", state: "Maharashtra" },
  { city: "Aurangabad", state: "Maharashtra" },
  { city: "Bangalore", state: "Karnataka" },
  { city: "Bareilly", state: "Uttar Pradesh" },
  { city: "Bhilai", state: "Chhattisgarh" },
  { city: "Bhiwandi", state: "Maharashtra" },
  { city: "Bhopal", state: "Madhya Pradesh" },
  { city: "Bhubaneswar", state: "Odisha" },
  { city: "Bikaner", state: "Rajasthan" },
  { city: "Chandigarh", state: "Chandigarh" },
  { city: "Chennai", state: "Tamil Nadu" },
  { city: "Coimbatore", state: "Tamil Nadu" },
  { city: "Cuttack", state: "Odisha" },
  { city: "Delhi", state: "Delhi" },
  { city: "Dhanbad", state: "Jharkhand" },
  { city: "Faridabad", state: "Haryana" },
  { city: "Ghaziabad", state: "Uttar Pradesh" },
  { city: "Gorakhpur", state: "Uttar Pradesh" },
  { city: "Guntur", state: "Andhra Pradesh" },
  { city: "Guwahati", state: "Assam" },
  { city: "Gwalior", state: "Madhya Pradesh" },
  { city: "Howrah", state: "West Bengal" },
  { city: "Hubli-Dharwad", state: "Karnataka" },
  { city: "Hyderabad", state: "Telangana" },
  { city: "Indore", state: "Madhya Pradesh" },
  { city: "Jabalpur", state: "Madhya Pradesh" },
  { city: "Jaipur", state: "Rajasthan" },
  { city: "Jalandhar", state: "Punjab" },
  { city: "Jamshedpur", state: "Jharkhand" },
  { city: "Jodhpur", state: "Rajasthan" },
  { city: "Kanpur", state: "Uttar Pradesh" },
  { city: "Kochi", state: "Kerala" },
  { city: "Kolkata", state: "West Bengal" },
  { city: "Kota", state: "Rajasthan" },
  { city: "Kozhikode", state: "Kerala" },
  { city: "Lucknow", state: "Uttar Pradesh" },
  { city: "Ludhiana", state: "Punjab" },
  { city: "Madurai", state: "Tamil Nadu" },
  { city: "Mangaluru", state: "Karnataka" },
  { city: "Meerut", state: "Uttar Pradesh" },
  { city: "Moradabad", state: "Uttar Pradesh" },
  { city: "Mumbai", state: "Maharashtra" },
  { city: "Mysuru", state: "Karnataka" },
  { city: "Nagpur", state: "Maharashtra" },
  { city: "Nashik", state: "Maharashtra" },
  { city: "Navi Mumbai", state: "Maharashtra" },
  { city: "Noida", state: "Uttar Pradesh" },
  { city: "Patna", state: "Bihar" },
  { city: "Pimpri-Chinchwad", state: "Maharashtra" },
  { city: "Pune", state: "Maharashtra" },
  { city: "Raipur", state: "Chhattisgarh" },
  { city: "Rajkot", state: "Gujarat" },
  { city: "Ranchi", state: "Jharkhand" },
  { city: "Saharanpur", state: "Uttar Pradesh" },
  { city: "Salem", state: "Tamil Nadu" },
  { city: "Solapur", state: "Maharashtra" },
  { city: "Srinagar", state: "Jammu & Kashmir" },
  { city: "Surat", state: "Gujarat" },
  { city: "Thane", state: "Maharashtra" },
  { city: "Thiruvananthapuram", state: "Kerala" },
  { city: "Tiruchirappalli", state: "Tamil Nadu" },
  { city: "Tiruppur", state: "Tamil Nadu" },
  { city: "Vadodara", state: "Gujarat" },
  { city: "Varanasi", state: "Uttar Pradesh" },
  { city: "Vasai-Virar", state: "Maharashtra" },
  { city: "Vijayawada", state: "Andhra Pradesh" },
  { city: "Visakhapatnam", state: "Andhra Pradesh" },
  { city: "Warangal", state: "Telangana" },
];

// ── Date helpers ─────────────────────────────────────────────────────────────

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

// ── Gender options ────────────────────────────────────────────────────────────

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

// ── City Picker Modal ─────────────────────────────────────────────────────────

function CityPickerModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (city: string, state: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  // presentationStyle="pageSheet" is iOS-only; on Android the modal is
  // full-screen so we need to pad past the status bar ourselves.
  const insets = useSafeAreaInsets();

  const filtered = search.trim()
    ? INDIA_CITIES.filter((c) =>
        c.city.toLowerCase().includes(search.toLowerCase())
      )
    : INDIA_CITIES;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={picker.sheet}>
        {/* Header */}
        <View style={[picker.header, { paddingTop: insets.top + 14 }]}>
          <Text style={picker.headerTitle}>Select City</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Feather name="x" size={22} color={T.text} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={picker.searchRow}>
          <Feather name="search" size={16} color={T.textMuted} />
          <TextInput
            style={picker.searchInput}
            placeholder="Search city…"
            placeholderTextColor={T.textMuted}
            value={search}
            onChangeText={setSearch}
            autoFocus
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={8}>
              <Feather name="x" size={15} color={T.textMuted} />
            </Pressable>
          )}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.city}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={picker.cityRow}
              onPress={() => {
                onSelect(item.city, item.state);
                onClose();
                setSearch("");
              }}
            >
              <View>
                <Text style={picker.cityName}>{item.city}</Text>
                <Text style={picker.stateName}>{item.state}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={T.textMuted} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={picker.sep} />}
        />
      </View>
    </Modal>
  );
}

const picker = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface3,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
    padding: 0,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  cityName: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
  },
  stateName: {
    fontSize: 12,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textMuted,
    marginTop: 2,
  },
  sep: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: 20,
  },
});

// ── Main Onboarding Screen ────────────────────────────────────────────────────

export default function OnboardingProfileScreen() {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const signOut = useAuthStore((s) => s.signOut);

  const handleChangePhone = async () => {
    await signOut();
    router.replace("/");
  };

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [dob, setDob] = useState<Date>(defaultDob());
  const [dobSelected, setDobSelected] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [gender, setGender] = useState<GenderType | null>(null);

  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);

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
    if (!city.trim()) { setError("Please select your city"); return; }
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
      router.replace("/(main)/(tabs)/explore");
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
          <Pressable onPress={handleChangePhone}>
            <Text style={styles.backText}>← Change Phone</Text>
          </Pressable>

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
                placeholderTextColor={T.textMuted}
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
                placeholderTextColor={T.textMuted}
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
                !dobSelected && { color: T.textMuted },
              ]}
            >
              {dobSelected ? formatDate(dob) : "Tap to select"}
            </Text>
          </Pressable>

          {showPicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={dob}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                maximumDate={maxDob()}
                onChange={onDateChange}
                textColor="#000000"
              />
            </View>
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

        {/* City picker */}
        <View style={styles.field}>
          <Text style={styles.label}>City *</Text>
          <Pressable style={styles.pickerButton} onPress={() => setShowCityPicker(true)}>
            <Text style={[styles.pickerButtonText, !city && { color: T.textMuted }]}>
              {city || "Select your city"}
            </Text>
            <Feather name="chevron-down" size={18} color={T.textMuted} />
          </Pressable>
        </View>

        {/* State (auto-filled, read-only) */}
        {state ? (
          <View style={styles.field}>
            <Text style={styles.label}>State</Text>
            <View style={[styles.pickerButton, styles.pickerButtonReadOnly]}>
              <Text style={styles.pickerButtonText}>{state}</Text>
              <Feather name="check" size={16} color={T.primary} />
            </View>
          </View>
        ) : null}

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

      <CityPickerModal
        visible={showCityPicker}
        onSelect={(c, s) => { setCity(c); setState(s); }}
        onClose={() => setShowCityPicker(false)}
      />
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
    paddingHorizontal: 28,
    paddingTop: 64,
    paddingBottom: 24,
    gap: 24,
  },
  backText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_500Medium",
    color: T.primary,
  },

  stepHeader: {
    gap: 8,
  },
  stepIndicator: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  stepTitle: {
    fontSize: 34,
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    lineHeight: 42,
  },
  stepSubtitle: {
    fontSize: 15,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
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
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: T.surface3,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
  },

  // City picker button
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface3,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  pickerButtonReadOnly: {
    borderColor: T.primary + "55",
    backgroundColor: T.primary + "0D",
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.text,
  },

  // Date picker
  dateButton: {
    backgroundColor: T.surface3,
    borderWidth: 1.5,
    borderColor: T.primary,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 4,
  },
  dateButtonLabel: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  dateButtonValue: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.text,
  },
  pickerContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    overflow: "hidden",
  },
  pickerDoneButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: T.ctaBg,
    borderRadius: 8,
  },
  pickerDoneText: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.ctaText,
  },

  // Gender
  genderRow: {
    flexDirection: "row",
    gap: 12,
  },
  genderCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    backgroundColor: T.surface3,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 16,
    gap: 8,
  },
  genderCardSelected: {
    borderColor: T.selBorder,
    backgroundColor: T.selBg,
  },
  genderEmoji: {
    fontSize: 28,
  },
  genderLabel: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
  },
  genderLabelSelected: {
    color: T.selText,
  },

  error: {
    color: T.error,
    fontSize: 14,
    fontFamily: "SpaceGrotesk_400Regular",
    textAlign: "center",
  },
  button: {
    backgroundColor: T.ctaBg,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: T.ctaText,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
  },
});
