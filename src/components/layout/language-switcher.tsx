"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import {
  isLocale,
  localeCookie,
  localeNames,
  locales,
  type Locale,
} from "@/i18n/config";
import { setCookie } from "@/lib/helpers/cookies";

interface LanguageSwitcherProps {
  locale: Locale;
  label: string;
  className?: string;
  menuPlacement?: "below" | "above";
  menuAlign?: "right" | "center";
}

export function LanguageSwitcher({
  locale,
  label,
  className = "",
  menuPlacement = "below",
  menuAlign = "right",
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  /** Swaps the locale segment of the current path, keeping the user in place. */
  function hrefFor(target: Locale) {
    const segments = pathname.split("/");

    if (isLocale(segments[1])) {
      segments[1] = target;
    } else {
      segments.splice(1, 0, target);
    }

    return segments.join("/") || `/${target}`;
  }

  function selectLocale(target: Locale) {
    // Remembered so the proxy can pick the right locale for unprefixed visits.
    setCookie(localeCookie, target);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label} — ${localeNames[locale].label}`}
        className={[
          "group inline-flex shrink-0 items-center gap-1.5 rounded-xl py-2 pl-3 pr-2.5 text-sm font-semibold ring-1 transition-colors duration-200",
          open
            ? "bg-navy-tint text-navy ring-navy/30"
            : "bg-white text-ink ring-hairline hover:text-navy hover:ring-navy/30",
        ].join(" ")}
      >
        <Globe
          className={`size-4 transition-colors ${
            open ? "text-navy" : "text-muted group-hover:text-navy"
          }`}
          aria-hidden="true"
        />
        {localeNames[locale].short}
        <ChevronDown
          className={`size-3.5 text-muted transition-transform ${
            open ? "rotate-180 text-navy" : "group-hover:text-navy"
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="menu"
          className={[
            "absolute z-50 w-48 animate-dropdown rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5",
            menuPlacement === "above"
              ? "bottom-full mb-2 origin-bottom"
              : "top-full mt-2 origin-top-right",
            menuAlign === "center"
              ? "left-1/2 -translate-x-1/2"
              : "right-0",
          ].join(" ")}
        >
          {locales.map((code) => {
            const active = code === locale;

            return (
              <li key={code} role="none">
                <Link
                  href={hrefFor(code)}
                  role="menuitem"
                  hrefLang={code}
                  onClick={() => selectLocale(code)}
                  className={[
                    "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-navy-tint font-semibold text-navy"
                      : "text-body hover:bg-paper hover:text-navy",
                  ].join(" ")}
                >
                  <span lang={code}>{localeNames[code].label}</span>
                  {active ? (
                    <Check className="size-4 text-brass" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-semibold text-muted">
                      {localeNames[code].short}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
