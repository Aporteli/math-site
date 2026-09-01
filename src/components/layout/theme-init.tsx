"use client";

import { useEffect } from "react";

const STORAGE_KEY = "theme";

/**
 * Applies the persisted (or system) theme on mount. Kept as a tiny client
 * component instead of an inline <script> so React never renders a <script>
 * element (which triggers a React 19 dev warning and is not re-executed).
 */
export function ThemeInit() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const dark = stored
        ? stored === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", dark);
    } catch {
      // Ignore storage errors (private mode, disabled cookies).
    }
  }, []);

  return null;
}
