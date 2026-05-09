import { Dimensions, PixelRatio } from "react-native";

const { width: W, height: H } = Dimensions.get("window");

/** Design baseline: iPhone 14 Pro (390 × 844 logical px) */
const BASE = 390;

/**
 * Scale a layout value (spacing, icon size, border radius, etc.)
 * proportionally to the device's screen width.
 *
 * Example: rw(16) → 16 on a 390-wide device, ~14.8 on a 360-wide device.
 */
export const rw = (px: number): number =>
  Math.round((px / BASE) * W);

/**
 * Scale a font size to the device width, capped at 125% of the
 * original value so text never becomes absurdly large on tablets.
 */
export const rf = (size: number): number => {
  const scaled = (size / BASE) * W;
  const capped = Math.min(scaled, size * 1.25);
  return Math.round(PixelRatio.roundToNearestPixel(capped));
};

export const SCREEN = { width: W, height: H } as const;

/** True for SE-size phones (< 375 logical px wide) */
export const isSmall = W < 375;

/** True for tablets (≥ 768 logical px wide) */
export const isTablet = W >= 768;
