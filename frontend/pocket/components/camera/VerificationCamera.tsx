/**
 * VerificationCamera
 * ──────────────────
 * Full-screen in-app camera for identity verification.
 *
 * mode="id"     → rear camera, landscape rectangle guideline for ID card
 * mode="selfie" → front camera, oval guideline for face
 *
 * Usage:
 *   <VerificationCamera
 *     mode="id"
 *     onCapture={(uri) => setIdCardUri(uri)}
 *     onClose={() => setShowCamera(false)}
 *   />
 */

import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";

const { width: SW, height: SH } = Dimensions.get("window");

// ── Guide dimensions ──────────────────────────────────────────────────────────

// ID card: ISO/IEC 7810 ID-1 — 85.6 × 54 mm → aspect 1.585
const ID_W = SW * 0.82;
const ID_H = ID_W / 1.585;

// Selfie oval: face guide — intentionally smaller than the capture window
const OVAL_W = SW * 0.62;
const OVAL_H = OVAL_W * 1.35;

// Selfie capture window: larger rectangle so even a face that fills the oval
// leaves enough surrounding context for Inspector's face detector.
const SELFIE_CAP_W = SW * 0.88;
const SELFIE_CAP_H = OVAL_H + 96;

// ── Overlay helpers ────────────────────────────────────────────────────────────

/**
 * Four dark bars that create a "spotlight" cutout effect.
 * capW/capH control where the dark bars stop (the visible window).
 * guideW/guideH control where the face-guide border is drawn (oval or rect).
 * For selfie mode capW/capH > guideW/guideH, giving space around the oval.
 */
function SpotlightMask({
  guideW, guideH, capW, capH, isOval,
}: {
  guideW: number;
  guideH: number;
  capW: number;
  capH: number;
  isOval: boolean;
}) {
  const capPadH = (SH - capH) / 2;
  const capPadV = (SW - capW) / 2;
  const guidePadH = (SH - guideH) / 2;
  const guidePadV = (SW - guideW) / 2;
  const dim = "rgba(0,0,0,0.60)";

  return (
    <>
      {/* Top */}
      <View
        pointerEvents="none"
        // @ts-ignore
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: capPadH, backgroundColor: dim }}
      />
      {/* Bottom */}
      <View
        pointerEvents="none"
        // @ts-ignore
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: capPadH, backgroundColor: dim }}
      />
      {/* Left */}
      <View
        pointerEvents="none"
        // @ts-ignore
        style={{ position: "absolute", top: capPadH, left: 0, width: capPadV, height: capH, backgroundColor: dim }}
      />
      {/* Right */}
      <View
        pointerEvents="none"
        // @ts-ignore
        style={{ position: "absolute", top: capPadH, right: 0, width: capPadV, height: capH, backgroundColor: dim }}
      />
      {/* Face guide border (oval for selfie, rounded rect for ID) */}
      <View
        pointerEvents="none"
        // @ts-ignore
        style={{
          position: "absolute",
          top: guidePadH,
          left: guidePadV,
          width: guideW,
          height: guideH,
          borderWidth: 2,
          borderColor: T.primary,
          borderRadius: isOval ? guideW : 14,
        }}
      />
    </>
  );
}

// ── Corner brackets for ID guide ──────────────────────────────────────────────

function CornerBrackets({ guideW, guideH }: { guideW: number; guideH: number }) {
  const padH = (SH - guideH) / 2;
  const padV = (SW - guideW) / 2;
  const L = 22; // bracket arm length
  const T2 = 3; // thickness
  const color = T.primary;
  const r = 10; // corner radius

  const corners = [
    // top-left
    { top: padH, left: padV, borderTopLeftRadius: r, borderTopWidth: T2, borderLeftWidth: T2 },
    // top-right
    { top: padH, left: padV + guideW - L, borderTopRightRadius: r, borderTopWidth: T2, borderRightWidth: T2 },
    // bottom-left
    { top: padH + guideH - L, left: padV, borderBottomLeftRadius: r, borderBottomWidth: T2, borderLeftWidth: T2 },
    // bottom-right
    { top: padH + guideH - L, left: padV + guideW - L, borderBottomRightRadius: r, borderBottomWidth: T2, borderRightWidth: T2 },
  ];

  return (
    <>
      {corners.map((c, i) => (
        <View
          key={i}
          pointerEvents="none"
          // @ts-ignore
          style={{
            position: "absolute",
            width: L,
            height: L,
            borderColor: color,
            ...c,
          }}
        />
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  mode: "id" | "selfie";
  onCapture: (uri: string) => void;
  onClose: () => void;
}

export function VerificationCamera({ mode, onCapture, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const isId = mode === "id";
  const facing = isId ? "back" : "front";
  const guideW = isId ? ID_W : OVAL_W;
  const guideH = isId ? ID_H : OVAL_H;
  // ID: capture window == guide. Selfie: larger window so face never fills the whole frame.
  const capW = isId ? ID_W : SELFIE_CAP_W;
  const capH = isId ? ID_H : SELFIE_CAP_H;

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.88, skipProcessing: false });
      if (photo?.uri) onCapture(photo.uri);
    } finally {
      setCapturing(false);
    }
  }

  // ── Permission gate ──────────────────────────────────────────────────────

  if (!permission) {
    return <View style={styles.screen} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.permCenter]}>
        <Feather name="camera-off" size={48} color={T.textMuted} />
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>
          Allow camera access to verify your identity.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={onClose}>
          <Text style={styles.ghostBtnText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  // ── Camera view ──────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <CameraView
        ref={cameraRef}
        facing={facing}
        style={StyleSheet.absoluteFill}
      />

      {/* Spotlight mask */}
      <SpotlightMask guideW={guideW} guideH={guideH} capW={capW} capH={capH} isOval={!isId} />

      {/* Corner brackets for ID mode */}
      {isId && <CornerBrackets guideW={guideW} guideH={guideH} />}

      {/* Top bar — close + instruction */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.instruction}>
          {isId
            ? "Fit your ID card inside the frame"
            : "Centre your face in the oval"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Sub-instruction below guide */}
      <View style={[styles.subHint, { top: (SH + capH) / 2 + 16 }]}>
        <Text style={styles.subHintText}>
          {isId
            ? "Hold steady — all four edges must be visible"
            : "Look directly at the camera"}
        </Text>
      </View>

      {/* Bottom capture area */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={[styles.captureBtn, capturing && styles.captureBtnActive]}
          onPress={capture}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color={T.primary} size="small" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  maskBar: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.60)",
  },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rw(16),
    paddingBottom: rw(12),
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  instruction: {
    color: "#fff",
    fontSize: rf(14),
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },

  // Sub hint below guide
  subHint: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: rw(32),
  },
  subHintText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: rf(13),
    textAlign: "center",
  },

  // Bottom capture
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtnActive: {
    borderColor: T.primary,
    backgroundColor: `${T.primary}33`,
  },
  captureInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
  },

  // Permission screen
  permCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: rw(12),
    padding: rw(32),
  },
  permTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: T.text,
    marginTop: 8,
  },
  permSub: {
    fontSize: rf(15),
    color: T.textSub,
    textAlign: "center",
    lineHeight: rf(22),
  },
  permBtn: {
    marginTop: 8,
    backgroundColor: T.ctaBg,
    paddingHorizontal: rw(32),
    paddingVertical: rw(14),
    borderRadius: 12,
  },
  permBtnText: {
    color: T.ctaText,
    fontSize: rf(16),
    fontWeight: "700",
  },
  ghostBtn: { paddingVertical: 8 },
  ghostBtnText: { fontSize: rf(15), color: T.textMuted },
});
