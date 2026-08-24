/**
 * Verify — OTP entry step. Six boxes fed by an off-screen hidden input.
 *
 * Redesigned 2026-08-23: SHADOW-based boxes (no borders), TYPE tokens, S/R
 * spacing. Filled state uses primary tint; active state uses selection bg.
 */

import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const insets = useSafeAreaInsets();
  const [otpValue, setOtpValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const hiddenInputRef = useRef<TextInput>(null);

  const cursorOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    );
    blink.start();
    return () => blink.stop();
  }, []);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const handleOtpChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, "").slice(0, OTP_LENGTH);
    setOtpValue(digits);
    setError("");
    if (digits.length === OTP_LENGTH) {
      handleVerify(digits);
    }
  };

  const handleVerify = async (code: string) => {
    if (!phone) return;
    setIsLoading(true);
    setError("");
    const result = await verifyOtp(phone, code);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      setOtpValue("");
      hiddenInputRef.current?.focus();
    } else {
      router.replace("/");
    }
  };

  const handleResend = async () => {
    if (!phone || resendTimer > 0) return;
    setResendTimer(30);
    setOtpValue("");
    await sendOtp(phone);
  };

  const activeIndex = Math.min(otpValue.length, OTP_LENGTH - 1);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.content, { paddingTop: insets.top + S.lg }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={rw(20)} color={T.text} />
          <Text style={styles.backButtonText}>Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>Verify phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={styles.phone}>{phone}</Text>
          </Text>
        </View>

        <Pressable style={styles.otpContainer} onPress={() => hiddenInputRef.current?.focus()}>
          {Array(OTP_LENGTH).fill(0).map((_, i) => {
            const digit = otpValue[i] ?? "";
            const isActive = isFocused && i === activeIndex && otpValue.length < OTP_LENGTH;
            const isFilled = i < otpValue.length;
            return (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  isFilled && styles.otpBoxFilled,
                  isActive && styles.otpBoxActive,
                  !!error && styles.otpBoxError,
                ]}
              >
                {digit ? (
                  <Text style={styles.otpDigit}>{digit}</Text>
                ) : isActive ? (
                  <Animated.View style={[styles.cursor, { opacity: cursorOpacity }]} />
                ) : null}
              </View>
            );
          })}
        </Pressable>

        <TextInput
          ref={hiddenInputRef}
          value={otpValue}
          onChangeText={handleOtpChange}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          caretHidden
          autoFocus
          autoComplete="off"
          importantForAutofill="no"
          textContentType="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.resendContainer}>
          {resendTimer > 0 ? (
            <Text style={styles.resendTimer}>Resend code in {resendTimer}s</Text>
          ) : (
            <Pressable onPress={handleResend}>
              <Text style={styles.resendButton}>Resend Code</Text>
            </Pressable>
          )}
        </View>

        {isLoading && <Text style={styles.loadingText}>Verifying...</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: S.xl,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: S.xl,
  },
  backButtonText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },
  header: {
    marginBottom: S.hero,
    gap: S.xs,
  },
  title: {
    ...TYPE.title1,
    color: T.text,
  },
  subtitle: {
    ...TYPE.bodyLg,
    color: T.textSub,
  },
  phone: {
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: S.md,
    gap: S.xs,
  },
  otpBox: {
    flex: 1,
    height: rw(60),
    backgroundColor: T.surface1,
    borderRadius: R.input,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },
  otpBoxActive: {
    backgroundColor: T.selBg,
  },
  otpBoxFilled: {
    backgroundColor: T.primary + "18",
  },
  otpBoxError: {
    backgroundColor: T.error + "18",
  },
  otpDigit: {
    ...TYPE.title1,
    fontSize: 22,
    lineHeight: 28,
    color: T.text,
  },
  cursor: {
    width: 2,
    height: rw(24),
    backgroundColor: T.text,
    borderRadius: 1,
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    left: -1000,
    top: -1000,
  },
  error: {
    color: T.error,
    ...TYPE.body,
    textAlign: "center",
    marginBottom: S.md,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: S.xl,
  },
  resendTimer: {
    ...TYPE.body,
    color: T.textMuted,
  },
  resendButton: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.primary,
  },
  loadingText: {
    ...TYPE.bodyLg,
    color: T.primary,
    textAlign: "center",
    marginTop: S.xl,
  },
});
