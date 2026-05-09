/**
 * VerifiedBadges — reusable badge system for Kria profiles.
 *
 * Add new badge types here as the platform grows:
 *   - ID verification badges (aadhaar, pan, passport, etc.)
 *   - Achievement badges (top_runner, early_adopter, etc.)
 *   - Skill-cert badges in the future
 *
 * Usage:
 *   <BadgeList earnedKeys={profile.verified_id_types} />
 *   <SingleBadge badgeKey="photo_verified" />
 */

import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";

// ── Badge definitions ──────────────────────────────────────────────────────────

export type BadgeKey =
  // ID verification
  | "aadhaar"
  | "pan"
  | "driving_licence"
  | "passport"
  | "voter_id"
  // Meta badge — earned when ANY photo ID is verified
  | "photo_verified";
  // Future: | "top_runner" | "early_adopter" | "skill_certified"

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

interface BadgeDef {
  label: string;
  icon: FeatherIconName;
  color: string;       // badge text + icon color
  bg: string;          // badge background tint
}

export const BADGE_DEFS: Record<BadgeKey, BadgeDef> = {
  photo_verified: {
    label: "Photo Verified",
    icon:  "shield",
    color: T.primary,
    bg:    `${T.primary}22`,
  },
  aadhaar: {
    label: "Aadhaar",
    icon:  "credit-card",
    color: "#60a5fa",
    bg:    "#1d4ed822",
  },
  pan: {
    label: "PAN Card",
    icon:  "file-text",
    color: "#fb923c",
    bg:    "#c2410c22",
  },
  driving_licence: {
    label: "Driving Licence",
    icon:  "navigation",
    color: "#4ade80",
    bg:    "#16a34a22",
  },
  passport: {
    label: "Passport",
    icon:  "globe",
    color: "#34d399",
    bg:    "#06b6d422",
  },
  voter_id: {
    label: "Voter ID",
    icon:  "check-square",
    color: "#a78bfa",
    bg:    "#7c3aed22",
  },
};

// ── Components ────────────────────────────────────────────────────────────────

interface SingleBadgeProps {
  badgeKey: BadgeKey;
  size?: "sm" | "md";
}

export function SingleBadge({ badgeKey, size = "md" }: SingleBadgeProps) {
  const def = BADGE_DEFS[badgeKey];
  if (!def) return null;
  const sm = size === "sm";

  return (
    <View style={[
      styles.badge,
      { backgroundColor: def.bg },
      sm && styles.badgeSm,
    ]}>
      <Feather
        name={def.icon}
        size={sm ? 10 : 12}
        color={def.color}
      />
      <Text style={[styles.badgeText, { color: def.color }, sm && styles.badgeTextSm]}>
        {def.label}
      </Text>
    </View>
  );
}

interface BadgeListProps {
  /** Array of badge keys the user has earned — typically profile.verified_id_types */
  earnedKeys: string[];
  /** If true, also show the photo_verified meta-badge when any ID is verified */
  showPhotoVerified?: boolean;
  size?: "sm" | "md";
}

export function BadgeList({ earnedKeys, showPhotoVerified = true, size = "md" }: BadgeListProps) {
  const keys = earnedKeys.filter((k): k is BadgeKey => k in BADGE_DEFS);

  if (keys.length === 0) return null;

  const hasPhoto = showPhotoVerified && keys.length > 0;

  return (
    <View style={styles.row}>
      {hasPhoto && <SingleBadge badgeKey="photo_verified" size={size} />}
      {keys.map((k) => (
        <SingleBadge key={k} badgeKey={k} size={size} />
      ))}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(6),
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(10),
    paddingVertical: rw(4),
    borderRadius: 20,
  },
  badgeSm: {
    paddingHorizontal: rw(7),
    paddingVertical: rw(3),
  },
  badgeText: {
    fontSize: rf(12),
    fontWeight: "600",
  },
  badgeTextSm: {
    fontSize: rf(10),
  },
});
