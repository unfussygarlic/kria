/**
 * Settings — theme picker + account controls (deactivate, delete).
 *
 * Redesigned 2026-08-23 for the new visual system: SHADOW cards (no borders),
 * TYPE tokens, S/R spacing, solid surfaces. Deactivate/delete sheets keep
 * their behaviour but reuse the new tokens.
 */

import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { currentTheme, setTheme, type ThemeName } from "@/constants/theme";
import { rw } from "@/constants/responsive";
import { useAuthStore } from "@/stores/authStore";
import { deactivateAccount, deleteAccountRequest, type DeactivateDuration } from "@/lib/api/account";

const DURATION_OPTIONS: { value: DeactivateDuration; label: string; sublabel: string }[] = [
  { value: "7d",         label: "7 days",       sublabel: "Back in one week"     },
  { value: "15d",        label: "15 days",      sublabel: "Back in two weeks"    },
  { value: "30d",        label: "30 days",      sublabel: "Back in a month"      },
  { value: "indefinite", label: "Indefinitely", sublabel: "Until you reactivate" },
];

// ── Deactivate bottom sheet ───────────────────────────────────────────────────

function DeactivateSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const [selected, setSelected] = useState<DeactivateDuration>("7d");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const result = await deactivateAccount(selected);
    setLoading(false);
    if (result.error) {
      Alert.alert("Error", result.error);
      return;
    }
    onClose();
    await signOut();
    router.replace("/");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, S.lg) }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <View style={[styles.sheetIcon, { backgroundColor: "#f59e0b22" }]}>
            <Feather name="clock" size={rw(20)} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Deactivate account</Text>
            <Text style={styles.sheetSubtitle}>Your profile will be hidden and gigs paused</Text>
          </View>
        </View>

        <Text style={styles.pickerLabel}>How long do you want to deactivate?</Text>

        <View style={styles.durationList}>
          {DURATION_OPTIONS.map((opt) => {
            const active = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                style={[styles.durationRow, active && styles.durationRowActive]}
                onPress={() => setSelected(opt.value)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.durationLabel, active && { color: T.primary }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.durationSub}>{opt.sublabel}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.sheetActions}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.warnBtn, loading && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.warnBtnText}>Deactivate</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Delete bottom sheet ───────────────────────────────────────────────────────

function DeleteSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const signOut = useAuthStore((s) => s.signOut);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const confirmed = confirmation === "DELETE";

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    const result = await deleteAccountRequest();
    setLoading(false);
    if (result.error) {
      Alert.alert("Error", result.error);
      return;
    }
    onClose();
    await signOut();
    router.replace("/");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, S.lg) }]}>
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <View style={[styles.sheetIcon, { backgroundColor: T.error + "22" }]}>
            <Feather name="trash-2" size={rw(20)} color={T.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetTitle, { color: T.error }]}>Delete account</Text>
            <Text style={styles.sheetSubtitle}>This cannot be undone</Text>
          </View>
        </View>

        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>What gets deleted:</Text>
          {[
            "Your profile and all personal information",
            "All gigs you have posted",
            "All applications and assignments",
            "Your ratings and Momentum score",
            "Your badges and achievements",
          ].map((line) => (
            <Text key={line} style={styles.warningLine}>· {line}</Text>
          ))}
        </View>

        <Text style={styles.pickerLabel}>
          Type <Text style={{ color: T.text, fontFamily: "Inter_700Bold", fontWeight: "700" }}>DELETE</Text> to confirm:
        </Text>
        <TextInput
          style={[styles.confirmInput, confirmed && { backgroundColor: T.error + "12" }]}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder="DELETE"
          placeholderTextColor={T.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <View style={styles.sheetActions}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteBtn, (!confirmed || loading) && styles.btnDisabled]}
            onPress={handleDelete}
            disabled={!confirmed || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.deleteBtnText}>Delete forever</Text>
            }
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(currentTheme);

  const handleThemePick = async (next: ThemeName) => {
    if (next === selectedTheme) return;
    setSelectedTheme(next);
    // Fire-and-forget — setTheme persists and best-effort reloads. No popup
    // if reload can't fire; the preference applies on next open.
    setTheme(next);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={rw(20)} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: rw(36) }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          <View style={styles.menuRow}>
            <View style={[styles.menuIcon, { backgroundColor: T.primary + "18" }]}>
              <Feather name="sun" size={rw(18)} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Theme</Text>
              <Text style={styles.menuSub}>Light by default. Dark reduces glare at night.</Text>
            </View>
          </View>
          <View style={styles.themeRow}>
            {(["light", "dark"] as const).map((mode) => {
              const active = selectedTheme === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => handleThemePick(mode)}
                  style={[styles.themeChip, active && styles.themeChipActive]}
                >
                  <Feather
                    name={mode === "light" ? "sun" : "moon"}
                    size={rw(14)}
                    color={active ? T.selText : T.textSub}
                  />
                  <Text style={[styles.themeChipText, active && styles.themeChipTextActive]}>
                    {mode === "light" ? "Light" : "Dark"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        <View style={styles.card}>
          <Pressable style={styles.menuRow} onPress={() => setShowDeactivate(true)}>
            <View style={[styles.menuIcon, { backgroundColor: "#f59e0b22" }]}>
              <Feather name="clock" size={rw(18)} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Deactivate account</Text>
              <Text style={styles.menuSub}>Temporarily hide your profile and pause gigs</Text>
            </View>
            <Feather name="chevron-right" size={rw(18)} color={T.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.menuRow} onPress={() => setShowDelete(true)}>
            <View style={[styles.menuIcon, { backgroundColor: T.error + "22" }]}>
              <Feather name="trash-2" size={rw(18)} color={T.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: T.error }]}>Delete account</Text>
              <Text style={styles.menuSub}>Permanently remove your account and all data</Text>
            </View>
            <Feather name="chevron-right" size={rw(18)} color={T.textMuted} />
          </Pressable>
        </View>
      </ScrollView>

      <DeactivateSheet visible={showDeactivate} onClose={() => setShowDeactivate(false)} />
      <DeleteSheet visible={showDelete} onClose={() => setShowDelete(false)} />
    </View>
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
    justifyContent: "space-between",
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  backBtn: {
    width: rw(36),
    height: rw(36),
    borderRadius: R.thumb,
    backgroundColor: T.surface1,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  headerTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  content: {
    padding: S.md,
    gap: S.xs,
  },
  sectionLabel: {
    ...TYPE.label,
    color: T.textMuted,
    marginBottom: S.xs,
    marginLeft: 4,
    marginTop: S.xs,
  },
  card: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    overflow: "hidden",
    ...SHADOW.card,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    padding: S.md,
  },
  menuIcon: {
    width: rw(38),
    height: rw(38),
    borderRadius: R.thumb,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },
  menuSub: {
    ...TYPE.caption,
    color: T.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: T.surface2,
    marginLeft: rw(66),
  },

  themeRow: {
    flexDirection: "row",
    gap: S.xs,
    padding: S.md,
    paddingTop: 0,
  },
  themeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs,
    paddingVertical: S.sm,
    borderRadius: R.button,
    backgroundColor: T.surface2,
  },
  themeChipActive: {
    backgroundColor: T.selBg,
  },
  themeChipText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.textSub,
  },
  themeChipTextActive: {
    color: T.selText,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: T.surface1,
    borderTopLeftRadius: R.hero,
    borderTopRightRadius: R.hero,
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    ...SHADOW.xl,
  },
  sheetHandle: {
    width: rw(40),
    height: 4,
    backgroundColor: T.surface2,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: S.md,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginBottom: S.lg,
  },
  sheetIcon: {
    width: rw(44),
    height: rw(44),
    borderRadius: R.thumb,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    ...TYPE.title3,
    color: T.text,
  },
  sheetSubtitle: {
    ...TYPE.caption,
    color: T.textMuted,
    marginTop: 2,
  },
  pickerLabel: {
    ...TYPE.caption,
    color: T.textMuted,
    marginBottom: S.xs,
  },

  durationList: {
    gap: S.xs,
    marginBottom: S.lg,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    padding: S.sm,
    borderRadius: R.button,
    backgroundColor: T.surface2,
  },
  durationRowActive: {
    backgroundColor: T.primary + "18",
  },
  durationLabel: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },
  durationSub: {
    ...TYPE.caption,
    color: T.textMuted,
    marginTop: 2,
  },
  radio: {
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    borderWidth: 2,
    borderColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: {
    borderColor: T.primary,
  },
  radioDot: {
    width: rw(9),
    height: rw(9),
    borderRadius: rw(5),
    backgroundColor: T.primary,
  },

  warningBox: {
    backgroundColor: T.error + "12",
    borderRadius: R.card,
    padding: S.sm,
    marginBottom: S.md,
    gap: 4,
  },
  warningTitle: {
    ...TYPE.label,
    color: T.error,
    marginBottom: 4,
  },
  warningLine: {
    ...TYPE.caption,
    color: T.textSub,
  },
  confirmInput: {
    backgroundColor: T.surface2,
    borderRadius: R.input,
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    ...TYPE.body,
    color: T.text,
    marginBottom: S.lg,
    letterSpacing: 2,
  },

  sheetActions: {
    flexDirection: "row",
    gap: S.xs,
  },
  cancelBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: R.button,
    backgroundColor: T.surface2,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.textMuted,
  },
  warnBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: R.button,
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  warnBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#000",
  },
  deleteBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: R.button,
    backgroundColor: T.error,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  deleteBtnText: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
