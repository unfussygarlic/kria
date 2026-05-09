/**
 * MomentumBreakdown
 * ──────────────────
 * Bottom-sheet modal showing a user's Momentum signal breakdown.
 * Shows conceptual bars (not raw percentages or formulas).
 * Only ever shown to the authenticated user for their own profile.
 *
 * Usage:
 *   <MomentumBreakdown
 *     visible={open}
 *     onClose={() => setOpen(false)}
 *     breakdown={myBreakdown}
 *     activeRole="worker"  // "worker" | "poster"
 *   />
 */

import { useRef, useEffect } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { T } from "@/constants/colors";
import { getBand, type MomentumBand } from "@/constants/momentum";
import { rf, rw } from "@/constants/responsive";
import type { WorkerBreakdownData, BreakdownItem, ProfileSignalItem } from "@/lib/api/momentum";

interface MomentumBreakdownProps {
  visible: boolean;
  onClose: () => void;
  breakdown: WorkerBreakdownData | null;
  isLoading?: boolean;
}

export function MomentumBreakdown({
  visible,
  onClose,
  breakdown,
  isLoading = false,
}: MomentumBreakdownProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 9,
        tension: 80,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const score = breakdown?.score.score ?? 0;
  const band = getBand(score);
  const items: BreakdownItem[] = breakdown?.signals ?? [];
  const profileItems: ProfileSignalItem[] = breakdown?.profile_signals ?? [];
  const profilePoints = breakdown?.score.profile_points ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + rw(16), transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Momentum Breakdown</Text>
            <Text style={styles.headerSub}>Runner · Momentum signals</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={T.textMuted} />
          </Pressable>
        </View>

        {/* Current score pill */}
        <View style={[styles.scorePill, { backgroundColor: band.bgColor }]}>
          <Text style={[styles.scorePillNumber, { color: band.color }]}>{score}</Text>
          <Text style={[styles.scorePillLabel, { color: band.textColor }]}>{band.label}</Text>
        </View>

        {isLoading || items.length === 0 ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>
              {isLoading ? "Loading breakdown…" : "No breakdown data yet.\nComplete your first gig to see signals."}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.itemsScroll}
            contentContainerStyle={styles.itemsContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <SignalRow key={item.key} item={item} bandColor={band.color} />
            ))}

            {/* Profile completion bonus */}
            {profileItems.length > 0 && (
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <Text style={styles.profileSectionLabel}>Profile Completion</Text>
                  <Text style={[styles.profilePoints, { color: band.color }]}>+{profilePoints} pts</Text>
                </View>
                <View style={styles.profileChips}>
                  {profileItems.map((ps) => (
                    <View
                      key={ps.key}
                      style={[
                        styles.profileChip,
                        ps.earned ? { backgroundColor: band.bgColor } : styles.profileChipEmpty,
                      ]}
                    >
                      <Text style={[
                        styles.profileChipText,
                        ps.earned ? { color: band.color } : styles.profileChipTextEmpty,
                      ]}>
                        {ps.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}

        {/* Explanation */}
        <View style={styles.explanationBox}>
          <Feather name="info" size={14} color={T.textMuted} style={{ marginTop: 1 }} />
          <Text style={styles.explanationText}>
            {breakdown?.explanation ??
              "Momentum reflects recent reliability and fairness. It updates after completed gigs."}
          </Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Signal row ────────────────────────────────────────────────────────────────

function SignalRow({ item, bandColor }: { item: BreakdownItem; bandColor: string }) {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (item.has_data) {
      Animated.timing(barAnim, {
        toValue: item.bar_value,
        duration: 600,
        useNativeDriver: false,
      }).start();
    }
  }, [item.bar_value, item.has_data]);

  return (
    <View style={[styles.signalRow, !item.has_data && styles.signalRowNoData]}>
      <View style={styles.signalHeader}>
        <View style={styles.signalLabelRow}>
          <Text style={[styles.signalLabel, !item.has_data && styles.signalLabelNoData]}>
            {item.label}
          </Text>
          {!item.has_data && (
            <Text style={styles.noDataBadge}>No data yet</Text>
          )}
        </View>
        <Text style={styles.signalDesc}>{item.description}</Text>
      </View>
      <View style={styles.barTrack}>
        {item.has_data && (
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: bandColor,
                width: barAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        )}
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: rw(24),
    paddingTop: rw(12),
    maxHeight: "80%",
  },
  handleBar: {
    width: rw(40),
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: rw(16),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: rw(16),
  },
  headerTitle: {
    fontSize: rf(18),
    fontWeight: "700",
    color: T.text,
  },
  headerSub: {
    fontSize: rf(12),
    color: T.textMuted,
    marginTop: 2,
    textTransform: "capitalize",
  },
  closeBtn: {
    padding: rw(4),
  },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: rw(8),
    paddingHorizontal: rw(20),
    paddingVertical: rw(10),
    borderRadius: 40,
    marginBottom: rw(20),
  },
  scorePillNumber: {
    fontSize: rf(24),
    fontWeight: "800",
  },
  scorePillLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  loadingBox: {
    paddingVertical: rw(40),
    alignItems: "center",
  },
  loadingText: {
    fontSize: rf(14),
    color: T.textMuted,
    textAlign: "center",
    lineHeight: rf(22),
  },
  itemsScroll: {
    maxHeight: 280,
  },
  itemsContent: {
    gap: rw(16),
  },
  signalRow: {
    gap: rw(6),
  },
  signalRowNoData: {
    opacity: 0.45,
  },
  signalHeader: {
    gap: rw(2),
  },
  signalLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
  },
  signalLabel: {
    fontSize: rf(14),
    fontWeight: "600",
    color: T.text,
  },
  signalLabelNoData: {
    color: T.textMuted,
  },
  noDataBadge: {
    fontSize: rf(10),
    color: T.textMuted,
    backgroundColor: T.bg,
    borderRadius: 4,
    paddingHorizontal: rw(6),
    paddingVertical: 2,
  },
  signalDesc: {
    fontSize: rf(11),
    color: T.textMuted,
    lineHeight: rf(16),
  },
  barTrack: {
    height: rw(8),
    backgroundColor: T.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  explanationBox: {
    flexDirection: "row",
    gap: rw(8),
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: rw(14),
    marginTop: rw(20),
  },
  explanationText: {
    flex: 1,
    fontSize: rf(12),
    color: T.textMuted,
    lineHeight: rf(18),
  },
  profileSection: {
    gap: rw(10),
    paddingTop: rw(16),
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  profileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileSectionLabel: {
    fontSize: rf(11),
    fontWeight: "700",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  profilePoints: {
    fontSize: rf(11),
    fontWeight: "700",
  },
  profileChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(6),
  },
  profileChip: {
    paddingHorizontal: rw(10),
    paddingVertical: rw(4),
    borderRadius: 20,
  },
  profileChipEmpty: {
    backgroundColor: T.bg,
    opacity: 0.5,
  },
  profileChipText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  profileChipTextEmpty: {
    color: T.textMuted,
    textDecorationLine: "line-through",
  },
});
