"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

interface MobileMenuProps {
  locale: Locale;
  header: Dictionary["header"];
  nav: Dictionary["nav"];
  menus: Dictionary["menus"];
  children?: React.ReactNode;
}

export function MobileMenu({
  locale,
  header,
  nav,
  menus,
  children,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex shrink-0 items-center justify-center rounded-full border border-hairline bg-white p-2 text-ink transition-colors duration-200 hover:border-navy/40 hover:text-navy"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
        <span className="sr-only">
          {open ? header.closeMenu : header.openMenu}
        </span>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-hairline bg-paper px-4 pb-6 pt-4 shadow-sm sm:px-6"
        >
          {children ? <div className="mb-3">{children}</div> : null}
          <nav aria-label={header.mobileNav}>
            <NavLinks
              locale={locale}
              labels={nav}
              menus={menus}
              variant="mobile"
              onNavigate={() => setOpen(false)}
            />
          </nav>
        </div>
      )}
    </div>
  );
}
