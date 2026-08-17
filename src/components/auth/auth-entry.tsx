import Link from "next/link";
import { LogIn } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { localePath, type Locale } from "@/i18n/config";
import type { UserRole } from "@/lib/auth/roles";

interface AuthEntryProps {
  locale: Locale;
  loginLabel: string;
  signOutLabel: string;
  session: { role: UserRole } | null;
  withText?: boolean;
}

export function AuthEntry({
  locale,
  loginLabel,
  signOutLabel,
  session,
  withText = false,
}: AuthEntryProps) {
  if (session) {
    return (
      <SignOutButton locale={locale} label={signOutLabel} variant="header" />
    );
  }

  return (
    <Link
      href={localePath(locale, "/login")}
      aria-label={loginLabel}
      className="inline-flex shrink-0 items-center gap-2 rounded-full bg-navy px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-navy-strong sm:px-4"
    >
      <LogIn className="size-4 shrink-0" aria-hidden="true" />
      <span className={withText ? "inline" : "hidden sm:inline"}>
        {loginLabel}
      </span>
    </Link>
  );
}
