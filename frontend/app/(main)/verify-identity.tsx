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
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { Colors } from "@/constants/colors";
import {
  verifyIdentity,
  ID_TYPE_OPTIONS,
  IDType,
} from "@/lib/api/profile";
import { StickyFooter } from "@/components/ui/StickyFooter";

export default function VerifyIdentityScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [selectedType, setSelectedType] = useState<IDType | null>(null);
  const [idValue, setIdValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const selectedOption = ID_TYPE_OPTIONS.find((o) => o.value === selectedType);

  // Already verified
  if (profile?.id_verified) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Verify Identity</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.verifiedContainer}>
          <View style={styles.verifiedIcon}>
            <Feather name="check-circle" size={56} color={Colors.success} />
          </View>
          <Text style={styles.verifiedTitle}>Identity Verified</Text>
          <Text style={styles.verifiedSubtitle}>
            Your {profile.id_type?.toUpperCase().replace(/_/g, " ")} has been
            verified. You now have a verified badge on your profile.
          </Text>
        </View>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!selectedType) {
      setError("Please select an ID type");
      return;
    }
    if (!idValue.trim()) {
      setError("Please enter your ID number");
      return;
    }

    setIsLoading(true);
    setError("");

    const result = await verifyIdentity(selectedType, idValue.trim());

    setIsLoading(false);

    if (result.error) {
      // FastAPI 422 returns a "detail" array — apiPost already extracts it
      setError(result.error);
    } else {
      setSuccess(true);
      await fetchProfile();
    }
  };

  if (success) {
    return (
      <View style={styles.screen}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color={Colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Verify Identity</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.verifiedContainer}>
          <View style={styles.verifiedIcon}>
            <Feather name="check-circle" size={56} color={Colors.success} />
          </View>
          <Text style={styles.verifiedTitle}>Verified!</Text>
          <Text style={styles.verifiedSubtitle}>
            Your identity has been verified. You'll see a verified badge on your
            profile now.
          </Text>
          <Pressable
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Back to Profile</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={Colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Verify Identity</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.body}>
          <Text style={styles.intro}>
            Verifying your identity builds trust with gig posters and unlocks
            higher-paying opportunities.
          </Text>

          {/* ID Type Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select ID Type</Text>
            <View style={styles.typeGrid}>
              {ID_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.typeCard,
                    selectedType === opt.value && styles.typeCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedType(opt.value);
                    setIdValue("");
                    setError("");
                  }}
                >
                  <Text
                    style={[
                      styles.typeLabel,
                      selectedType === opt.value && styles.typeLabelSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ID Value Input */}
          {selectedOption && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Enter {selectedOption.label} Number
              </Text>
              <Text style={styles.formatHint}>{selectedOption.hint}</Text>
              <TextInput
                style={styles.idInput}
                placeholder={selectedOption.placeholder}
                placeholderTextColor={Colors.text.muted}
                value={idValue}
                onChangeText={(t) => { setIdValue(t); setError(""); }}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.disclaimer}>
            Your ID details are encrypted and stored securely. They will never be
            shared with gig posters.
          </Text>
        </View>
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[
            styles.button,
            (!selectedType || !idValue.trim() || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType || !idValue.trim() || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Verifying..." : "Verify Identity"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  body: {
    padding: 20,
    gap: 16,
  },
  intro: {
    fontSize: 15,
    color: Colors.text.secondary,
    lineHeight: 22,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text.primary,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeCard: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  typeCardSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary.DEFAULT,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text.secondary,
  },
  typeLabelSelected: {
    color: Colors.primary.DEFAULT,
    fontWeight: "700",
  },
  formatHint: {
    fontSize: 13,
    color: Colors.text.muted,
  },
  idInput: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: Colors.text.primary,
    letterSpacing: 1,
  },
  error: {
    color: Colors.error,
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    backgroundColor: Colors.primary.DEFAULT,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: 17,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: 12,
    color: Colors.text.muted,
    textAlign: "center",
    lineHeight: 18,
  },

  // Verified state
  verifiedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 16,
  },
  verifiedIcon: {
    marginBottom: 8,
  },
  verifiedTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  verifiedSubtitle: {
    fontSize: 15,
    color: Colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
