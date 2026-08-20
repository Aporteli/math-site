import Link from "next/link";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import { dashboardHomeForRole } from "@/lib/auth/paths";
import type { UserRole } from "@/lib/auth/roles";

interface WorkspaceDockProps {
  locale: Locale;
  role: UserRole;
  roleLabel: string;
  label: string;
  hint: string;
  variant?: "floating" | "bar";
}

export function WorkspaceDock({
  locale,
  role,
  roleLabel,
  label,
  hint,
  variant = "floating",
}: WorkspaceDockProps) {
  const href = localePath(locale, dashboardHomeForRole(role));

  if (variant === "bar") {
    return (
      <Link
        href={href}
        aria-label={hint}
        className="inline-flex min-w-0 items-center gap-2 rounded-full bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong"
      >
        <LayoutDashboard className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <aside className="pointer-events-none fixed left-4 bottom-5 z-40 hidden min-[500px]:block sm:left-6 sm:bottom-6">
      <Link
        href={href}
        className="pointer-events-auto flex max-w-xs items-center gap-3 rounded-2xl border border-hairline bg-white p-3 shadow-md transition-all hover:border-navy/30 hover:shadow-lg"
      >
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
          <LayoutDashboard className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold tracking-wide text-brass">
            {roleLabel}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-sm font-semibold text-ink">
            {label}
            <ArrowUpRight className="size-3.5 shrink-0 text-navy" aria-hidden="true" />
          </span>
          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
        </span>
      </Link>
    </aside>
  );
}
