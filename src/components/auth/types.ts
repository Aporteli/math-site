import type { Locale } from "@/i18n/config";
import type { UserRole } from "@/lib/auth/roles";
import type { Dictionary } from "@/i18n/types";

// Types for AuthEntry
export interface AuthEntryProps {
  locale: Locale;
  loginLabel: string;
  signOutLabel: string;
  session: { role: UserRole } | null;
  withText?: boolean;
}

// Types for WorkspaceDock
export interface WorkspaceDockProps {
  locale: Locale;
  role: UserRole;
  roleLabel: string;
  label: string;
  hint: string;
  variant?: "floating" | "bar";
}

// Types for LoginForm
export type LoginCopy = Dictionary['auth']['login'];

export interface LoginFormProps {
  locale: Locale;
  copy: LoginCopy;
}

// Types for SignupForm
export type SignupCopy = Dictionary['auth']['signup'];

export interface SignupFormProps {
  locale: Locale;
  copy: SignupCopy;
}