import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { Languages, Skills } from "@/constants/config";
import { StickyFooter } from "@/components/ui/StickyFooter";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [bio, setBio] = useState(profile?.bio || "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    profile?.languages || ["english"]
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    profile?.skills || []
  );
  const [isStudent, setIsStudent] = useState(profile?.is_student ?? false);
  const [collegeName, setCollegeName] = useState(profile?.college_name || "");
  const [collegeYear, setCollegeYear] = useState(
    profile?.college_year?.toString() || ""
  );
  const [course, setCourse] = useState(profile?.course || "");
  const [experienceSummary, setExperienceSummary] = useState(
    profile?.experience_summary || ""
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError("");
    setSaved(false);

    const result = await updateProfile({
      bio: bio.trim() || null,
      languages: selectedLanguages,
      skills: selectedSkills,
      is_student: isStudent,
      college_name: isStudent ? collegeName.trim() || null : null,
      college_year:
        isStudent && collegeYear ? parseInt(collegeYear, 10) || null : null,
      course: isStudent ? course.trim() || null : null,
      experience_summary: experienceSummary.trim() || null,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Fixed header — outside scroll */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About You</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Tell gig posters a little about yourself..."
              placeholderTextColor={T.textMuted}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>
          </View>

          {/* Work Experience */}
          <View style={styles.field}>
            <Text style={styles.label}>Work Experience</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Briefly describe your work history..."
              placeholderTextColor={T.textMuted}
              value={experienceSummary}
              onChangeText={setExperienceSummary}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Languages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <View style={styles.chipContainer}>
            {Languages.map((lang) => (
              <Pressable
                key={lang.value}
                style={[
                  styles.chip,
                  selectedLanguages.includes(lang.value) && styles.chipSelected,
                ]}
                onPress={() => toggleLanguage(lang.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedLanguages.includes(lang.value) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {lang.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.chipContainer}>
            {Skills.map((skill) => (
              <Pressable
                key={skill.value}
                style={[
                  styles.chip,
                  selectedSkills.includes(skill.value) && styles.chipSelected,
                ]}
                onPress={() => toggleSkill(skill.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedSkills.includes(skill.value) &&
                      styles.chipTextSelected,
                  ]}
                >
                  {skill.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Education */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Currently a student</Text>
            <Switch
              value={isStudent}
              onValueChange={setIsStudent}
              trackColor={{ false: T.border, true: T.primary200 }}
              thumbColor={isStudent ? T.primary : T.textMuted}
            />
          </View>

          {isStudent && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>College / University</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Christ University"
                  placeholderTextColor={T.textMuted}
                  value={collegeName}
                  onChangeText={setCollegeName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.field, { flex: 1 }]}>
                  <Text style={styles.label}>Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1–5"
                    placeholderTextColor={T.textMuted}
                    value={collegeYear}
                    onChangeText={setCollegeYear}
                    keyboardType="number-pad"
                    maxLength={1}
                  />
                </View>
                <View style={[styles.field, { flex: 2 }]}>
                  <Text style={styles.label}>Course / Major</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., BBA"
                    placeholderTextColor={T.textMuted}
                    value={course}
                    onChangeText={setCourse}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? (
          <Text style={styles.savedText}>Changes saved!</Text>
        ) : null}
      </View>
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Saving..." : "Save Changes"}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: T.text,
  },
  form: {
    padding: 20,
    gap: 8,
  },
  section: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    gap: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
  },
  field: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textSub,
  },
  input: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: T.text,
  },
  multiline: {
    height: 88,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: T.textMuted,
    textAlign: "right",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipSelected: {
    backgroundColor: T.primary100,
    borderColor: T.primary,
  },
  chipText: {
    fontSize: 13,
    color: T.textSub,
  },
  chipTextSelected: {
    color: T.primary,
    fontWeight: "600",
  },
  error: {
    color: T.error,
    fontSize: 14,
    textAlign: "center",
  },
  savedText: {
    color: T.success,
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  button: {
    backgroundColor: T.primary,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: T.textInverse,
    fontSize: 17,
    fontWeight: "600",
  },
});
