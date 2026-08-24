/**
 * Login — phone-number step of the OTP flow.
 *
 * Redesigned 2026-08-23: gradient hero at top, form card lifted with SHADOW,
 * TYPE tokens throughout, trust chips on a soft primary tint (no borders).
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw, SCREEN } from "@/constants/responsive";
import Logo from "@/assets/logo.svg";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const sendOtp = useAuthStore((s) => s.sendOtp);

  const handleSendOtp = async () => {
    if (phone.length < 10) {
      setError("Enter a valid phone number");
      return;
    }
    setIsLoading(true);
    setError("");
    const fullPhone = phone.startsWith("+") ? phone : `+91${phone}`;
    const result = await sendOtp(fullPhone);
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push({ pathname: "/(auth)/verify", params: { phone: fullPhone } });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <LinearGradient
          colors={T.gradAccent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Logo width={rw(64)} height={rw(64)} />
          <Text style={styles.tagline}>Event gigs for students</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Enter your phone number to get started</Text>

          <Text style={styles.label}>PHONE NUMBER</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="98XXXX1234"
              placeholderTextColor={T.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(text) => {
                setPhone(text.replace(/[^0-9]/g, ""));
                setError("");
              }}
              maxLength={10}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.buttonWrapper, isLoading && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            <LinearGradient
              colors={T.gradAccent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Sending..." : "Get OTP"}
              </Text>
            </LinearGradient>
          </Pressable>

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Feather name="shield" size={rw(13)} color={T.primary} />
              <Text style={styles.trustText}>Secure OTP</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Feather name="user-check" size={rw(13)} color={T.primary} />
              <Text style={styles.trustText}>Verified hosts</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Feather name="zap" size={rw(13)} color={T.primary} />
              <Text style={styles.trustText}>Paid weekly</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const HERO_HEIGHT = SCREEN.height * 0.36;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    minHeight: SCREEN.height,
  },

  hero: {
    height: HERO_HEIGHT,
    justifyContent: "flex-end",
    paddingHorizontal: S.xl,
    paddingBottom: rw(48),
  },
  tagline: {
    ...TYPE.bodyLg,
    color: "rgba(255,255,255,0.9)",
    marginTop: S.xxs,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },

  card: {
    flex: 1,
    backgroundColor: T.surface1,
    borderTopLeftRadius: R.hero,
    borderTopRightRadius: R.hero,
    marginTop: -S.xl,
    paddingHorizontal: S.xl,
    paddingTop: S.xxl,
    paddingBottom: S.xxl,
    ...SHADOW.xl,
  },
  cardTitle: {
    ...TYPE.title1,
    color: T.text,
    marginBottom: S.xxs,
  },
  cardSubtitle: {
    ...TYPE.body,
    color: T.textSub,
    marginBottom: S.xl,
  },
  label: {
    ...TYPE.label,
    color: T.textSub,
    marginBottom: S.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.surface2,
    borderRadius: R.input,
    paddingHorizontal: S.md,
    height: rw(56),
    ...SHADOW.sm,
  },
  countryCode: {
    ...TYPE.title3,
    color: T.text,
    marginRight: S.xs,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  input: {
    flex: 1,
    ...TYPE.title3,
    color: T.text,
  },
  error: {
    color: T.error,
    ...TYPE.body,
    marginTop: S.xs,
  },
  buttonWrapper: {
    marginTop: S.xl,
    borderRadius: R.button,
    overflow: "hidden",
    ...SHADOW.md,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  button: {
    height: rw(56),
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    ...TYPE.title3,
    letterSpacing: 0.3,
  },
  footer: {
    ...TYPE.caption,
    color: T.textMuted,
    textAlign: "center",
    marginTop: S.md,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.sm,
    marginTop: S.lg,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    backgroundColor: T.primary + "10",
    borderRadius: R.card,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustText: {
    ...TYPE.label,
    color: T.text,
  },
  trustDivider: {
    width: 1,
    height: rw(12),
    backgroundColor: T.surface2,
  },
});
