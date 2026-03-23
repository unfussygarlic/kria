import { useState } from "react";
import {
  View,
  Text,
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
import { T } from "@/constants/colors";
import { SkillCategories } from "@/constants/config";
import { StickyFooter } from "@/components/ui/StickyFooter";

export default function EditSkillsScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [selected, setSelected] = useState<string[]>(profile?.skills ?? []);
  const [isLoading, setIsLoading] = useState(false);

  const toggle = (value: string) => {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    setIsLoading(true);
    await updateProfile({ skills: selected } as any);
    setIsLoading(false);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Skills</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{selected.length} selected</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {SkillCategories.map((cat) => (
          <View key={cat.category} style={styles.category}>
            <Text style={styles.categoryLabel}>{cat.category}</Text>
            <View style={styles.chipWrap}>
              {cat.skills.map((skill) => {
                const on = selected.includes(skill.value);
                return (
                  <Pressable
                    key={skill.value}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggle(skill.value)}
                  >
                    {on && (
                      <Feather
                        name="check"
                        size={12}
                        color={T.selText}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {skill.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Saving..." : "Save Skills"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    color: T.text,
  },
  headerBadge: {
    backgroundColor: T.selBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.selText,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  category: {
    gap: 10,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.surface,
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
  button: {
    backgroundColor: T.ctaBg,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: T.ctaText,
    fontSize: 17,
    fontWeight: "600",
  },
});
