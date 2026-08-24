"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "kria-grid-theme";

export function ThemeToggle() {
  // Default LIGHT (matches Pocket). Users flip to dark via this toggle.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const dark = saved ? saved === "dark" : false;
    setIsDark(dark);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    const theme = next ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  };

  return (
    <button
      onClick={toggle}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="nav-item flex items-center gap-3 px-6 py-4 w-full text-xs font-bold uppercase tracking-wider"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {isDark ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
