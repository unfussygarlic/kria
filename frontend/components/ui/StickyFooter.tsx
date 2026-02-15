import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

interface StickyFooterProps {
  children: React.ReactNode;
}

/**
 * A footer that sticks to the bottom of the screen.
 * - Sits naturally below a flex:1 ScrollView (no absolute positioning)
 * - Handles iPhone home indicator via useSafeAreaInsets
 * - Consistent separator line and background across all screens
 */
export function StickyFooter({ children }: StickyFooterProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.footer,
        { paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
});
