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
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGigStore } from "@/stores/gigStore";
import { T, CategoryColors } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import { GigCategories } from "@/constants/config";
import { GigCategory } from "@/types/database";
import { StickyFooter } from "@/components/ui/StickyFooter";

export default function AddJobScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const insets = useSafeAreaInsets();
  const addJobToEvent = useGigStore((s) => s.addJobToEvent);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedCategory, setSelectedCategory] = useState<GigCategory | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<"fixed" | "hourly" | "per_day">("fixed");
  const [slotsTotal, setSlotsTotal] = useState("1");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");

  const validate = () => {
    if (!selectedCategory) { setError("Please select a job category"); return false; }
    if (!jobTitle.trim()) { setError("Job title is required"); return false; }
    if (!payAmount || isNaN(Number(payAmount)) || Number(payAmount) <= 0) {
      setError("Please enter a valid pay amount"); return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate() || !eventId) return;
    setIsLoading(true);
    setError("");

    const result = await addJobToEvent(eventId, {
      category: selectedCategory!,
      title: jobTitle.trim(),
      pay_amount: Number(payAmount),
      pay_type: payType,
      slots_total: parseInt(slotsTotal) || 1,
      shift_start_time: shiftStart,
      shift_end_time: shiftEnd,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color={T.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Job</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {/* Category */}
        <Text style={styles.sectionTitle}>Job Category *</Text>
        <View style={styles.categoryGrid}>
          {GigCategories.map((cat) => (
            <Pressable
              key={cat.value}
              style={[styles.catCard, selectedCategory === cat.value && styles.catCardSelected]}
              onPress={() => { setSelectedCategory(cat.value as GigCategory); setError(""); }}
            >
              <View style={[styles.catDot, { backgroundColor: CategoryColors[cat.value] || T.textMuted }]} />
              <Text style={[styles.catLabel, selectedCategory === cat.value && styles.catLabelSelected]}>
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Event Cook"
            placeholderTextColor={T.textMuted}
            value={jobTitle}
            onChangeText={(t) => { setJobTitle(t); setError(""); }}
          />
        </View>

        {/* Pay */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 2 }]}>
            <Text style={styles.label}>Pay Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1500"
              placeholderTextColor={T.textMuted}
              value={payAmount}
              onChangeText={(t) => { setPayAmount(t); setError(""); }}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Per</Text>
            <View style={styles.payTypeCol}>
              {(["fixed", "hourly", "per_day"] as const).map((pt) => (
                <Pressable
                  key={pt}
                  style={[styles.payTypeBtn, payType === pt && styles.payTypeBtnSelected]}
                  onPress={() => setPayType(pt)}
                >
                  <Text style={[styles.payTypeBtnText, payType === pt && styles.payTypeBtnTextSelected]}>
                    {pt === "fixed" ? "Fixed" : pt === "hourly" ? "Hour" : "Day"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Slots + Times */}
        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Slots</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={T.textMuted}
              value={slotsTotal}
              onChangeText={setSlotsTotal}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Start Time</Text>
            <TextInput
              style={styles.input}
              placeholder="09:00"
              placeholderTextColor={T.textMuted}
              value={shiftStart}
              onChangeText={setShiftStart}
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>End Time</Text>
            <TextInput
              style={styles.input}
              placeholder="17:00"
              placeholderTextColor={T.textMuted}
              value={shiftEnd}
              onChangeText={setShiftEnd}
              autoCapitalize="none"
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      <StickyFooter>
        <Pressable
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>{isLoading ? "Saving..." : "Add Job"}</Text>
        </Pressable>
      </StickyFooter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.md,
    paddingBottom: S.md,
    backgroundColor: T.bg,
  },
  backButton: { padding: 4 },
  headerTitle: { ...TYPE.title3, color: T.text },
  body: { padding: S.lg, gap: S.md, paddingBottom: S.lg },
  sectionTitle: { ...TYPE.title3, color: T.text },
  field: { gap: 6 },
  row: { flexDirection: "row", gap: S.xs },
  label: { ...TYPE.body, fontFamily: "Inter_600SemiBold", fontWeight: "600", color: T.textSub },
  input: {
    backgroundColor: T.surface2,
    borderRadius: R.input,
    paddingHorizontal: S.sm,
    height: rw(48),
    ...TYPE.body,
    color: T.text,
    ...SHADOW.sm,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: S.xs },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
    borderRadius: R.button,
    backgroundColor: T.surface1,
    ...SHADOW.sm,
  },
  catCardSelected: { backgroundColor: T.selBg },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { ...TYPE.caption, color: T.textSub, fontFamily: "Inter_500Medium", fontWeight: "500" },
  catLabelSelected: { color: T.selText, fontFamily: "Inter_700Bold", fontWeight: "700" },
  payTypeCol: { flexDirection: "column", gap: 4 },
  payTypeBtn: {
    paddingHorizontal: S.xs,
    paddingVertical: 6,
    borderRadius: R.button,
    backgroundColor: T.surface2,
    alignItems: "center",
  },
  payTypeBtnSelected: { backgroundColor: T.selBg },
  payTypeBtnText: { ...TYPE.caption, color: T.textSub, fontFamily: "Inter_500Medium", fontWeight: "500" },
  payTypeBtnTextSelected: { color: T.selText, fontFamily: "Inter_700Bold", fontWeight: "700" },
  error: { color: T.error, ...TYPE.body, textAlign: "center" },
  button: {
    backgroundColor: T.ctaBg,
    height: rw(54),
    borderRadius: R.button,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.md,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: T.ctaText, ...TYPE.title3, fontFamily: "Inter_600SemiBold", fontWeight: "600" },
});
