/**
 * RatingModal — bottom sheet for submitting a structured rating.
 *
 * For worker_rating: renders one star row per dimension fetched from
 * GET /ratings/dimensions (driven by momentum/config.py on the backend).
 * Adding a new dimension in config automatically appears here.
 *
 * For poster_rating: single overall 1–5 star row (no dimensions).
 */

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { fetchRatingDimensions, submitRating } from "@/lib/api/ratings";
import type { RatingDimension } from "@/lib/api/ratings";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  gigId: string;
  rateeId: string;
  ratingType: "worker_rating" | "poster_rating";
  rateeName: string;
  onSuccess: () => void;
}

const STAR_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

function StarRow({
  label,
  question,
  score,
  onScore,
  disabled,
}: {
  label: string;
  question: string;
  score: number;
  onScore: (s: number) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.dimRow}>
      <View style={styles.dimHeader}>
        <Text style={styles.dimLabel}>{label}</Text>
        {score > 0 && (
          <Text style={styles.dimStarLabel}>{STAR_LABELS[score - 1]}</Text>
        )}
      </View>
      <Text style={styles.dimQuestion}>{question}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => onScore(star)}
            style={styles.starBtn}
            disabled={disabled}
          >
            <Feather
              name="star"
              size={rw(32)}
              color={score >= star ? T.accent : T.border}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function RatingModal({
  visible,
  onClose,
  gigId,
  rateeId,
  ratingType,
  rateeName,
  onSuccess,
}: RatingModalProps) {
  const insets = useSafeAreaInsets();
  const [dimensions, setDimensions] = useState<RatingDimension[]>([]);
  const [dimScores, setDimScores]   = useState<Record<string, number>>({});
  const [overallScore, setOverallScore] = useState(0); // used only for poster_rating
  const [comment, setComment]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dimsLoading, setDimsLoading] = useState(false);

  const isWorkerRating = ratingType === "worker_rating";
  const allDimsScored = isWorkerRating
    ? dimensions.length > 0 && dimensions.every((d) => (dimScores[d.key] ?? 0) > 0)
    : overallScore > 0;

  useEffect(() => {
    if (visible && isWorkerRating && dimensions.length === 0) {
      setDimsLoading(true);
      fetchRatingDimensions().then((res) => {
        if (res.data) setDimensions(res.data.dimensions);
        setDimsLoading(false);
      });
    }
  }, [visible, isWorkerRating]);

  const handleSubmit = async () => {
    if (!allDimsScored) {
      Alert.alert("Rate all dimensions", "Please rate every area before submitting.");
      return;
    }
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      gig_id: gigId,
      ratee_id: rateeId,
      rating_type: ratingType,
      comment: comment.trim() || undefined,
    };

    if (isWorkerRating) {
      for (const dim of dimensions) {
        payload[dim.key] = dimScores[dim.key];
      }
    } else {
      payload.score = overallScore;
    }

    const result = await submitRating(payload as Parameters<typeof submitRating>[0]);
    setSubmitting(false);
    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      onSuccess();
      onClose();
      setDimScores({});
      setOverallScore(0);
      setComment("");
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setDimScores({});
      setOverallScore(0);
      setComment("");
      onClose();
    }
  };

  const title = isWorkerRating ? "Rate Runner" : "Rate Host";
  const prompt = isWorkerRating
    ? `How did ${rateeName} perform?`
    : `How was ${rateeName} as a host?`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={handleClose} disabled={submitting}>
              <Feather name="x" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.prompt}>{prompt}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {isWorkerRating ? (
              dimsLoading ? (
                <ActivityIndicator color={T.primary} style={{ marginVertical: 24 }} />
              ) : (
                dimensions.map((dim) => (
                  <StarRow
                    key={dim.key}
                    label={dim.label}
                    question={dim.question}
                    score={dimScores[dim.key] ?? 0}
                    onScore={(s) => setDimScores((prev) => ({ ...prev, [dim.key]: s }))}
                    disabled={submitting}
                  />
                ))
              )
            ) : (
              /* Poster rating — single overall star row */
              <View style={styles.dimRow}>
                <View style={styles.dimHeader}>
                  <Text style={styles.dimLabel}>Overall</Text>
                  {overallScore > 0 && (
                    <Text style={styles.dimStarLabel}>{STAR_LABELS[overallScore - 1]}</Text>
                  )}
                </View>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setOverallScore(star)}
                      style={styles.starBtn}
                      disabled={submitting}
                    >
                      <Feather
                        name="star"
                        size={rw(36)}
                        color={overallScore >= star ? T.accent : T.border}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Add a comment (optional)"
              placeholderTextColor={T.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={300}
              editable={!submitting}
            />
          </ScrollView>

          <Pressable
            style={[styles.submitBtn, (!allDimsScored || submitting) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!allDimsScored || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={T.ctaText} />
            ) : (
              <Text style={styles.submitText}>Submit Rating</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheetWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: rw(24),
    borderTopRightRadius: rw(24),
    paddingHorizontal: rw(20),
    paddingTop: rw(12),
    minHeight: rw(380),
    maxHeight: "90%",
  },
  handle: {
    width: rw(40),
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: rw(14),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rw(6),
  },
  title: {
    fontSize: rf(18),
    fontWeight: "700",
    color: T.text,
  },
  prompt: {
    fontSize: rf(14),
    color: T.textSub,
    marginBottom: rw(16),
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: rw(20),
    paddingBottom: rw(8),
  },
  dimRow: {
    gap: rw(6),
  },
  dimHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dimLabel: {
    fontSize: rf(13),
    fontWeight: "700",
    color: T.text,
  },
  dimStarLabel: {
    fontSize: rf(12),
    fontWeight: "600",
    color: T.accent,
  },
  dimQuestion: {
    fontSize: rf(12),
    color: T.textMuted,
    marginBottom: rw(4),
  },
  stars: {
    flexDirection: "row",
    gap: rw(8),
  },
  starBtn: {
    padding: rw(4),
  },
  input: {
    backgroundColor: T.bg,
    borderRadius: rw(12),
    borderWidth: 1,
    borderColor: T.border,
    padding: rw(12),
    fontSize: rf(14),
    color: T.text,
    minHeight: rw(70),
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: T.ctaBg,
    borderRadius: rw(12),
    height: rw(50),
    justifyContent: "center",
    alignItems: "center",
    marginTop: rw(16),
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: T.ctaText,
    fontWeight: "700",
    fontSize: rf(15),
  },
});
