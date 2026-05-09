# Mobile App — Animation Patterns

## Critical: NativeWind Breaks Animated API

`jsxImportSource: "nativewind"` in `babel.config.js` overrides JSX element creation, which breaks `Animated.View` on iOS/Expo Go. The Animated system updates values internally but **visual rendering is completely frozen**.

**Fix:** NativeWind presets are commented out in `babel.config.js`:
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      // DISABLED: NativeWind breaks Animated API on iOS
      // ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // "nativewind/babel",
    ],
  };
};
```
**Never re-enable these NativeWind presets.**

## useNativeDriver Rules

| Use `true` | Use `false` |
|------------|-------------|
| `transform` (translate, rotate, scale) | `Animated.event` with PanResponder |
| `opacity` | Layout properties (width, height, left, top) |
| `Animated.spring` / `Animated.timing` for transforms | Real-time gesture tracking |

## SwipeableJobCard — Animation Types

### Setup
```typescript
const position = useRef(new Animated.ValueXY()).current;

const rotate = position.x.interpolate({
  inputRange: [-W * 0.5, 0, W * 0.5],
  outputRange: ["-8deg", "0deg", "8deg"],
  extrapolate: "clamp",
});
```

### Snap Back (return to center)
```typescript
Animated.spring(position, {
  toValue: { x: 0, y: 0 },
  useNativeDriver: true,
  friction: 8,
  tension: 90,
}).start();
```

### Apply Bounce (swipe up → apply → spring back)
```typescript
Animated.sequence([
  Animated.timing(position.y, { toValue: -H * 0.6, duration: 200, useNativeDriver: true }),
  Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true, friction: 8, tension: 80 }),
]).start(({ finished }) => {
  if (finished) {
    position.setValue({ x: 0, y: 0 });
    done(); // trigger onApply callback
  }
});
```

### Slide Off (left/right navigation)
```typescript
Animated.parallel([
  Animated.timing(position.x, { toValue: W * 1.2, duration: 220, useNativeDriver: true }),
  Animated.timing(position.y, { toValue: 0, duration: 220, useNativeDriver: true }),
]).start(({ finished }) => {
  if (finished) {
    position.setValue({ x: 0, y: 0 }); // Critical: reset for next card
    done();
  }
});
```

## PanResponder Pattern

```typescript
PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponder: () => true,
  onMoveShouldSetPanResponderCapture: () => true,
  onPanResponderTerminationRequest: () => false,

  onPanResponderGrant: () => {
    position.stopAnimation(); // Stop any running animation first
  },

  onPanResponderMove: Animated.event(
    [null, { dx: position.x, dy: position.y }],
    { useNativeDriver: false } // Must be false for gesture tracking
  ),

  onPanResponderRelease: (_, gs) => {
    const goingUp    = gs.dy < APPLY_THRESHOLD;
    const goingRight = gs.dx > NAV_THRESHOLD;
    const goingLeft  = gs.dx < -NAV_THRESHOLD;
    const fastVert   = gs.vy < -0.9;
    const fastRight  = gs.vx > 0.8;
    const fastLeft   = gs.vx < -0.8;
    const mostlyVertical = Math.abs(gs.dy) > Math.abs(gs.dx) * 1.2;

    // Priority: Apply > Navigate > Snap back
    if ((goingUp || fastVert) && mostlyVertical) {
      applyBounce(onApply);
    } else if ((goingRight || fastRight) && canGoNext) {
      slideOff("right", onNext);
    } else if ((goingLeft || fastLeft) && canGoPrev) {
      slideOff("left", onPrev);
    } else {
      snapBack();
    }
  },

  onPanResponderTerminate: () => snapBack(),
})
```

## Animated.View Setup

```typescript
<Animated.View
  collapsable={false}  // Prevents React Native from collapsing the view (breaks touch)
  style={{ transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }}
  {...pan.panHandlers}
>
  <JobCard gig={gig} pointerEvents="none" /> {/* Child must not capture touches */}
</Animated.View>
```

## Haptic Feedback

```typescript
import * as Haptics from "expo-haptics";
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);   // navigation
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);  // apply/confirm
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

## Common Pitfalls

1. **Always call `position.stopAnimation()` in `onPanResponderGrant`** — new gesture fights running animation otherwise
2. **Always `position.setValue({ x: 0, y: 0 })` after slide-off** — next card starts from wrong position otherwise
3. **Never use layout properties** (`left`, `top`) with `useNativeDriver: true` — use `transform` instead
4. **`collapsable={false}`** on Animated.View — prevents RN from optimizing away touch area
