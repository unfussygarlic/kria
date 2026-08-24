/**
 * HostAvatarChip — floating overlay on the swipe card that puts a face on
 * the gig poster. Shows avatar (or initial), verified check, and star rating
 * (if the host has one). Renders nothing when no host summary is available.
 */

import { View, Text, StyleSheet, Image } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { HostSummary } from "@/lib/api/gigs";
import { T } from "@/constants/colors";

interface Props {
  host: HostSummary;
}

export function HostAvatarChip({ host }: Props) {
  const initial = (host.display_name?.[0] ?? "?").toUpperCase();
  const rating = host.poster_reputation;
  const showRating = rating != null && rating > 0;

  return (
    <View style={styles.chip}>
      <View style={styles.avatarWrap}>
        {host.avatar_url ? (
          <Image source={{ uri: host.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        )}
        {host.is_verified && (
          <View style={styles.verifiedDot}>
            <Feather name="check" size={9} color="#fff" />
          </View>
        )}
      </View>
      {showRating && (
        <View style={styles.ratingBlock}>
          <Feather name="star" size={11} color={T.tertiary} />
          <Text style={styles.ratingText}>{rating!.toFixed(1)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 3,
    paddingRight: 10,
    paddingVertical: 3,
    borderRadius: 24,
    backgroundColor: "rgba(19,19,19,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  avatarWrap: {
    width: 32,
    height: 32,
    position: "relative",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surface3,
  },
  avatarFallback: {
    backgroundColor: T.avatarBg,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: T.avatarText,
  },
  verifiedDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#1DA1F2", // Twitter blue — universally read as "verified"
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#131313",
  },
  ratingBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: T.text,
  },
});
