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
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otpValue, setOtpValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);

  const verifyOtp = useAuthStore((s) => s.verifyOtp);
  const sendOtp = useAuthStore((s) => s.sendOtp);
  const hiddenInputRef = useRef<TextInput>(null);

  // Blinking cursor animation for the active box
  const cursorOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, []);

  // Resend timer countdown
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

  // The active box is the one at the current cursor position
  const activeIndex = Math.min(otpValue.length, OTP_LENGTH - 1);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Verify Phone</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{"\n"}
            <Text style={styles.phone}>{phone}</Text>
          </Text>
        </View>

        {/* OTP boxes — tap any to focus the hidden input */}
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

        {/* Hidden input that actually receives keyboard events */}
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
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Resend */}
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
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    marginBottom: 32,
  },
  backButtonText: {
    fontSize: 16,
    color: T.primary,
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: T.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: T.textSub,
    lineHeight: 24,
  },
  phone: {
    fontWeight: "600",
    color: T.text,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxActive: {
    borderColor: T.selBorder,
    borderWidth: 2,
    backgroundColor: T.selBg,
  },
  otpBoxFilled: {
    borderColor: T.primary,
    backgroundColor: T.surface,
  },
  otpBoxError: {
    borderColor: T.error,
    backgroundColor: "#FEF2F2",
  },
  otpDigit: {
    fontSize: 24,
    fontWeight: "bold",
    color: T.text,
  },
  cursor: {
    width: 2,
    height: 24,
    backgroundColor: T.selText,
    borderRadius: 1,
  },
  // Invisible — positioned off-screen so the keyboard never overlaps the UI
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    top: -100,
  },
  error: {
    color: T.error,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  resendContainer: {
    alignItems: "center",
    marginTop: 24,
  },
  resendTimer: {
    fontSize: 14,
    color: T.textMuted,
  },
  resendButton: {
    fontSize: 14,
    color: T.primary,
    fontWeight: "600",
  },
  loadingText: {
    fontSize: 16,
    color: T.primary,
    textAlign: "center",
    marginTop: 24,
  },
});
