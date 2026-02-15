/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563EB",
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#2563EB",
          600: "#1D4ED8",
          700: "#1E40AF",
        },
        secondary: {
          DEFAULT: "#F97316",
          500: "#F97316",
          600: "#EA580C",
        },
        success: "#16A34A",
        warning: "#F59E0B",
        error: "#DC2626",
        background: "#FAFAFA",
        surface: "#FFFFFF",
        border: "#E5E5E5",
      },
    },
  },
  plugins: [],
};
