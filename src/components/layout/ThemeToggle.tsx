"use client";

import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyTheme,
  getAppliedTheme,
  resolveTheme,
  subscribeTheme,
  themeInitScript,
  type Theme,
} from "@/components/layout/theme";

/**
 * Server render emits an executable script so the browser applies the theme
 * while parsing <head>. The client render uses text/plain so React does not
 * try to execute the script again during hydration.
 */
export function ThemeInitScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  );
}

/** Re-applies the theme after dev Strict Mode resets <html> to its JSX classes. */
export function ThemeSync() {
  useLayoutEffect(() => {
    applyTheme(resolveTheme());
  }, []);
  return null;
}

export function ThemeToggle({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const sync = () => setTheme(getAppliedTheme());
    const unsubscribe = subscribeTheme(sync);
    applyTheme(resolveTheme());
    return unsubscribe;
  }, []);

  function toggle() {
    applyTheme(getAppliedTheme() === "dark" ? "light" : "dark");
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={[
        "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-mainButton text-mainText shadow-sm transition hover:border-mainButton/40 hover:bg-mainButtonHover hover:text-mainText",
        className,
      ].join(" ")}
    >
      {isDark ? (
        <Sun className="size-4 text-mainText" aria-hidden="true" />
      ) : (
        <Moon className="size-4 text-mainText" aria-hidden="true" />
      )}
    </button>
  );
}
