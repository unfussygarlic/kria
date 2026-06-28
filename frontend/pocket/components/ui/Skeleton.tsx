import { useRef, useEffect } from "react";
import { Animated, ViewStyle } from "react-native";
import { T } from "@/constants/colors";

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    ).start();
    return () => opacity.stopAnimation();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { backgroundColor: T.surface3, borderRadius, width, height, opacity },
        style,
      ]}
    />
  );
}
