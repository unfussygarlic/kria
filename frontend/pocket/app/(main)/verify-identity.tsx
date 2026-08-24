/**
 * Verify Identity — lists government ID types with per-type verification state.
 * Launches VerificationCamera (id → selfie) then polls for the Inspector result.
 *
 * Redesigned 2026-08-23: SHADOW cards, TYPE tokens, S/R spacing. Verification
 * flow (camera / upload / poll) preserved.
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";
import {
  verifyIdentityWithImages,
  fetchIDVerificationStatus,
  ID_TYPE_OPTIONS,
  IDType,
  IDTypeStatus,
  IDVerificationStatus,
} from "@/lib/api/profile";
import { VerificationCamera } from "@/components/camera/VerificationCamera";
import { BadgeList, BADGE_DEFS } from "@/components/ui/VerifiedBadges";

type Screen = "list" | "camera_id" | "camera_selfie" | "uploading";

const POLL_INTERVAL_MS = 5000;

const FAIL_LABELS: Record<string, string> = {
  no_face_id:              "No face found on ID",
  no_face_selfie:          "No face found in selfie",
  low_confidence:          "Photos didn't match",
  duplicate_submission:    "Duplicate image detected",
  face_spoof_detected:     "Spoof detected",
  id_type_mismatch:        "Wrong document type",
  id_type_unclassifiable:  "Could not read document — retake in better lighting",
  service_unavailable:     "Service unavailable — please retry",
  service_error:           "Service error",
  internal_error:          "Internal error",
};

function failLabel(code: string | null): string {
  if (!code) return "Verification failed";
  return FAIL_LABELS[code] ?? "Verification failed";
}

function hasActiveJob(statuses: Record<string, IDTypeStatus>): boolean {
  return Object.values(statuses).some(
    (s) => s.status === "pending" || s.status === "processing",
  );
}

export default function VerifyIdentityScreen() {
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const fetchProfile = useAuthStore((s) => s.fetchProfile);

  const [screen, setScreen] = useState<Screen>("list");
  const [activeIdType, setActiveIdType] = useState<IDType | null>(null);
  const [idCardUri, setIdCardUri] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, IDTypeStatus>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const verifiedTypes: string[] = profile?.verified_id_types ?? [];

  const loadStatuses = useCallback(async () => {
    const { data } = await fetchIDVerificationStatus();
    if (data) {
      setStatuses(data.statuses);
      const anyNewlyVerified = Object.entries(data.statuses).some(
        ([t, s]) => s.status === "verified" && !verifiedTypes.includes(t),
      );
      if (anyNewlyVerified) fetchProfile();
    }
    setStatusLoading(false);
  }, [verifiedTypes, fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      loadStatuses();
    }, [loadStatuses]),
  );

  useEffect(() => {
    if (screen !== "list") return;
    if (!hasActiveJob(statuses) && !statusLoading) return;
    const id = setInterval(loadStatuses, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [screen, statuses, statusLoading, loadStatuses]);

  function startVerification(idType: IDType) {
    setActiveIdType(idType);
    setIdCardUri(null);
    setUploadError(null);
    setScreen("camera_id");
  }

  function onIdCaptured(uri: string) {
    setIdCardUri(uri);
    setScreen("camera_selfie");
  }

  async function onSelfieCaptured(selfieUri: string) {
    if (!activeIdType || !idCardUri) return;
    setScreen("uploading");
    setUploadError(null);

    const { error } = await verifyIdentityWithImages(activeIdType, idCardUri, selfieUri);
    setScreen("list");

    if (error) {
      setUploadError(error);
    } else {
      setStatuses((prev) => ({
        ...prev,
        [activeIdType]: { status: "pending", error_code: null },
      }));
    }
  }

  if (screen === "camera_id") {
    return (
      <VerificationCamera
        mode="id"
        onCapture={onIdCaptured}
        onClose={() => setScreen("list")}
      />
    );
  }

  if (screen === "camera_selfie") {
    return (
      <VerificationCamera
        mode="selfie"
        onCapture={onSelfieCaptured}
        onClose={() => setScreen("camera_id")}
      />
    );
  }

  if (screen === "uploading") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HeaderBar title="Verify identity" onBack={() => setScreen("list")} />
        <View style={styles.centeredContent}>
          <ActivityIndicator color={T.primary} size="large" />
          <Text style={styles.bigTitle}>Uploading…</Text>
          <Text style={styles.subText}>Sending your photos securely. This takes a moment.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <HeaderBar title="Verify identity" onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {uploadError && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={T.error} />
            <Text style={styles.errorBannerText}>Upload failed: {uploadError}</Text>
          </View>
        )}

        {verifiedTypes.length > 0 && (
          <View style={styles.badgeSection}>
            <Text style={styles.sectionLabel}>YOUR BADGES</Text>
            <BadgeList earnedKeys={verifiedTypes} size="md" />
          </View>
        )}

        {verifiedTypes.length === 0 && !hasActiveJob(statuses) && (
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Feather name="shield" size={28} color={T.primary} />
            </View>
            <View style={styles.introText}>
              <Text style={styles.introTitle}>Verify your identity</Text>
              <Text style={styles.introSub}>
                Verified runners land more gigs and better pay. Takes about 30 seconds.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>GOVERNMENT IDS</Text>
        <View style={styles.idList}>
          {statusLoading ? (
            <View style={styles.statusLoadingRow}>
              <ActivityIndicator color={T.textMuted} size="small" />
            </View>
          ) : (
            ID_TYPE_OPTIONS.map((opt, idx) => {
              const s: IDTypeStatus = statuses[opt.value] ?? { status: "unverified", error_code: null };
              const def = BADGE_DEFS[opt.value];
              const isLast = idx === ID_TYPE_OPTIONS.length - 1;
              return (
                <IDRow
                  key={opt.value}
                  label={opt.label}
                  def={def}
                  typeStatus={s}
                  isLast={isLast}
                  onVerify={() => startVerification(opt.value)}
                />
              );
            })
          )}
        </View>

        {hasActiveJob(statuses) && (
          <View style={styles.pollingHint}>
            <ActivityIndicator color={T.textMuted} size="small" />
            <Text style={styles.pollingHintText}>Checking verification status…</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Feather name="lock" size={16} color={T.textMuted} />
          <Text style={styles.infoText}>
            Your photos are sent securely for face matching and are not stored after verification.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function IDRow({
  label, def, typeStatus, isLast, onVerify,
}: {
  label: string;
  def: { icon: any; color: string; bg: string };
  typeStatus: IDTypeStatus;
  isLast: boolean;
  onVerify: () => void;
}) {
  const { status, error_code } = typeStatus;

  return (
    <View style={[styles.idRow, !isLast && styles.idRowDivider]}>
      <View style={[styles.idIcon, { backgroundColor: def.bg }]}>
        <Feather name={def.icon} size={20} color={def.color} />
      </View>

      <View style={styles.idLabelCol}>
        <Text style={styles.idLabel}>{label}</Text>
        {status === "failed" && (
          <Text style={styles.failReason}>{failLabel(error_code)}</Text>
        )}
      </View>

      <StatusControl status={status} onVerify={onVerify} />
    </View>
  );
}

function StatusControl({ status, onVerify }: { status: IDVerificationStatus; onVerify: () => void }) {
  switch (status) {
    case "verified":
      return (
        <View style={styles.verifiedPill}>
          <Feather name="check" size={12} color={T.success} />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      );

    case "pending":
    case "processing":
      return (
        <View style={styles.pendingPill}>
          <ActivityIndicator size="small" color={T.textMuted} style={{ transform: [{ scale: 0.65 }] }} />
          <Text style={styles.pendingText}>Verifying…</Text>
        </View>
      );

    case "failed":
      return (
        <Pressable style={styles.retryBtn} onPress={onVerify}>
          <Feather name="refresh-cw" size={12} color={T.error} />
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      );

    default:
      return (
        <Pressable style={styles.verifyBtn} onPress={onVerify}>
          <Text style={styles.verifyBtnText}>Verify</Text>
          <Feather name="chevron-right" size={14} color={T.ctaText} />
        </Pressable>
      );
  }
}

function HeaderBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
        <Feather name="arrow-left" size={22} color={T.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: rw(36) }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  listContent: { padding: S.lg, gap: S.lg, paddingBottom: S.hero },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },
  backButton: {
    width: rw(36),
    height: rw(36),
    borderRadius: R.thumb,
    backgroundColor: T.surface1,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  headerTitle: { ...TYPE.title3, color: T.text },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    backgroundColor: T.error + "18",
    borderRadius: R.card,
    padding: S.sm,
  },
  errorBannerText: { flex: 1, ...TYPE.body, color: T.error },

  badgeSection: { gap: S.xs },

  sectionLabel: {
    ...TYPE.label,
    color: T.textMuted,
  },

  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    ...SHADOW.card,
  },
  introIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: R.thumb,
    backgroundColor: T.primary + "18",
    justifyContent: "center",
    alignItems: "center",
  },
  introText: { flex: 1, gap: 4 },
  introTitle: { ...TYPE.title3, color: T.text },
  introSub:  { ...TYPE.body, color: T.textSub },

  idList: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    overflow: "hidden",
    ...SHADOW.card,
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
    gap: S.sm,
  },
  idRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: T.surface2,
  },
  idIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: R.thumb,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  idLabelCol: { flex: 1, gap: 2 },
  idLabel: { ...TYPE.body, fontFamily: "Inter_600SemiBold", fontWeight: "600", color: T.text },
  failReason: { ...TYPE.caption, color: T.error },

  statusLoadingRow: {
    padding: S.lg,
    alignItems: "center",
  },

  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.success + "22",
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
  },
  verifiedText: { ...TYPE.caption, fontFamily: "Inter_600SemiBold", fontWeight: "600", color: T.success },

  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.surface2,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
  },
  pendingText: { ...TYPE.caption, color: T.textMuted },

  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: T.ctaBg,
    paddingHorizontal: S.sm,
    paddingVertical: 7,
    borderRadius: R.chip,
    ...SHADOW.sm,
  },
  verifyBtnText: { ...TYPE.caption, fontFamily: "Inter_700Bold", fontWeight: "700", color: T.ctaText },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.error + "22",
    paddingHorizontal: S.sm,
    paddingVertical: 7,
    borderRadius: R.chip,
  },
  retryBtnText: { ...TYPE.caption, fontFamily: "Inter_700Bold", fontWeight: "700", color: T.error },

  pollingHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    justifyContent: "center",
    paddingVertical: S.xxs,
  },
  pollingHintText: { ...TYPE.caption, color: T.textMuted },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: S.xs,
    padding: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    ...SHADOW.card,
  },
  infoText: { flex: 1, ...TYPE.caption, color: T.textMuted },

  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: S.xxl,
    gap: S.md,
  },
  bigTitle: { ...TYPE.title2, color: T.text, textAlign: "center" },
  subText:  { ...TYPE.bodyLg, color: T.textSub, textAlign: "center" },
});
