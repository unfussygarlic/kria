/**
 * Profile — the runner's page. Primary tab (2026-08-24 nav revamp).
 *
 * Redesigned 2026-08-24 for airier hierarchy — a personal identity block
 * on top (avatar + name), one focal card (Momentum), a chip trust strip,
 * a circular quick-action row (Instagram-style), then a menu list. Momentum
 * tap opens Arena; verification / settings routed from the menu.
 * Wallet was removed from the menu 2026-08-24 — not yet shipped.
 *
 * Design principles (from mobile-profile UX 2026 research):
 *   - One dominant piece of information per section
 *   - Whitespace over borders
 *   - Circular action buttons > cramped tile grids for a small action set
 *   - Bio / meta lines kept to a single short row
 */

import { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, Share,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuthStore } from "@/stores/authStore";
import { useMomentumStore } from "@/stores/momentumStore";
import { useBadgeStore } from "@/stores/badgeStore";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { getBand } from "@/constants/momentum";
import { rw } from "@/constants/responsive";
import { calculateCompletion } from "@/lib/profileCompletion";
import { scrollRegistry } from "@/lib/scrollRegistry";
import { PressableScale } from "@/components/ui/PressableScale";

// ── Circular quick-action button ──────────────────────────────────────────────

function CircleAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <PressableScale onPress={onPress} style={styles.circleWrap}>
      <View style={[styles.circle, { backgroundColor: tint + "18" }]}>
        <Feather name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.circleLabel} numberOfLines={1}>{label}</Text>
    </PressableScale>
  );
}

// ── Chip in trust strip ───────────────────────────────────────────────────────

function TrustChip({
  icon,
  emoji,
  text,
  color,
}: {
  icon?: React.ComponentProps<typeof Feather>["name"];
  emoji?: string;
  text: string;
  color: string;
}) {
  return (
    <View style={[styles.trustChip, { backgroundColor: color + "16" }]}>
      {emoji ? (
        <Text style={{ fontSize: 13 }}>{emoji}</Text>
      ) : icon ? (
        <Feather name={icon} size={12} color={color} />
      ) : null}
      <Text style={[styles.trustChipText, { color }]}>{text}</Text>
    </View>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  hint,
  onPress,
  tone,
  right,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  hint?: string;
  onPress: () => void;
  tone?: "danger";
  right?: React.ReactNode;
}) {
  const color = tone === "danger" ? T.error : T.text;
  return (
    <Pressable style={styles.menuRow} onPress={onPress}>
      <View
        style={[
          styles.menuIcon,
          { backgroundColor: tone === "danger" ? T.error + "18" : T.surface2 },
        ]}
      >
        <Feather name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.menuLabel, { color }]}>{label}</Text>
        {hint && <Text style={styles.menuHint}>{hint}</Text>}
      </View>
      {right ?? <Feather name="chevron-right" size={18} color={T.textMuted} />}
    </Pressable>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { myMomentum, fetchMyMomentum } = useMomentumStore();
  const { earnedCount, totalCount, fetchBadges } = useBadgeStore();

  useEffect(() => {
    fetchMyMomentum();
    fetchBadges();
    scrollRegistry.register("profile", () =>
      scrollRef.current?.scrollTo({ y: 0, animated: true }),
    );
    return () => { scrollRegistry.unregister("profile"); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const handleShareProfile = async () => {
    if (!profile) return;
    const slug = profile.public_slug ?? profile.id;
    const url = `https://trykria.com/p/${slug}`;
    const name = profile.first_name || profile.display_name || "This runner";
    await Share.share({
      message: `${name} on Kria — verified gig worker. See their profile: ${url}`,
      url,
    });
  };

  const displayName = profile
    ? profile.first_name && profile.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile.display_name
    : "";

  const avatarLetter =
    (profile?.first_name?.charAt(0) || profile?.display_name?.charAt(0) || "?").toUpperCase();

  const cityLine = [profile?.city, profile?.state].filter(Boolean).join(", ");
  const joinedLine = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : "";
  const subLine = [cityLine, joinedLine ? `Joined ${joinedLine}` : null]
    .filter(Boolean)
    .join(" · ");

  const momentumScore = myMomentum?.worker?.score ?? 0;
  const band = getBand(momentumScore);
  const bandPct = Math.min(100, Math.round((momentumScore / 1000) * 100));

  const verifiedIds: string[] = profile?.verified_id_types ?? [];
  const streak = profile?.streak_count ?? 0;
  const isVerified = verifiedIds.length > 0;

  const completion = profile ? calculateCompletion(profile) : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + S.sm, paddingBottom: S.hero },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <Text style={styles.eyebrow}>PROFILE</Text>
          <Pressable
            onPress={() => router.push("/(main)/settings")}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Feather name="settings" size={20} color={T.text} />
          </Pressable>
        </View>

        {/* ── Identity block ── */}
        <View style={styles.identity}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
            {isVerified && (
              <View style={styles.avatarCheck}>
                <Feather name="check" size={12} color={T.onGradAccent} />
              </View>
            )}
          </View>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          {subLine ? <Text style={styles.sub}>{subLine}</Text> : null}
        </View>

        {/* ── Circular quick actions ── */}
        <View style={styles.actionsRow}>
          <CircleAction
            icon="edit-2"
            label="Edit"
            tint={T.primary}
            onPress={() => router.push("/(main)/edit-profile")}
          />
          <CircleAction
            icon="star"
            label="Skills"
            tint="#a8f060"
            onPress={() => router.push("/(main)/edit-skills")}
          />
          <CircleAction
            icon="shield"
            label={isVerified ? "ID" : "Verify"}
            tint="#8097ff"
            onPress={() => router.push("/(main)/verify-identity")}
          />
          <CircleAction
            icon="share-2"
            label="Share"
            tint="#f472b6"
            onPress={handleShareProfile}
          />
        </View>

        {/* ── Momentum card — the one focal metric ── */}
        <Pressable onPress={() => router.push("/(main)/(tabs)/arena")}>
          <LinearGradient
            colors={T.gradAccent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.momentumCard}
          >
            <View style={styles.momentumHeader}>
              <View style={styles.bandChip}>
                <View style={[styles.bandDot, { backgroundColor: band.color }]} />
                <Text style={styles.bandText}>{band.label.toUpperCase()}</Text>
              </View>
              <View style={styles.momentumLink}>
                <Text style={styles.momentumLinkText}>Breakdown</Text>
                <Feather name="chevron-right" size={14} color={T.onGradAccent} />
              </View>
            </View>

            <View style={styles.momentumScoreRow}>
              <Text style={styles.momentumScore}>{momentumScore}</Text>
              <Text style={styles.momentumScoreDenom}>/ 1000</Text>
            </View>
            <Text style={styles.momentumCaption}>Momentum · your track record</Text>

            <View style={styles.bandTrack}>
              <View style={[styles.bandFill, { width: `${bandPct}%` as any }]} />
            </View>
          </LinearGradient>
        </Pressable>

        {/* ── Trust strip ── */}
        <View style={styles.trustStrip}>
          {isVerified ? (
            <TrustChip
              icon="shield"
              text={`Verified · ${verifiedIds.length} ID${verifiedIds.length > 1 ? "s" : ""}`}
              color="#8097ff"
            />
          ) : (
            <Pressable onPress={() => router.push("/(main)/verify-identity")}>
              <TrustChip icon="shield-off" text="Verify your ID" color={T.textMuted} />
            </Pressable>
          )}
          {streak > 0 && (
            <TrustChip emoji="🔥" text={`${streak}-day streak`} color="#FFC83D" />
          )}
          {totalCount > 0 && (
            <TrustChip
              icon="award"
              text={`${earnedCount}/${totalCount} badges`}
              color={T.primary}
            />
          )}
        </View>

        {/* ── Profile completion (only <100%) ── */}
        {completion && completion.percentage < 100 && (
          <Pressable
            style={styles.completionCard}
            onPress={() => router.push("/(main)/edit-profile")}
          >
            <View style={styles.completionRow}>
              <Text style={styles.completionTitle}>Complete your profile</Text>
              <Text style={styles.completionPct}>{completion.percentage}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${completion.percentage}%` as any }]}
              />
            </View>
            {completion.missing.length > 0 && (
              <Text style={styles.completionMissing} numberOfLines={2}>
                Missing: {completion.missing.slice(0, 3).join(", ")}
                {completion.missing.length > 3 ? ` +${completion.missing.length - 3} more` : ""}
              </Text>
            )}
          </Pressable>
        )}

        {/* ── Menu ── */}
        <View style={styles.menu}>
          <MenuRow
            icon="award"
            label="My badges"
            hint={`${earnedCount} of ${totalCount} earned`}
            onPress={() => router.push("/(main)/badges")}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="settings"
            label="Settings"
            hint="Theme, account, privacy"
            onPress={() => router.push("/(main)/settings")}
          />
        </View>

        {/* ── Sign out ── */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Feather name="log-out" size={18} color={T.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        <Text style={styles.version}>Kria v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  content: {
    paddingHorizontal: S.lg,
    gap: S.lg,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    ...TYPE.label,
    color: T.textMuted,
    letterSpacing: 1.6,
  },
  iconBtn: {
    width: rw(36),
    height: rw(36),
    borderRadius: R.thumb,
    backgroundColor: T.surface1,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOW.sm,
  },

  // Identity block
  identity: {
    alignItems: "center",
    gap: 4,
    paddingTop: S.xs,
  },
  avatarRing: {
    width: rw(96),
    height: rw(96),
    borderRadius: rw(48),
    padding: 3,
    backgroundColor: T.primary + "22",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: S.sm,
    position: "relative",
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: rw(48),
    backgroundColor: T.avatarBg,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    ...TYPE.display,
    fontSize: 38,
    color: T.avatarText,
  },
  avatarCheck: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: rw(24),
    height: rw(24),
    borderRadius: rw(12),
    backgroundColor: "#8097ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: T.bg,
  },
  name: {
    ...TYPE.title1,
    color: T.text,
    textAlign: "center",
  },
  sub: {
    ...TYPE.body,
    color: T.textMuted,
    textAlign: "center",
  },

  // Circular actions
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingHorizontal: S.xs,
  },
  circleWrap: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  circle: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(28),
    justifyContent: "center",
    alignItems: "center",
  },
  circleLabel: {
    ...TYPE.caption,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },

  // Momentum card
  momentumCard: {
    borderRadius: R.hero,
    padding: S.xl,
    gap: S.xs,
    ...SHADOW.lg,
  },
  momentumHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bandChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: S.sm,
    paddingVertical: 5,
    borderRadius: R.chip,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  bandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bandText: {
    ...TYPE.label,
    color: T.onGradAccent,
  },
  momentumLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  momentumLinkText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.onGradAccent,
  },
  momentumScoreRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: S.xs,
  },
  momentumScore: {
    ...TYPE.display,
    color: T.onGradAccent,
  },
  momentumScoreDenom: {
    ...TYPE.title3,
    color: T.onGradAccentMuted,
  },
  momentumCaption: {
    ...TYPE.body,
    color: T.onGradAccentSoft,
    marginTop: 2,
  },
  bandTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: S.sm,
  },
  bandFill: {
    height: "100%",
    backgroundColor: T.onGradAccent,
    borderRadius: 3,
  },

  // Trust strip
  trustStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: S.sm,
    paddingVertical: 6,
    borderRadius: R.chip,
  },
  trustChipText: {
    ...TYPE.caption,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
  },

  // Completion card
  completionCard: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    padding: S.md,
    gap: S.xs,
    ...SHADOW.card,
  },
  completionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  completionTitle: {
    ...TYPE.body,
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    color: T.text,
  },
  completionPct: {
    ...TYPE.title3,
    color: T.primary,
  },
  progressTrack: {
    height: 6,
    backgroundColor: T.surface2,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: T.primary,
    borderRadius: 3,
  },
  completionMissing: {
    ...TYPE.caption,
    color: T.textMuted,
  },

  // Menu list
  menu: {
    backgroundColor: T.surface1,
    borderRadius: R.card,
    overflow: "hidden",
    ...SHADOW.card,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    padding: S.md,
  },
  menuIcon: {
    width: rw(38),
    height: rw(38),
    borderRadius: R.thumb,
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
  },
  menuHint: {
    ...TYPE.caption,
    color: T.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: T.surface2,
    marginLeft: rw(66),
  },

  // Sign out
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs,
    paddingVertical: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.button,
    ...SHADOW.sm,
  },
  signOutText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.error,
  },

  version: {
    ...TYPE.caption,
    color: T.textMuted,
    textAlign: "center",
  },
});
