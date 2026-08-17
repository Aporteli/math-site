import Link from "next/link";
import { MathMark } from "@/components/layout/math-mark";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

interface SiteLogoProps {
  locale: Locale;
  brand: Dictionary["brand"];
  tone?: "dark" | "light";
  className?: string;
  markOnly?: boolean;
}

export function SiteLogo({
  locale,
  brand,
  tone = "dark",
  className = "",
  markOnly = false,
}: SiteLogoProps) {
  const isLight = tone === "light";

  return (
    <Link
      href={localePath(locale, "/")}
      className={`group flex items-center gap-2.5 ${className}`}
      aria-label={brand.home}
    >
      <MathMark
        tone={tone}
        className="size-9 transition-transform group-hover:-rotate-3"
      />
      {markOnly ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span
            className={`text-base font-bold tracking-tight ${
              isLight ? "text-white" : "text-ink"
            }`}
          >
            {brand.name}
          </span>
          <span
            className={`truncate text-xs font-medium ${
              isLight ? "text-paper/70" : "text-muted"
            }`}
          >
            {brand.person}
          </span>
        </span>
      )}
    </Link>
  );
}

