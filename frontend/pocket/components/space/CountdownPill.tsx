/**
 * CountdownPill — live "Starts in Xh Ym" chip.
 *
 * Refreshes on a 30-second interval while mounted so it stays accurate
 * without a per-second re-render (that would waste battery). Colour shifts
 * as the shift approaches — lime for >6h out, amber for <6h, coral for
 * <1h, mid-live shows a pulsing "Live now" state.
 *
 * Renders nothing when there's no event_date or the shift already ended.
 */
import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { countdownLabel, shiftStartTs, isLive } from "@/lib/shiftTime";

interface Props {
  eventDate: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
  compact?: boolean;   // smaller variant for use inside list cards
}

export function CountdownPill({ eventDate, shiftStart, shiftEnd, compact }: Props) {
  const [tick, setTick] = useState(0);
  const pulse = useRef(new Animated.Value(1)).current;

  // Re-render every 30s so the label stays fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const label = countdownLabel(eventDate, shiftStart, shiftEnd);
  const live = isLive(eventDate, shiftStart, shiftEnd);

  // Pulse the "Live now" pill so it reads as active, not just a colour.
  useEffect(() => {
    if (!live) {
      pulse.stopAnimation();
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);

  if (!label || label === "Ended") return null;

  const startTs = shiftStartTs(eventDate, shiftStart);
  const now = Date.now() + tick * 0; // tick just forces re-render; startTs is authoritative
  const diffMs = startTs !== null ? startTs - now : 0;
  const withinHour = !live && diffMs > 0 && diffMs <= 60 * 60 * 1000;
  const within6h = !live && diffMs > 0 && diffMs <= 6 * 60 * 60 * 1000;

  const bg = live
    ? "rgba(255,83,49,0.20)"
    : withinHour
    ? "rgba(255,83,49,0.14)"
    : within6h
    ? "rgba(255,199,61,0.14)"
    : "rgba(212,255,0,0.12)";
  const fg = live ? "#ff5331" : withinHour ? "#ff7351" : within6h ? "#FFC83D" : T.primary;
  const border = live
    ? "rgba(255,83,49,0.45)"
    : withinHour
    ? "rgba(255,83,49,0.35)"
    : within6h
    ? "rgba(255,199,61,0.35)"
    : "rgba(212,255,0,0.30)";
  const iconName = live ? "radio" : "clock";

  const chip = (
    <View
      style={[
        compact ? styles.pillCompact : styles.pill,
        { backgroundColor: bg, borderColor: border },
      ]}
    >
      <Feather name={iconName as never} size={compact ? rw(11) : rw(13)} color={fg} />
      <Text
        style={[
          compact ? styles.textCompact : styles.text,
          { color: fg },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  return live ? <Animated.View style={{ opacity: pulse }}>{chip}</Animated.View> : chip;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(6),
    paddingHorizontal: rw(12),
    paddingVertical: rw(6),
    borderRadius: rw(999),
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  pillCompact: {
    flexDirection: "row",
    alignItems: "center",
    gap: rw(4),
    paddingHorizontal: rw(8),
    paddingVertical: rw(3),
    borderRadius: rw(999),
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: rf(12),
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: rf(10),
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
