'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { NavLinks } from '@/components/layout/NavLinks';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

interface MobileMenuProps {
  locale: Locale;
  header: Dictionary['header'];
  nav: Dictionary['nav'];
  menus: Dictionary['menus'];
  children?: React.ReactNode;
}

export function MobileMenu({ locale, header, nav, menus, children }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline bg-paper text-ink shadow-sm transition hover:border-navy/40 hover:bg-navy-tint hover:text-navy">
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
        <span className="sr-only">{open ? header.closeMenu : header.openMenu}</span>
      </button>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-full border-b border-hairline bg-surface px-4 pb-6 pt-4 shadow-md sm:px-6">
          {children ? <div className="mb-3">{children}</div> : null}
          <nav aria-label={header.mobileNav}>
            <NavLinks locale={locale} labels={nav} menus={menus} variant="mobile" onNavigate={() => setOpen(false)} />
          </nav>
        </div>
      )}
    </div>
  );
}
