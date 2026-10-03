"use client";

import Link from "next/link";
import { ArrowUpRight, LayoutDashboard } from "lucide-react";
import { localePath } from "@/i18n/config";
import { dashboardHomeForRole } from "@/lib/auth/paths";
import type { WorkspaceDockProps } from './types';


export function WorkspaceDock({
  locale,
  role,
  roleLabel,
  label,
  hint,
  variant = "floating",
}: WorkspaceDockProps) {
  // 1. გამოიტანს როლს ბრაუზერის კონსოლში კომპონენტის ჩატვირთვისთანავე
  console.log("⚡ [WorkspaceDock Rendered] Current Role:", role);

  const href = localePath(locale, dashboardHomeForRole(role));

  // 2. დაკლიკების ფუნქცია კონსოლში გამოსატანად
  const handleDockClick = () => {
    console.log("🖱️ [WorkspaceDock Clicked]:", {
      role: role,
      targetHref: href,
      time: new Date().toLocaleTimeString(),
    });
  };

  if (variant === "bar") {
    return (
      <Link
        href={href}
        onClick={handleDockClick}
        aria-label={hint}
        className="inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-box bg-[#465D73] px-3 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98]"
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
        onClick={handleDockClick}
        className="pointer-events-auto flex max-w-xs items-center gap-3 overflow-hidden rounded-box border border-hairline bg-main p-3 shadow-md transition hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-lg"
      >
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
          <LayoutDashboard className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold tracking-wide text-brass">
            {roleLabel}
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-sm font-bold text-ink">
            {label}
            <ArrowUpRight className="size-3.5 shrink-0 text-brass-strong" aria-hidden="true" />
          </span>
          <span className="mt-0.5 block text-xs text-muted">{hint}</span>
        </span>
      </Link>
    </aside>
  );
}