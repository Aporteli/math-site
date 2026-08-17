"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { mainNavLinks } from "@/lib/navigation";

export function NavLinks({
  locale,
  labels,
  variant = "desktop",
  onNavigate,
}: {
  locale: Locale;
  labels: Dictionary["nav"];
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <ul className={isMobile ? "flex flex-col gap-1" : "flex items-center gap-1"}>
      {mainNavLinks.map((link) => {
        const href = localePath(locale, link.href);
        const active =
          link.href === "/" ? pathname === href : pathname.startsWith(href);

        return (
          <li key={link.id}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={[
                "block rounded-lg font-medium transition-colors",
                isMobile ? "px-3 py-2.5 text-base" : "px-3 py-2 text-sm",
                active
                  ? "bg-white text-navy shadow-sm ring-1 ring-hairline"
                  : "text-body hover:bg-white/70 hover:text-navy",
              ].join(" ")}
            >
              {labels[link.id]}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
