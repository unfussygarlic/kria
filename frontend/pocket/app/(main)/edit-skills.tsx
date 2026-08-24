/**
 * Edit skills — grouped skill chip picker.
 *
 * Redesigned 2026-08-23 for the new visual system: SHADOW chips, TYPE tokens,
 * S/R spacing. Selection logic + sticky save footer preserved.
 */

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
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
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
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
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
      <View style={[styles.header, { paddingTop: insets.top + S.sm }]}>
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
            <Text style={styles.categoryLabel}>{cat.category.toUpperCase()}</Text>
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
            {isLoading ? "Saving..." : "Save skills"}
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
    paddingHorizontal: S.md,
    paddingBottom: S.md,
    gap: S.sm,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    ...TYPE.title3,
    color: T.text,
  },
  headerBadge: {
    backgroundColor: T.selBg,
    paddingHorizontal: S.sm,
    paddingVertical: 4,
    borderRadius: R.chip,
    ...SHADOW.sm,
  },
  headerBadgeText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.selText,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: S.lg,
    gap: S.lg,
    paddingBottom: S.hero,
  },
  category: {
    gap: S.xs,
  },
  categoryLabel: {
    ...TYPE.label,
    color: T.textMuted,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.sm,
    paddingVertical: 7,
    borderRadius: R.chip,
    backgroundColor: T.surface1,
    ...SHADOW.sm,
  },
  chipOn: {
    backgroundColor: T.selBg,
  },
  chipText: {
    ...TYPE.caption,
    color: T.textSub,
  },
  chipTextOn: {
    color: T.selText,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  button: {
    backgroundColor: T.ctaBg,
    height: rw(54),
    borderRadius: R.button,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.md,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: T.ctaText,
    ...TYPE.title3,
  },
});
