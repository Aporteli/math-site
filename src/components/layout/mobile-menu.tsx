"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLinks } from "@/components/layout/nav-links";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

export function MobileMenu({
  locale,
  header,
  nav,
  children,
}: {
  locale: Locale;
  header: Dictionary["header"];
  nav: Dictionary["nav"];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex items-center justify-center rounded-xl border border-hairline bg-white p-2 text-ink transition-colors hover:border-navy/40 hover:text-navy"
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
          <div className="md:hidden">{children}</div>
          <nav aria-label={header.mobileNav} className="mt-4">
            <NavLinks
              locale={locale}
              labels={nav}
              variant="mobile"
              onNavigate={() => setOpen(false)}
            />
          </nav>
        </div>
      )}
    </div>
  );
}
