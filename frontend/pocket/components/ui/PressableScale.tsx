import { useRef, useCallback } from "react";
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";

interface PressableScaleProps extends Omit<PressableProps, "style"> {
  scale?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PressableScale({
  scale = 0.95,
  children,
  style,
  onPressIn,
  onPressOut,
  ...props
}: PressableScaleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback((e: any) => {
    Animated.spring(scaleAnim, {
      toValue: scale,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
    onPressIn?.(e);
  }, [scale, onPressIn]);

  const handlePressOut = useCallback((e: any) => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 35,
      bounciness: 5,
    }).start();
    onPressOut?.(e);
  }, [onPressOut]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable style={style} onPressIn={handlePressIn} onPressOut={handlePressOut} {...props}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
