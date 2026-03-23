/**
 * RatingModal — bottom sheet for submitting a star rating.
 * Usage:
 *   <RatingModal
 *     visible={show}
 *     onClose={() => setShow(false)}
 *     gigId={gig.id}
 *     rateeId={person.id}
 *     ratingType="worker_rating" | "poster_rating"
 *     rateeName="John Doe"
 *     onSuccess={() => { ... hide rate button ... }}
 *   />
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { submitRating } from "@/lib/api/ratings";

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  gigId: string;
  rateeId: string;
  ratingType: "worker_rating" | "poster_rating";
  rateeName: string;
  onSuccess: () => void;
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
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const label = ratingType === "worker_rating" ? "Rate Worker" : "Rate Finder";
  const prompt =
    ratingType === "worker_rating"
      ? `How was ${rateeName}'s performance?`
      : `How was ${rateeName} as a finder?`;

  const handleSubmit = async () => {
    if (score === 0) {
      Alert.alert("Select a rating", "Please tap a star before submitting.");
      return;
    }
    setSubmitting(true);
    const result = await submitRating({
      gig_id: gigId,
      ratee_id: rateeId,
      rating_type: ratingType,
      score,
      comment: comment.trim() || undefined,
    });
    setSubmitting(false);
    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      onSuccess();
      onClose();
      // Reset state
      setScore(0);
      setComment("");
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setScore(0);
      setComment("");
      onClose();
    }
  };

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
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{label}</Text>
            <Pressable onPress={handleClose} disabled={submitting}>
              <Feather name="x" size={22} color={T.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.prompt}>{prompt}</Text>

          {/* Star selector */}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => setScore(star)}
                style={styles.starBtn}
              >
                <Feather
                  name="star"
                  size={36}
                  color={star <= score ? T.accent : T.border}
                />
              </Pressable>
            ))}
          </View>

          {/* Star label */}
          {score > 0 && (
            <Text style={styles.starLabel}>{STAR_LABELS[score - 1]}</Text>
          )}

          {/* Comment */}
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

          {/* Submit */}
          <Pressable
            style={[styles.submitBtn, (score === 0 || submitting) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={score === 0 || submitting}
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

const STAR_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"];

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetWrapper: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
    gap: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: T.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text,
  },
  prompt: {
    fontSize: 15,
    color: T.textSub,
  },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  starLabel: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: T.accent,
  },
  input: {
    backgroundColor: T.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    padding: 12,
    fontSize: 14,
    color: T.text,
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: T.ctaBg,
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: T.ctaText,
    fontWeight: "700",
    fontSize: 15,
  },
});
