import { View, Text, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { S, TYPE } from "@/constants/design";
import { SearchTab } from "@/components/explore/SearchTab";

export default function JobsScreen() {
  const insets = useSafeAreaInsets();
  // `q` is set when routed here from Home's "See all results" tail so the
  // user's inline query flows through to the full browse-all experience.
  const { q } = useLocalSearchParams<{ q?: string }>();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>JOBS</Text>
        <Text style={styles.title}>Browse all gigs & events</Text>
      </View>
      <SearchTab initialQuery={typeof q === "string" ? q : ""} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    paddingHorizontal: S.lg,
    paddingTop: S.sm,
    paddingBottom: 0,
    gap: 2,
  },
  eyebrow: {
    ...TYPE.label,
    color: T.textMuted,
  },
  title: {
    ...TYPE.title1,
    color: T.text,
    marginTop: 2,
  },
});
