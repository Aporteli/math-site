"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import { mainNavLinks, navMenuHrefs, type NavMenuId } from "@/lib/navigation";

interface NavLinksProps {
  locale: Locale;
  labels: Dictionary["nav"];
  menus: Dictionary["menus"];
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}

export function NavLinks({
  locale,
  labels,
  menus,
  variant = "desktop",
  onNavigate,
}: NavLinksProps) {
  const pathname = usePathname();
  const isMobile = variant === "mobile";

  return (
    <ul
      className={
        isMobile
          ? "flex flex-col gap-1"
          : "flex items-center gap-1 rounded-full border border-hairline/70 bg-paper-deep/60 p-1"
      }
    >
      {mainNavLinks.map((link) => {
        const href = localePath(locale, link.href);
        const active =
          link.href === "/" ? pathname === href : pathname.startsWith(href);
        const menuId = link.menu;
        const menuItems = menuId ? Object.entries(menus[menuId]) : null;

        if (isMobile) {
          return (
            <li key={link.id}>
              <Link
                href={href}
                prefetch={false}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-1 rounded-lg px-3 py-2.5 text-base transition-all duration-200",
                  active
                    ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-hairline"
                    : "font-medium text-body hover:bg-white/70 hover:text-ink",
                ].join(" ")}
              >
                {labels[link.id]}
                {menuItems && (
                  <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
                )}
              </Link>
              {menuItems && menuId && (
                <ul className="mb-1 ml-3 space-y-0.5 border-l border-hairline pl-3">
                  {menuItems.map(([itemId, itemLabel]) => {
                    const itemHref = localePath(
                      locale,
                      navMenuHrefs[menuId][itemId] ?? "/",
                    );

                    return (
                      <li key={itemId}>
                        <Link
                          href={itemHref}
                          prefetch={false}
                          onClick={onNavigate}
                          className={[
                            "block rounded-lg px-3 py-2 text-sm transition-colors duration-200",
                            pathname === itemHref
                              ? "bg-navy-tint font-semibold text-navy"
                              : "text-body hover:bg-white/70 hover:text-ink",
                          ].join(" ")}
                        >
                          {itemLabel}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        }

        return (
          <DesktopNavItem
            key={link.id}
            href={href}
            label={labels[link.id]}
            active={active}
            pathname={pathname}
            menuId={menuId}
            menuItems={menuItems}
            locale={locale}
            onNavigate={onNavigate}
          />
        );
      })}
    </ul>
  );
}

function DesktopNavItem({
  href,
  label,
  active,
  pathname,
  menuId,
  menuItems,
  locale,
  onNavigate,
}: {
  href: string;
  label: string;
  active: boolean;
  pathname: string;
  menuId?: NavMenuId;
  menuItems: [string, string][] | null;
  locale: Locale;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  return (
    <li
      className="relative"
      onMouseEnter={() => menuItems && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => menuItems && setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <Link
        href={href}
        prefetch={false}
        onClick={close}
        aria-current={active ? "page" : undefined}
        aria-expanded={menuItems ? open : undefined}
        aria-haspopup={menuItems ? "true" : undefined}
        className={[
          "flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-all duration-200",
          active
            ? "bg-white font-semibold text-ink shadow-sm ring-1 ring-hairline"
            : "font-medium text-body hover:bg-white/70 hover:text-ink",
        ].join(" ")}
      >
        {label}
        {menuItems && (
          <ChevronDown
            className={`size-3.5 shrink-0 transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        )}
      </Link>

      {menuItems && menuId && open && (
        <div className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
          <ul className="w-72 origin-top animate-dropdown rounded-2xl border border-hairline bg-white p-1.5 shadow-lg shadow-navy/5">
            {menuItems.map(([itemId, itemLabel]) => {
              const itemHref = localePath(
                locale,
                navMenuHrefs[menuId][itemId] ?? "/",
              );

              return (
                <li key={itemId}>
                  <Link
                    href={itemHref}
                    prefetch={false}
                    onClick={close}
                    className={[
                      "block rounded-xl px-3 py-2 text-sm transition-colors duration-200",
                      pathname === itemHref
                        ? "bg-navy-tint font-semibold text-navy"
                        : "text-body hover:bg-paper hover:text-ink",
                    ].join(" ")}
                  >
                    {itemLabel}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}