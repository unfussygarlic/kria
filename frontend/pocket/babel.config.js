module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      "babel-preset-expo",
      // Temporarily disabled to test if NativeWind breaks Animated:
      // ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      // "nativewind/babel",
    ],
  };
};
