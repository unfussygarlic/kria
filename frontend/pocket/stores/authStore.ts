import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";
import { Session } from "@supabase/supabase-js";

// Development-only helpers
// We use a fake email derived from the phone so Supabase email+password auth
// can be used without sending real SMS. GOTRUE_MAILER_AUTOCONFIRM=true handles
// confirmation automatically.
const DEV_PASSWORD = "kria-dev-2026";
function devEmail(phone: string) {
  // Strip all non-digits so +91-8148095499 and 918148095499 map to the same email
  return `${phone.replace(/\D/g, "")}@kria.dev`;
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  activeRole: "runner" | "host" | null;

  // Actions
  initialize: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<boolean>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  setOnboarded: (value: boolean) => void;
  setActiveRole: (role: "runner" | "host") => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  isLoading: true,
  isOnboarded: false,
  activeRole: null,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({ session });

      if (session) {
        const ok = await get().fetchProfile();
        if (!ok) {
          // Stored session is stale (e.g. DB was reset, JWT secret changed).
          // Sign out so the user starts from a clean login screen.
          await supabase.auth.signOut();
          set({ session: null, profile: null, isOnboarded: false });
        }
      }
    } catch (error) {
      console.error("Auth init error:", error);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth changes triggered by sign-in / sign-out
    supabase.auth.onAuthStateChange(async (event, session) => {
      set({ session });
      if (session) {
        await get().fetchProfile();
      } else {
        set({ profile: null, isOnboarded: false, activeRole: null });
      }
    });
  },

  sendOtp: async (phone: string) => {
    const isDev = process.env.EXPO_PUBLIC_APP_ENV === "development";

    if (isDev) {
      console.log(`[DEV] Mock OTP for ${phone}. Use "123456" to verify.`);
      return { error: null };
    }

    // Production: real Supabase phone OTP
    const { error } = await supabase.auth.signInWithOtp({ phone });
    return { error: error?.message ?? null };
  },

  verifyOtp: async (phone: string, token: string) => {
    const isDev = process.env.EXPO_PUBLIC_APP_ENV === "development";

    if (isDev) {
      if (token !== "123456") {
        return { error: "Invalid OTP. Use 123456 for development." };
      }

      const email = devEmail(phone);

      // Try sign-in first — works for returning users
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: DEV_PASSWORD,
      });

      if (!signInError) return { error: null };

      // First time: create the account (GOTRUE_MAILER_AUTOCONFIRM=true confirms immediately)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: DEV_PASSWORD,
        options: { data: { phone } },
      });

      if (signUpError) {
        console.error("[DEV] Auth error:", signUpError);
        return { error: signUpError.message };
      }

      // GoTrue may not return a session on signUp even with autoconfirm —
      // sign in explicitly to guarantee a session before we navigate.
      if (!signUpData.session) {
        const { error: signInAfterSignUpError } = await supabase.auth.signInWithPassword({
          email,
          password: DEV_PASSWORD,
        });
        if (signInAfterSignUpError) {
          console.error("[DEV] Sign-in after signup failed:", signInAfterSignUpError);
          return { error: signInAfterSignUpError.message };
        }
      }

      return { error: null };
    }

    // Production: real OTP verification
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    return { error: error?.message ?? null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, isOnboarded: false, activeRole: null });
  },

  setActiveRole: (role) => {
    set({ activeRole: role });
  },

  fetchProfile: async () => {
    const { session } = get();
    if (!session) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No profile row yet — new user who hasn't completed onboarding.
        // Session is valid; don't sign out, just send them to onboarding.
        set({ profile: null, isOnboarded: false });
        return true;
      }
      console.error("Fetch profile error:", error);
      return false;
    }

    const isOnboarded = !!(data.first_name && data.date_of_birth && data.gender && data.city && data.state);
    set({ profile: data, isOnboarded });
    return true;
  },

  updateProfile: async (updates) => {
    const { session } = get();
    if (!session) return { error: "Not authenticated" };

    // Use upsert so onboarding works even if the DB trigger failed to create
    // the profile row (e.g. permission issue or wallet conflict).
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        { id: session.user.id, phone: get().profile?.phone ?? null, display_name: "New User", default_role: "runner", ...updates },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    if (data) {
      const isOnboarded = !!(data.first_name && data.date_of_birth && data.gender && data.city && data.state);
      set({ profile: data as Profile, isOnboarded });
    } else {
      await get().fetchProfile();
    }

    return { error: null };
  },

  setOnboarded: (value: boolean) => {
    set({ isOnboarded: value });
  },
}));
