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
  Modal,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { Languages, DegreeOptions } from "@/constants/config";
import { StickyFooter } from "@/components/ui/StickyFooter";
import type { WorkExperience, EducationEntry } from "@/types/database";

const CURRENT_YEAR = new Date().getFullYear();

// ── Degree picker helpers ────────────────────────────────────────────────────

const ALL_DEGREES = DegreeOptions.flatMap((g) => g.options);
function degreeLabel(value: string) {
  return ALL_DEGREES.find((d) => d.value === value)?.label ?? value;
}

// ── Empty entry factories ────────────────────────────────────────────────────

function emptyWork(): WorkExperience & { _key: string } {
  return { _key: String(Date.now()), company: "", role: "", from_year: CURRENT_YEAR, to_year: null };
}
function emptyEdu(): EducationEntry & { _key: string } {
  return { _key: String(Date.now() + 1), college: "", degree: "", field: "", passing_year: CURRENT_YEAR };
}

// ── Types with internal draft key ────────────────────────────────────────────

type WorkDraft = WorkExperience & { _key: string };
type EduDraft = EducationEntry & { _key: string };

// ── Main screen ──────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [bio, setBio] = useState(profile?.bio || "");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    profile?.languages || ["english"]
  );
  // Skills are edited on a separate screen (edit-skills.tsx) and saved independently
  const profileSkills = profile?.skills ?? [];
  const [workEntries, setWorkEntries] = useState<WorkDraft[]>(
    ((profile as any)?.work_experience as WorkExperience[] | undefined)?.map((w, i) => ({
      ...w,
      _key: String(i),
    })) ?? []
  );
  const [eduEntries, setEduEntries] = useState<EduDraft[]>(
    ((profile as any)?.education_entries as EducationEntry[] | undefined)?.map((e, i) => ({
      ...e,
      _key: String(i),
    })) ?? []
  );

  // Draft being edited inline
  const [workDraft, setWorkDraft] = useState<WorkDraft | null>(null);
  const [eduDraft, setEduDraft] = useState<EduDraft | null>(null);

  // Degree picker modal
  const [showDegreePicker, setShowDegreePicker] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Language / skill toggles ──

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      if (selectedLanguages.length > 1) {
        setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
      }
    } else {
      setSelectedLanguages([...selectedLanguages, lang]);
    }
  };

  // ── Work experience actions ──

  const startAddWork = () => setWorkDraft(emptyWork());

  const saveWork = () => {
    if (!workDraft) return;
    if (!workDraft.company.trim() || !workDraft.role.trim()) return;
    const entry = { ...workDraft, company: workDraft.company.trim(), role: workDraft.role.trim() };
    setWorkEntries((prev) => {
      const idx = prev.findIndex((w) => w._key === entry._key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
    setWorkDraft(null);
  };

  const removeWork = (key: string) =>
    setWorkEntries((prev) => prev.filter((w) => w._key !== key));

  // ── Education actions ──

  const startAddEdu = () => setEduDraft(emptyEdu());

  const saveEdu = () => {
    if (!eduDraft) return;
    if (!eduDraft.college.trim() || !eduDraft.degree) return;
    const entry = { ...eduDraft, college: eduDraft.college.trim(), field: eduDraft.field.trim() };
    setEduEntries((prev) => {
      const idx = prev.findIndex((e) => e._key === entry._key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry];
    });
    setEduDraft(null);
  };

  const removeEdu = (key: string) =>
    setEduEntries((prev) => prev.filter((e) => e._key !== key));

  // ── Save ──

  const handleSave = async () => {
    setIsLoading(true);
    setError("");

    const result = await updateProfile({
      bio: bio.trim() || null,
      languages: selectedLanguages,
      work_experience: workEntries.map(({ _key, ...w }) => w) as any,
      education_entries: eduEntries.map(({ _key, ...e }) => e) as any,
    } as any);

    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>

          {/* ── Bio ── */}
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
          </View>

          {/* ── Languages ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.chipWrap}>
              {Languages.map((lang) => {
                const on = selectedLanguages.includes(lang.value);
                return (
                  <Pressable
                    key={lang.value}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleLanguage(lang.value)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {lang.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Skills — separate screen ── */}
          <Pressable
            style={styles.navRow}
            onPress={() => router.push("/(main)/edit-skills")}
          >
            <View style={styles.navRowLeft}>
              <View style={styles.navIcon}>
                <Feather name="zap" size={16} color={T.avatarText} />
              </View>
              <View>
                <Text style={styles.navRowTitle}>Skills</Text>
                <Text style={styles.navRowSub}>
                  {profileSkills.length > 0
                    ? `${profileSkills.length} skill${profileSkills.length !== 1 ? "s" : ""} selected`
                    : "None selected"}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={T.textMuted} />
          </Pressable>

          {/* ── Work Experience ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>

            {workEntries.map((w) => (
              <View key={w._key} style={styles.entryCard}>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryTitle}>{w.role}</Text>
                  <Text style={styles.entrySub}>{w.company}</Text>
                  <Text style={styles.entryMeta}>
                    {w.from_year} – {w.to_year ?? "Present"}
                  </Text>
                </View>
                <View style={styles.entryActions}>
                  <Pressable
                    hitSlop={8}
                    onPress={() => { setWorkDraft({ ...w }); }}
                  >
                    <Feather name="edit-2" size={15} color={T.textMuted} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => removeWork(w._key)}>
                    <Feather name="trash-2" size={15} color={T.error} />
                  </Pressable>
                </View>
              </View>
            ))}

            {workDraft ? (
              <WorkForm
                draft={workDraft}
                onChange={setWorkDraft}
                onSave={saveWork}
                onCancel={() => setWorkDraft(null)}
              />
            ) : (
              <Pressable style={styles.addBtn} onPress={startAddWork}>
                <Feather name="plus" size={16} color={T.primary} />
                <Text style={styles.addBtnText}>Add Experience</Text>
              </Pressable>
            )}
          </View>

          {/* ── Education ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>

            {eduEntries.map((e) => {
              const isStudent = e.passing_year > CURRENT_YEAR;
              return (
                <View key={e._key} style={styles.entryCard}>
                  <View style={styles.entryInfo}>
                    <View style={styles.entryTitleRow}>
                      <Text style={styles.entryTitle}>{degreeLabel(e.degree)}</Text>
                      {isStudent && (
                        <View style={styles.studentBadge}>
                          <Text style={styles.studentBadgeText}>Student</Text>
                        </View>
                      )}
                    </View>
                    {e.field ? (
                      <Text style={styles.entrySub}>{e.field}</Text>
                    ) : null}
                    <Text style={styles.entryMeta}>
                      {e.college}
                      {isStudent ? ` · Graduating ${e.passing_year}` : ` · ${e.passing_year}`}
                    </Text>
                  </View>
                  <View style={styles.entryActions}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => { setEduDraft({ ...e }); }}
                    >
                      <Feather name="edit-2" size={15} color={T.textMuted} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => removeEdu(e._key)}>
                      <Feather name="trash-2" size={15} color={T.error} />
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {eduDraft ? (
              <EduForm
                draft={eduDraft}
                onChange={setEduDraft}
                onSave={saveEdu}
                onCancel={() => setEduDraft(null)}
                onOpenDegreePicker={() => setShowDegreePicker(true)}
              />
            ) : (
              <Pressable style={styles.addBtn} onPress={startAddEdu}>
                <Feather name="plus" size={16} color={T.primary} />
                <Text style={styles.addBtnText}>Add Education</Text>
              </Pressable>
            )}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>

      {/* ── Degree picker modal ── */}
      <Modal
        visible={showDegreePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDegreePicker(false)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setShowDegreePicker(false)}
        />
        <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>Select Degree</Text>
          <FlatList
            data={DegreeOptions}
            keyExtractor={(item) => item.group}
            renderItem={({ item: group }) => (
              <View>
                <Text style={styles.pickerGroup}>{group.group}</Text>
                {group.options.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.pickerItem,
                      eduDraft?.degree === opt.value && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      if (eduDraft) setEduDraft({ ...eduDraft, degree: opt.value });
                      setShowDegreePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        eduDraft?.degree === opt.value && styles.pickerItemTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {eduDraft?.degree === opt.value && (
                      <Feather name="check" size={16} color={T.selText} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        </View>
      </Modal>

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

// ── Work form ────────────────────────────────────────────────────────────────

function WorkForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: WorkDraft;
  onChange: (d: WorkDraft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const isCurrently = draft.to_year === null;
  const canSave = draft.company.trim() && draft.role.trim();

  return (
    <View style={styles.draftForm}>
      <View style={styles.draftRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>Company</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Bangalore Events Co."
            placeholderTextColor={T.textMuted}
            value={draft.company}
            onChangeText={(t) => onChange({ ...draft, company: t })}
          />
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Role / Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Event Coordinator"
          placeholderTextColor={T.textMuted}
          value={draft.role}
          onChangeText={(t) => onChange({ ...draft, role: t })}
        />
      </View>
      <View style={styles.draftRow}>
        <View style={[styles.field, { flex: 1 }]}>
          <Text style={styles.label}>From year</Text>
          <TextInput
            style={styles.input}
            placeholder="2022"
            placeholderTextColor={T.textMuted}
            value={draft.from_year ? String(draft.from_year) : ""}
            onChangeText={(t) => onChange({ ...draft, from_year: parseInt(t) || CURRENT_YEAR })}
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>
        {!isCurrently && (
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>To year</Text>
            <TextInput
              style={styles.input}
              placeholder="2024"
              placeholderTextColor={T.textMuted}
              value={draft.to_year ? String(draft.to_year) : ""}
              onChangeText={(t) => onChange({ ...draft, to_year: parseInt(t) || null })}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>
        )}
      </View>
      <Pressable
        style={styles.currentlyRow}
        onPress={() => onChange({ ...draft, to_year: isCurrently ? CURRENT_YEAR : null })}
      >
        <View style={[styles.checkbox, isCurrently && styles.checkboxOn]}>
          {isCurrently && <Feather name="check" size={12} color={T.selText} />}
        </View>
        <Text style={styles.currentlyLabel}>Currently working here</Text>
      </Pressable>
      <View style={styles.draftBtns}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
          onPress={onSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Education form ───────────────────────────────────────────────────────────

function EduForm({
  draft,
  onChange,
  onSave,
  onCancel,
  onOpenDegreePicker,
}: {
  draft: EduDraft;
  onChange: (d: EduDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onOpenDegreePicker: () => void;
}) {
  const canSave = draft.college.trim() && draft.degree;
  const isStudent = draft.passing_year > CURRENT_YEAR;

  return (
    <View style={styles.draftForm}>
      <View style={styles.field}>
        <Text style={styles.label}>College / University / School</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Christ University"
          placeholderTextColor={T.textMuted}
          value={draft.college}
          onChangeText={(t) => onChange({ ...draft, college: t })}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Degree</Text>
        <Pressable style={styles.pickerTrigger} onPress={onOpenDegreePicker}>
          <Text style={[styles.pickerTriggerText, !draft.degree && { color: T.textMuted }]}>
            {draft.degree ? degreeLabel(draft.degree) : "Select degree…"}
          </Text>
          <Feather name="chevron-down" size={16} color={T.textMuted} />
        </Pressable>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Field of Study</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Computer Science"
          placeholderTextColor={T.textMuted}
          value={draft.field}
          onChangeText={(t) => onChange({ ...draft, field: t })}
        />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>
          {isStudent ? "Expected Graduation Year" : "Passing Year"}
          {isStudent && (
            <Text style={{ color: T.primary, fontWeight: "700" }}> (Student)</Text>
          )}
        </Text>
        <TextInput
          style={styles.input}
          placeholder={String(CURRENT_YEAR)}
          placeholderTextColor={T.textMuted}
          value={draft.passing_year ? String(draft.passing_year) : ""}
          onChangeText={(t) => onChange({ ...draft, passing_year: parseInt(t) || CURRENT_YEAR })}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>
      <View style={styles.draftBtns}>
        <Pressable style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveBtn, !canSave && { opacity: 0.4 }]}
          onPress={onSave}
          disabled={!canSave}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

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
    paddingBottom: 40,
  },
  section: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
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

  // ── Chips ──
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipOn: {
    backgroundColor: T.selBg,
    borderColor: T.selBorder,
  },
  chipText: {
    fontSize: 13,
    color: T.textSub,
  },
  chipTextOn: {
    color: T.selText,
    fontWeight: "600",
  },

  // ── Skills nav row ──
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  navRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  navIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: T.avatarBg,
    alignItems: "center",
    justifyContent: "center",
  },
  navRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: T.text,
  },
  navRowSub: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 1,
  },

  // ── Entry cards ──
  entryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: T.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    gap: 10,
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  entryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.text,
  },
  entrySub: {
    fontSize: 13,
    color: T.textSub,
  },
  entryMeta: {
    fontSize: 12,
    color: T.textMuted,
  },
  entryActions: {
    flexDirection: "row",
    gap: 14,
    paddingTop: 2,
  },
  studentBadge: {
    backgroundColor: T.selBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  studentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: T.selText,
  },

  // ── Add button ──
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.primary,
    borderStyle: "dashed",
    alignSelf: "flex-start",
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: T.primary,
  },

  // ── Draft inline form ──
  draftForm: {
    backgroundColor: T.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.primary,
    padding: 14,
    gap: 12,
  },
  draftRow: {
    flexDirection: "row",
    gap: 12,
  },
  currentlyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -4,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: T.selBg,
    borderColor: T.selBorder,
  },
  currentlyLabel: {
    fontSize: 13,
    color: T.textSub,
  },
  draftBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    color: T.textSub,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    backgroundColor: T.ctaBg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    fontSize: 14,
    color: T.ctaText,
    fontWeight: "700",
  },

  // ── Degree picker ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  pickerSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingTop: 10,
  },
  pickerHandle: {
    width: 36,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.text,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  pickerGroup: {
    fontSize: 11,
    fontWeight: "700",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  pickerItemSelected: {
    backgroundColor: T.selBg,
  },
  pickerItemText: {
    fontSize: 15,
    color: T.text,
  },
  pickerItemTextSelected: {
    color: T.selText,
    fontWeight: "600",
  },

  // ── Bottom ──
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
    backgroundColor: T.ctaBg,
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
    color: T.ctaText,
    fontSize: 17,
    fontWeight: "600",
  },

  // ── Picker trigger ──
  pickerTrigger: {
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerTriggerText: {
    fontSize: 15,
    color: T.text,
  },
});
