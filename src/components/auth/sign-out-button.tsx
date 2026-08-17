"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";

export function SignOutButton({
  locale,
  label,
  variant = "sidebar",
}: {
  locale: Locale;
  label: string;
  variant?: "sidebar" | "header" | "icon";
}) {
  const header = variant === "header";
  const iconOnly = variant === "icon";

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: localePath(locale, "/") })}
      aria-label={iconOnly ? label : undefined}
      className={
        iconOnly
          ? "inline-flex size-9 items-center justify-center rounded-xl text-body transition-colors hover:bg-paper hover:text-navy"
          : header
            ? "inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-3 py-2 text-sm font-medium text-body transition-colors hover:border-navy/30 hover:text-navy"
            : "inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-body transition-colors hover:bg-paper hover:text-navy"
      }
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      {iconOnly ? null : label}
    </button>
  );
}
