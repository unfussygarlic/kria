module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      // Temporarily disabled to test if NativeWind breaks Animated:
      // ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // "nativewind/babel",
    ],
    // Reanimated v4 requires react-native-worklets/plugin. MUST be last.
    // NativeWind depends on Reanimated at runtime via react-native-css-interop,
    // so every screen touches it — without this the release build crashes
    // before the splash even shows.
    plugins: ["react-native-worklets/plugin"],
  };
};
