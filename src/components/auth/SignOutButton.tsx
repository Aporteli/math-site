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
          ? "inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline bg-paper text-body transition hover:border-loss/40 hover:bg-loss-tint hover:text-loss"
          : header
            ? "inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline bg-paper px-3 py-2 text-sm font-bold text-body transition hover:border-loss/40 hover:bg-loss-tint hover:text-loss"
            : "inline-flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-body transition hover:bg-loss-tint hover:text-loss"
      }
    >
      <LogOut className="size-4 shrink-0" aria-hidden="true" />
      {iconOnly ? null : label}
    </button>
  );
}
