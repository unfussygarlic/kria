import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { rw } from "@/constants/responsive";

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
        { paddingBottom: Math.max(insets.bottom, 20) },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: rw(12),
    paddingHorizontal: rw(16),
  },
});
