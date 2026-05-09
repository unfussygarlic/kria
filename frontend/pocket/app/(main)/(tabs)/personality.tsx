import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";

export default function PersonalityScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.center}>
        <Feather name="award" size={52} color={T.primary200} />
        <Text style={styles.title}>Personality</Text>
        <Text style={styles.subtitle}>Coming soon — your personality profile and badges will appear here.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
  title: { fontSize: 22, fontWeight: "700", color: T.text },
  subtitle: { fontSize: 15, color: T.textSub, textAlign: "center", lineHeight: 22 },
});
