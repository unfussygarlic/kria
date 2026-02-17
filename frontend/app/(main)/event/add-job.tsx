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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "600", color: T.text },
  body: { padding: 20, gap: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: T.text },
  field: { gap: 6 },
  row: { flexDirection: "row", gap: 10 },
  label: { fontSize: 13, fontWeight: "600", color: T.textSub },
  input: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: T.text,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
  },
  catCardSelected: { borderColor: T.primary, backgroundColor: T.primary50 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 13, color: T.textSub, fontWeight: "500" },
  catLabelSelected: { color: T.primary, fontWeight: "700" },
  payTypeCol: { flexDirection: "column", gap: 4 },
  payTypeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
  },
  payTypeBtnSelected: { borderColor: T.primary, backgroundColor: T.primary50 },
  payTypeBtnText: { fontSize: 12, color: T.textSub, fontWeight: "500" },
  payTypeBtnTextSelected: { color: T.primary, fontWeight: "700" },
  error: { color: T.error, fontSize: 14, textAlign: "center" },
  button: {
    backgroundColor: T.primary,
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: T.textInverse, fontSize: 17, fontWeight: "600" },
});
