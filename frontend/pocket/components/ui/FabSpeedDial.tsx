/**
 * FabSpeedDial
 *
 * Root cause of iOS freeze:
 *   Animated.View with opacity starting at 0 → iOS CALayer marks the layer
 *   "hidden" and removes it from the compositing pipeline. The animation runs
 *   on the native thread and completes, but the screen never repaints because
 *   Core Animation never "woke" the layer. Only backgrounding/foregrounding
 *   forces a full layer-tree flush, revealing the finished state.
 *
 * Fix:
 *   - No opacity-0 animated layers in FabOverlay.
 *   - Overlay content is conditionally rendered (mounts only when open).
 *     Pure View/Pressable elements: ~10 nodes, < 2 ms to mount — no issue.
 *   - Only the + button rotation uses useNativeDriver:true; its solid
 *     background keeps the CALayer always active so that animation is safe.
 */

import { memo, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpeedDialOption {
  label: string;
  icon: string;
  onPress: () => void;
}

export interface FabDialHandle {
  open: boolean;
  toggle: () => void;
  close: (callback?: () => void) => void;
  rotation: Animated.Value; // drives + → × rotation on FloatingFab
}

// ── useFabDial ────────────────────────────────────────────────────────────────

export function useFabDial(): FabDialHandle {
  const [open, setOpen] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  const openDial = () => {
    setOpen(true);
    // useNativeDriver:true is safe here — FloatingFab always has a solid
    // background so its CALayer is never hidden, and the animation commits.
    Animated.timing(rotation, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const close = (callback?: () => void) => {
    Animated.timing(rotation, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      setOpen(false);
      callback?.();
    });
  };

  const toggle = () => (open ? close() : openDial());

  return { open, toggle, close, rotation };
}

// ── FloatingFab ───────────────────────────────────────────────────────────────
// Absolutely positioned outside React Navigation's tab bar.
// memo() + stable props → never re-renders after mount.

export const FloatingFab = memo(function FloatingFab({
  onPress,
  rotation,
}: {
  onPress: () => void;
  rotation: Animated.Value;
}) {
  const insets = useSafeAreaInsets();
  // Vertically centered in the floating tab bar (height 64, marginBottom 20)
  const bottom = 20 + insets.bottom;

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View style={[styles.fabPositioner, { bottom }]} pointerEvents="box-none">
      <Pressable onPress={onPress} hitSlop={16}>
        <Animated.View style={[styles.fab, { transform: [{ rotate }] }]}>
          <LinearGradient
            colors={T.gradBrand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Feather name="plus" size={28} color="#000" />
        </Animated.View>
      </Pressable>
    </View>
  );
});

// ── FabOverlay ────────────────────────────────────────────────────────────────
// Conditionally renders backdrop + option pills.
// No Animated opacity — plain Views appear/disappear instantly.
// This avoids the iOS CALayer "hidden layer" compositing bug entirely.

export function FabOverlay({
  dial,
  options,
}: {
  dial: FabDialHandle;
  options: SpeedDialOption[];
}) {
  const { open, close } = dial;
  const insets = useSafeAreaInsets();
  const tabBarBottom = 64 + 20 + insets.bottom;

  return (
    // Outer shell is always in the tree but has no geometry and box-none
    // pointer events — costs nothing when closed.
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {open && (
        <>
          {/* Backdrop — tap anywhere to close */}
          <TouchableWithoutFeedback onPress={() => close()}>
            <View style={[StyleSheet.absoluteFillObject, styles.backdrop]} />
          </TouchableWithoutFeedback>

          {/* Option pills */}
          <View
            style={[styles.optionsContainer, { bottom: tabBarBottom + 8 }]}
            pointerEvents="box-none"
          >
            {options.map((opt) => (
              <View key={opt.label} style={styles.optionRow}>
                <Pressable
                  style={styles.optionPill}
                  onPress={() => close(opt.onPress)}
                >
                  <Feather
                    name={opt.icon as any}
                    size={18}
                    color={T.primary}
                  />
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fabPositioner: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: T.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 12,
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  optionsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
    paddingBottom: 8,
  },
  optionRow: {
    alignItems: "center",
  },
  optionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: T.surface,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: T.text,
  },
});
