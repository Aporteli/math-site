"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { SiteLogo } from "@/components/layout/site-logo";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { SIDEBAR_COOKIE } from "@/lib/dashboard";
import { setCookie } from "@/lib/helpers/cookies";

type DashboardFrameProps = {
  locale: Locale;
  dict: Dictionary;
  roleLabel: string;
  userName: string;
  initialCollapsed: boolean;
  children: React.ReactNode;
} & (
  | {
      role: "teacher";
      labels: Dictionary["dashboard"]["teacher"]["nav"];
    }
  | {
      role: "student";
      labels: Dictionary["dashboard"]["student"]["nav"];
    }
);

export function DashboardFrame(props: DashboardFrameProps) {
  const { locale, dict, roleLabel, userName, children } = props;
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(props.initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    function onScroll() {
      if (mobileOpen) {
        setHeaderHidden(false);
        lastScrollY.current = window.scrollY;
        return;
      }

      const y = window.scrollY;
      const delta = y - lastScrollY.current;

      if (y < 12) {
        setHeaderHidden(false);
      } else if (delta > 6) {
        setHeaderHidden(true);
      } else if (delta < -6) {
        setHeaderHidden(false);
      }

      lastScrollY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileOpen]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    setCookie(SIDEBAR_COOKIE, next ? "1" : "0");
  }

  const navLabel = dict.dashboard.navLabel;
  const nav =
    props.role === "teacher" ? (
      <DashboardNav
        locale={locale}
        label={navLabel}
        role="teacher"
        labels={props.labels}
        collapsed={collapsed}
      />
    ) : (
      <DashboardNav
        locale={locale}
        label={navLabel}
        role="student"
        labels={props.labels}
        collapsed={collapsed}
      />
    );

  const mobileNav =
    props.role === "teacher" ? (
      <DashboardNav
        locale={locale}
        label={navLabel}
        role="teacher"
        labels={props.labels}
      />
    ) : (
      <DashboardNav
        locale={locale}
        label={navLabel}
        role="student"
        labels={props.labels}
      />
    );

  return (
    <div className="min-h-screen bg-paper">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline bg-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.75rem]" : "w-72",
        ].join(" ")}
      >
        <SidebarChrome
          locale={locale}
          dict={dict}
          roleLabel={roleLabel}
          userName={userName}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
          nav={nav}
        />
      </aside>

      {mobileOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/25"
            aria-label={dict.dashboard.closeNav}
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-hairline bg-white shadow-lg">
            <SidebarChrome
              locale={locale}
              dict={dict}
              roleLabel={roleLabel}
              userName={userName}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              closeLabel={dict.dashboard.closeNav}
              nav={mobileNav}
            />
          </aside>
        </div>
      ) : null}

      <div
        className={[
          "transition-[padding] duration-200",
          collapsed ? "lg:pl-[4.75rem]" : "lg:pl-72",
        ].join(" ")}
      >
        <header
          className={[
            "sticky top-0 z-30 border-b border-hairline bg-paper/80 backdrop-blur-md",
            "motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out",
            headerHidden ? "-translate-y-full" : "translate-y-0",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-white text-ink transition-colors hover:border-navy/30 hover:text-navy lg:hidden"
              aria-label={dict.dashboard.openNav}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1 lg:hidden">
              <SiteLogo locale={locale} brand={dict.brand} />
            </div>
            <p className="hidden min-w-0 flex-1 text-sm font-medium text-muted lg:block">
              {dict.dashboard.workspace}
            </p>
            <LanguageSwitcher locale={locale} label={dict.header.language} />
            <Link
              href={localePath(locale, "/")}
              className="hidden rounded-full border border-hairline bg-white px-3 py-2 text-sm font-medium text-body transition-colors hover:border-navy/30 hover:text-navy sm:inline-flex"
            >
              {dict.nav.home}
            </Link>
          </div>
        </header>
        <main className="px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarChrome({
  locale,
  dict,
  roleLabel,
  userName,
  collapsed,
  onToggle,
  closeLabel,
  nav,
}: {
  locale: Locale;
  dict: Dictionary;
  roleLabel: string;
  userName: string;
  collapsed: boolean;
  onToggle: () => void;
  closeLabel?: string;
  nav: React.ReactNode;
}) {
  const toggleLabel = closeLabel
    ? closeLabel
    : collapsed
      ? dict.dashboard.expandNav
      : dict.dashboard.collapseNav;

  return (
    <>
      <div
        className={[
          "flex border-b border-hairline",
          collapsed
            ? "flex-col items-center gap-2 px-2 py-3"
            : "items-center gap-2 px-3 py-3",
        ].join(" ")}
      >
        <SiteLogo
          locale={locale}
          brand={dict.brand}
          markOnly={collapsed}
          className={collapsed ? "justify-center" : "min-w-0 flex-1"}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          aria-expanded={closeLabel ? undefined : !collapsed}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-body transition-colors hover:bg-paper hover:text-navy"
        >
          {closeLabel ? (
            <X className="size-4" aria-hidden="true" />
          ) : collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3">{nav}</div>
      <div
        className={[
          "border-t border-hairline",
          collapsed ? "flex flex-col items-center gap-1 p-2" : "p-3",
        ].join(" ")}
      >
        {collapsed ? (
          <p className="sr-only">
            {userName}, {roleLabel}
          </p>
        ) : (
          <>
            <p className="truncate px-3 text-sm font-semibold text-ink">
              {userName}
            </p>
            <p className="truncate px-3 text-xs text-muted">{roleLabel}</p>
          </>
        )}
        <div className={collapsed ? undefined : "mt-2"}>
          <SignOutButton
            locale={locale}
            label={dict.dashboard.signOut}
            variant={collapsed ? "icon" : "sidebar"}
          />
        </div>
      </div>
    </>
  );
}
