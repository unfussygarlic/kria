/**
 * SwipeableJobCard — carousel-style card with index-based navigation.
 *
 * Gestures:
 *  - Swipe UP → Apply (animates up, snaps back, triggers onApply)
 *  - Swipe LEFT → Previous job (slides left, triggers onPrev)
 *  - Swipe RIGHT → Next job (slides right, triggers onNext)
 *  - Else → snaps back to center
 *
 * Uses PanResponder (Expo Go compatible, no Reanimated needed).
 */

import { useRef, useMemo, useCallback, useEffect } from "react";
import {
  Animated,
  PanResponder,
  Text,
  StyleSheet,
  Dimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Gig } from "@/types/database";
import { JobCard } from "./JobCard";
import { T } from "@/constants/colors";

const { width: W, height: H } = Dimensions.get("window");

const APPLY_THRESHOLD = -120;      // upward px to trigger apply
const NAV_THRESHOLD   = W * 0.25;  // horizontal px to trigger navigation

interface SwipeableJobCardProps {
  gig: Gig;
  posterMomentum?: number;
  canApply?: boolean;
  onApply: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function SwipeableJobCard({
  gig,
  posterMomentum,
  canApply = true,
  onApply,
  onNext,
  onPrev,
}: SwipeableJobCardProps) {
  const position = useRef(new Animated.ValueXY()).current;

  // Memoized interpolations (computed once, not recreated on every render)
  const rotate = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [-W * 0.5, 0, W * 0.5],
        outputRange: ["-8deg", "0deg", "8deg"],
        extrapolate: "clamp",
      }),
    [position.x]
  );

  const applyOpacity = useMemo(
    () =>
      position.y.interpolate({
        inputRange: [APPLY_THRESHOLD, APPLY_THRESHOLD * 0.4],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [position.y]
  );

  const nextOpacity = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [NAV_THRESHOLD * 0.3, NAV_THRESHOLD],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
    [position.x]
  );

  const prevOpacity = useMemo(
    () =>
      position.x.interpolate({
        inputRange: [-NAV_THRESHOLD, -NAV_THRESHOLD * 0.3],
        outputRange: [1, 0],
        extrapolate: "clamp",
      }),
    [position.x]
  );

  // ── Animation Helpers (Memoized) ──────────────────────────────────────────

  const snapBack = useCallback(
    () =>
      Animated.spring(position, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }).start(),
    [position]
  );

  const applyBounce = useCallback(
    (done: () => void) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.sequence([
        Animated.timing(position.y, {
          toValue: -H * 0.6,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
          friction: 8,
          tension: 80,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          position.setValue({ x: 0, y: 0 });
          done();
        }
      });
    },
    [position]
  );

  const slideOff = useCallback(
    (direction: "left" | "right", done: () => void) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const toX = direction === "right" ? W * 1.2 : -W * 1.2;
      Animated.parallel([
        Animated.timing(position.x, {
          toValue: toX,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(position.y, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          position.setValue({ x: 0, y: 0 });
          done();
        }
      });
    },
    [position]
  );

  // ── Memoized Transform Style ──────────────────────────────────────────────

  const animatedStyle = useMemo(
    () => ({
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
      ],
    }),
    [position.x, position.y, rotate]
  );

  // ── PanResponder ──────────────────────────────────────────────────────────

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
        onPanResponderTerminationRequest: () => false,

        onPanResponderGrant: () => {
          position.stopAnimation();
        },

        onPanResponderMove: Animated.event(
          [null, { dx: position.x, dy: position.y }],
          { useNativeDriver: false }
        ),

        onPanResponderRelease: (_, gs) => {
        const goingUp    = gs.dy < APPLY_THRESHOLD;
        const goingRight = gs.dx >  NAV_THRESHOLD;
        const goingLeft  = gs.dx < -NAV_THRESHOLD;
        const mostlyVertical = Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2;
        const fastVert   = gs.vy < -0.9;
        const fastRight  = gs.vx >  0.8;
        const fastLeft   = gs.vx < -0.8;

        // ⬆️ Apply
        if ((goingUp || fastVert) && mostlyVertical) {
          applyBounce(onApply);
        }
        // ➡️ Next (circular carousel always allows)
        else if (goingRight || fastRight) {
          slideOff("right", onNext);
        }
        // ⬅️ Previous (circular carousel always allows)
        else if (goingLeft || fastLeft) {
          slideOff("left", onPrev);
        }
        // ↩️ Snap back
        else {
          snapBack();
        }
      },

        onPanResponderTerminate: () => snapBack(),
      }),
    [position, onApply, onNext, onPrev, snapBack, applyBounce, slideOff]
  );

  // ── Cleanup ────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Reset position if component unmounts mid-animation
      position.setValue({ x: 0, y: 0 });
    };
  }, [position]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Animated.View
      collapsable={false}
      style={[styles.card, animatedStyle]}
      {...pan.panHandlers}
    >
      <JobCard gig={gig} variant="explore" posterMomentum={posterMomentum} />

      {/* ⬆️ Apply overlay */}
      <Animated.View
        style={[
          styles.applyOverlay,
          !canApply && styles.applyOverlayBlocked,
          { opacity: applyOpacity },
        ]}
        pointerEvents="none"
      >
        <Feather name={canApply ? "check-circle" : "lock"} size={52} color="#fff" />
        <Text style={styles.overlayText}>{canApply ? "Apply" : "Finder Mode"}</Text>
      </Animated.View>

      {/* ➡️ Next overlay (always rendered in circular carousel) */}
      <Animated.View
        style={[styles.nextOverlay, { opacity: nextOpacity }]}
        pointerEvents="none"
      >
        <Feather name="chevron-right" size={60} color="#fff" />
      </Animated.View>

      {/* ⬅️ Previous overlay (always rendered in circular carousel) */}
      <Animated.View
        style={[styles.prevOverlay, { opacity: prevOpacity }]}
        pointerEvents="none"
      >
        <Feather name="chevron-left" size={60} color="#fff" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: H * 0.55,
  },
  applyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(22, 163, 74, 0.90)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  applyOverlayBlocked: {
    backgroundColor: "rgba(107, 114, 128, 0.90)",
  },
  nextOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(234, 88, 12, 0.85)", // T.primary overlay
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  prevOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(234, 88, 12, 0.85)", // T.primary overlay
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
