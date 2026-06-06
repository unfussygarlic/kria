import { useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Modal, TextInput, ActivityIndicator, Alert,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { useAuthStore } from "@/stores/authStore";
import { deactivateAccount, deleteAccountRequest, type DeactivateDuration } from "@/lib/api/account";

// ── Duration options ──────────────────────────────────────────────────────────

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
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={[styles.sheetIcon, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
            <Feather name="clock" size={rw(20)} color="#f59e0b" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sheetTitle}>Deactivate Account</Text>
            <Text style={styles.sheetSubtitle}>Your profile will be hidden and gigs paused</Text>
          </View>
        </View>

        <Text style={styles.pickerLabel}>How long do you want to deactivate?</Text>

        {/* Duration picker */}
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
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <View style={styles.sheetHandle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <View style={[styles.sheetIcon, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
            <Feather name="trash-2" size={rw(20)} color={T.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetTitle, { color: T.error }]}>Delete Account</Text>
            <Text style={styles.sheetSubtitle}>This cannot be undone</Text>
          </View>
        </View>

        {/* Warning box */}
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
          Type <Text style={{ color: T.text, fontWeight: "700" }}>DELETE</Text> to confirm:
        </Text>
        <TextInput
          style={[
            styles.confirmInput,
            confirmed && { borderColor: T.error },
          ]}
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
              : <Text style={styles.deleteBtnText}>Delete Forever</Text>
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
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
        {/* Account section */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          {/* Deactivate row */}
          <Pressable style={styles.menuRow} onPress={() => setShowDeactivate(true)}>
            <View style={[styles.menuIcon, { backgroundColor: "rgba(245,158,11,0.10)" }]}>
              <Feather name="clock" size={rw(18)} color="#f59e0b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Deactivate Account</Text>
              <Text style={styles.menuSub}>Temporarily hide your profile and pause gigs</Text>
            </View>
            <Feather name="chevron-right" size={rw(18)} color={T.textMuted} />
          </Pressable>

          <View style={styles.divider} />

          {/* Delete row */}
          <Pressable style={styles.menuRow} onPress={() => setShowDelete(true)}>
            <View style={[styles.menuIcon, { backgroundColor: "rgba(239,68,68,0.10)" }]}>
              <Feather name="trash-2" size={rw(18)} color={T.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuLabel, { color: T.error }]}>Delete Account</Text>
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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rw(16),
    paddingVertical: rw(14),
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backBtn: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(10),
    backgroundColor: T.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
  },
  content: {
    padding: rw(16),
    gap: rw(8),
  },
  sectionLabel: {
    fontSize: rf(10),
    fontWeight: "700",
    color: T.textMuted,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: rw(8),
    marginLeft: rw(4),
  },
  card: {
    backgroundColor: T.surface,
    borderRadius: rw(16),
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    padding: rw(16),
  },
  menuIcon: {
    width: rw(38),
    height: rw(38),
    borderRadius: rw(12),
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: T.text,
  },
  menuSub: {
    fontSize: rf(11),
    color: T.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: rw(66),
  },

  // ── Sheet ──
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: rw(24),
    borderTopRightRadius: rw(24),
    paddingHorizontal: rw(20),
    paddingTop: rw(12),
  },
  sheetHandle: {
    width: rw(40),
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: rw(16),
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    marginBottom: rw(20),
  },
  sheetIcon: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(14),
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: rf(16),
    fontWeight: "700",
    color: T.text,
  },
  sheetSubtitle: {
    fontSize: rf(12),
    color: T.textMuted,
    marginTop: 2,
  },
  pickerLabel: {
    fontSize: rf(12),
    color: T.textMuted,
    marginBottom: rw(10),
  },

  // ── Duration picker ──
  durationList: {
    gap: rw(8),
    marginBottom: rw(20),
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(12),
    padding: rw(14),
    borderRadius: rw(12),
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: "transparent",
  },
  durationRowActive: {
    borderColor: T.primary,
    backgroundColor: "rgba(212,255,0,0.05)",
  },
  durationLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: T.text,
  },
  durationSub: {
    fontSize: rf(11),
    color: T.textMuted,
    marginTop: 2,
  },
  radio: {
    width: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    borderWidth: 2,
    borderColor: T.border,
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

  // ── Delete confirm input ──
  warningBox: {
    backgroundColor: "rgba(239,68,68,0.06)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
    borderRadius: rw(12),
    padding: rw(14),
    marginBottom: rw(16),
    gap: rw(4),
  },
  warningTitle: {
    fontSize: rf(12),
    fontWeight: "700",
    color: T.error,
    marginBottom: rw(4),
  },
  warningLine: {
    fontSize: rf(12),
    color: T.textMuted,
  },
  confirmInput: {
    backgroundColor: T.bg,
    borderRadius: rw(10),
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: rw(14),
    paddingVertical: rw(12),
    fontSize: rf(14),
    color: T.text,
    marginBottom: rw(20),
    letterSpacing: 2,
  },

  // ── Action buttons ──
  sheetActions: {
    flexDirection: "row",
    gap: rw(10),
  },
  cancelBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: rw(12),
    borderWidth: 1,
    borderColor: T.border,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: T.textMuted,
  },
  warnBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: rw(12),
    backgroundColor: "#f59e0b",
    justifyContent: "center",
    alignItems: "center",
  },
  warnBtnText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#000",
  },
  deleteBtn: {
    flex: 1,
    height: rw(48),
    borderRadius: rw(12),
    backgroundColor: T.error,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtnText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#fff",
  },
  btnDisabled: {
    opacity: 0.4,
  },
});
