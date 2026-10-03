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
          "group inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-box border py-2 pl-3 pr-2.5 text-sm font-bold transition",
          open
            ? "border-mainButton/30 bg-mainButton text-mainText"
            : "border-hairline bg-mainButton text-mainText hover:border-mainButton/40 hover:bg-mainButtonHover hover:text-mainText",
        ].join(" ")}
      >
        <Globe
          className={`size-4 transition-colors ${
            open ? "text-mainText" : "text-muted group-hover:text-mainText"
          }`}
          aria-hidden="true"
        />
        {localeNames[locale].short}
        <ChevronDown
          className={`size-3.5 text-mainText transition-transform ${
            open ? "rotate-180 text-mainText" : "group-hover:text-mainText"
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="menu"
          className={[
            "absolute z-50 w-48 animate-dropdown rounded-box border border-hairline bg-main p-1.5 shadow-lg ",
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
                    "flex items-center justify-between gap-3 rounded-box px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]"
                      : "font-medium text-mainText hover:bg-sectionHeader",
                  ].join(" ")}
                >
                  <span lang={code}>{localeNames[code].label}</span>
                  {active ? (
                    <Check className="size-4 text-mainText" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-semibold text-mainText">
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
