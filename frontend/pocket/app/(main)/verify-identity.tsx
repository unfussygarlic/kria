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
import { rf, rw } from "@/constants/responsive";
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
  no_face_id:          "No face found on ID",
  no_face_selfie:      "No face found in selfie",
  low_confidence:      "Photos didn't match",
  duplicate_submission:"Duplicate detected",
  face_spoof_detected: "Spoof detected",
  service_unavailable: "Service unavailable",
  service_error:       "Service error",
  internal_error:      "Internal error",
};

function failLabel(code: string | null): string {
  if (!code) return "Verification failed";
  return FAIL_LABELS[code] ?? "Verification failed";
}

function hasActiveJob(statuses: Record<string, IDTypeStatus>): boolean {
  return Object.values(statuses).some(
    (s) => s.status === "pending" || s.status === "processing"
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

  // ── Status polling ─────────────────────────────────────────────────────────

  const loadStatuses = useCallback(async () => {
    const { data } = await fetchIDVerificationStatus();
    if (data) {
      setStatuses(data.statuses);
      // Refresh profile store if any type just became verified
      const anyNewlyVerified = Object.entries(data.statuses).some(
        ([t, s]) => s.status === "verified" && !verifiedTypes.includes(t)
      );
      if (anyNewlyVerified) fetchProfile();
    }
    setStatusLoading(false);
  }, [verifiedTypes, fetchProfile]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      loadStatuses();
    }, [loadStatuses])
  );

  // Poll every 5 s while any job is active
  useEffect(() => {
    if (screen !== "list") return;
    if (!hasActiveJob(statuses) && !statusLoading) return;

    const id = setInterval(loadStatuses, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [screen, statuses, statusLoading, loadStatuses]);

  // ── Camera handlers ────────────────────────────────────────────────────────

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

    const { error } = await verifyIdentityWithImages(activeIdType, idCardUri, selfieUri);

    if (error) {
      setUploadError(error);
    } else {
      // Job queued — update status immediately to pending
      setStatuses((prev) => ({
        ...prev,
        [activeIdType]: { status: "pending", error_code: null },
      }));
      setUploadError(null);
    }
    setScreen("list");
  }

  // ── Full-screen camera overlays ────────────────────────────────────────────

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

  // ── Uploading overlay ──────────────────────────────────────────────────────

  if (screen === "uploading") {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <HeaderBar title="Verify Identity" onBack={() => {}} />
        <View style={styles.centeredContent}>
          <ActivityIndicator color={T.primary} size="large" />
          <Text style={styles.bigTitle}>Uploading…</Text>
          <Text style={styles.subText}>Sending your photos securely. This takes a moment.</Text>
        </View>
      </View>
    );
  }

  // ── List screen ────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <HeaderBar title="Verify Identity" onBack={() => router.back()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload error banner */}
        {uploadError && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={T.error} />
            <Text style={styles.errorBannerText}>Upload failed: {uploadError}</Text>
          </View>
        )}

        {/* Earned badges */}
        {verifiedTypes.length > 0 && (
          <View style={styles.badgeSection}>
            <Text style={styles.sectionLabel}>Your badges</Text>
            <BadgeList earnedKeys={verifiedTypes} size="md" />
          </View>
        )}

        {/* Intro card (first-time users) */}
        {verifiedTypes.length === 0 && !hasActiveJob(statuses) && (
          <View style={styles.introCard}>
            <Feather name="shield" size={28} color={T.primary} />
            <View style={styles.introText}>
              <Text style={styles.introTitle}>Verify your identity</Text>
              <Text style={styles.introSub}>
                Verified runners get more gig opportunities and higher visibility to posters.
              </Text>
            </View>
          </View>
        )}

        {/* ID type list */}
        <Text style={styles.sectionLabel}>Government IDs</Text>
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

        {/* Active jobs hint */}
        {hasActiveJob(statuses) && (
          <View style={styles.pollingHint}>
            <ActivityIndicator color={T.textMuted} size="small" />
            <Text style={styles.pollingHintText}>Checking verification status…</Text>
          </View>
        )}

        {/* Privacy note */}
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

// ── ID row ─────────────────────────────────────────────────────────────────────

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
    <View style={[styles.idRow, isLast && styles.idRowLast]}>
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

function StatusControl({
  status, onVerify,
}: {
  status: IDVerificationStatus;
  onVerify: () => void;
}) {
  switch (status) {
    case "verified":
      return (
        <View style={styles.verifiedPill}>
          <Feather name="check" size={12} color="#22c55e" />
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
          <Feather name="refresh-cw" size={12} color={T.ctaText} />
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      );

    default: // unverified
      return (
        <Pressable style={styles.verifyBtn} onPress={onVerify}>
          <Text style={styles.verifyBtnText}>Verify</Text>
          <Feather name="chevron-right" size={14} color={T.ctaText} />
        </Pressable>
      );
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function HeaderBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backButton} hitSlop={8}>
        <Feather name="arrow-left" size={22} color={T.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.bg },
  scroll: { flex: 1 },
  listContent: { padding: rw(20), gap: rw(20), paddingBottom: 48 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rw(16),
    paddingVertical: rw(14),
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: rf(17), fontWeight: "600", color: T.text },

  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
    backgroundColor: `${T.error}18`,
    borderRadius: 10,
    padding: rw(12),
    borderWidth: 1,
    borderColor: `${T.error}40`,
  },
  errorBannerText: { flex: 1, fontSize: rf(13), color: T.error },

  badgeSection: { gap: rw(10) },

  sectionLabel: {
    fontSize: rf(12),
    fontWeight: "700",
    color: T.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  introCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rw(14),
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: rw(16),
    borderWidth: 1,
    borderColor: T.border,
  },
  introText: { flex: 1, gap: rw(4) },
  introTitle: { fontSize: rf(15), fontWeight: "700", color: T.text },
  introSub:  { fontSize: rf(13), color: T.textSub, lineHeight: rf(19) },

  idList: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(16),
    paddingVertical: rw(14),
    gap: rw(12),
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  idRowLast: { borderBottomWidth: 0 },
  idIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  idLabelCol: { flex: 1, gap: 2 },
  idLabel: { fontSize: rf(15), fontWeight: "600", color: T.text },
  failReason: { fontSize: rf(11), color: T.error },

  statusLoadingRow: {
    padding: rw(20),
    alignItems: "center",
  },

  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    backgroundColor: "#16a34a22",
    paddingHorizontal: rw(10),
    paddingVertical: rw(5),
    borderRadius: 20,
  },
  verifiedText: { fontSize: rf(13), fontWeight: "600", color: "#22c55e" },

  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    backgroundColor: T.surface,
    paddingHorizontal: rw(10),
    paddingVertical: rw(5),
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
  },
  pendingText: { fontSize: rf(12), color: T.textMuted },

  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(2),
    backgroundColor: T.ctaBg,
    paddingHorizontal: rw(12),
    paddingVertical: rw(7),
    borderRadius: 20,
  },
  verifyBtnText: { fontSize: rf(13), fontWeight: "700", color: T.ctaText },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    backgroundColor: `${T.error}22`,
    paddingHorizontal: rw(12),
    paddingVertical: rw(7),
    borderRadius: 20,
  },
  retryBtnText: { fontSize: rf(13), fontWeight: "700", color: T.error },

  pollingHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(8),
    justifyContent: "center",
    paddingVertical: rw(4),
  },
  pollingHintText: { fontSize: rf(12), color: T.textMuted },

  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: rw(10),
    padding: rw(14),
    backgroundColor: T.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  infoText: { flex: 1, fontSize: rf(12), color: T.textMuted, lineHeight: rf(18) },

  centeredContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: rw(32),
    gap: rw(16),
  },
  bigTitle: { fontSize: rf(22), fontWeight: "800", color: T.text, textAlign: "center" },
  subText:  { fontSize: rf(15), color: T.textSub, textAlign: "center", lineHeight: rf(22) },
});
