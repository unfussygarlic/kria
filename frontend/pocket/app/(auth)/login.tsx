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
import { useAuthStore } from "@/stores/authStore";
import { T } from "@/constants/colors";
import { rf, rw, SCREEN } from "@/constants/responsive";

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
        {/* ── Gradient Hero ─────────────────────────────────────────────── */}
        <LinearGradient
          colors={T.gradBrand}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.logo}>Kria</Text>
          <Text style={styles.tagline}>Event gigs for students</Text>
        </LinearGradient>

        {/* ── Form Card ─────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>Enter your phone number to get started</Text>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="9876543210"
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
              colors={T.gradBrand}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.button}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Sending..." : "Get OTP"}
              </Text>
            </LinearGradient>
          </Pressable>

          <Text style={styles.footer}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const HERO_HEIGHT = SCREEN.height * 0.38;

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
  // ── Hero
  hero: {
    height: HERO_HEIGHT,
    justifyContent: "flex-end",
    paddingHorizontal: rw(28),
    paddingBottom: rw(36),
  },
  logo: {
    fontSize: rf(52),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: "#000",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: rf(15),
    color: "rgba(0,0,0,0.65)",
    marginTop: 4,
    fontWeight: "500",
    fontFamily: "SpaceGrotesk_500Medium",
  },
  // ── Card
  card: {
    flex: 1,
    backgroundColor: T.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: rw(24),
    paddingTop: rw(32),
    paddingBottom: rw(32),
  },
  cardTitle: {
    fontSize: rf(26),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    color: T.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: rf(14),
    fontFamily: "SpaceGrotesk_400Regular",
    color: T.textSub,
    marginBottom: rw(28),
  },
  label: {
    fontSize: rf(13),
    fontWeight: "600",
    fontFamily: "SpaceGrotesk_600SemiBold",
    color: T.textSub,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.bg,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: rw(16),
    height: rw(56),
  },
  countryCode: {
    fontSize: rf(17),
    color: T.text,
    marginRight: 8,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    fontSize: rf(17),
    color: T.text,
  },
  error: {
    color: T.error,
    fontSize: rf(13),
    marginTop: 8,
  },
  buttonWrapper: {
    marginTop: rw(24),
    borderRadius: 14,
    overflow: "hidden",
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
    color: T.textInverse,
    fontSize: rf(17),
    fontWeight: "700",
    fontFamily: "SpaceGrotesk_700Bold",
    letterSpacing: 0.3,
  },
  footer: {
    fontSize: rf(12),
    color: T.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginTop: rw(24),
  },
});
