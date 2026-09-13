'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { DashboardNav } from '@/components/layout/DashboardNav';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SiteLogo } from '@/components/layout/SiteLogo';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { SIDEBAR_COOKIE } from '@/lib/dashboard';
import { setCookie } from '@/lib/helpers/cookies';

interface DashboardContextType {
  sidebarDrawerOpen: boolean;
  toggleSidebarDrawer: () => void;
  isJournalPage: boolean;
  sidebarActions: React.ReactNode | null;
  setSidebarActions: (actions: React.ReactNode | null) => void;
}

const DashboardContext = createContext<DashboardContextType>({
  sidebarDrawerOpen: false,
  toggleSidebarDrawer: () => {},
  isJournalPage: false,
  sidebarActions: null,
  setSidebarActions: () => {},
});

export const useDashboardFrame = () => useContext(DashboardContext);

type DashboardFrameProps = {
  locale: Locale;
  dict: Dictionary;
  roleLabel: string;
  userName: string;
  initialCollapsed: boolean;
  children: React.ReactNode;
} & (
  | {
      role: 'teacher';
      labels: Dictionary['dashboard']['teacher']['nav'];
    }
  | {
      role: 'student';
      labels: Dictionary['dashboard']['student']['nav'];
    }
);

export function DashboardFrame(props: DashboardFrameProps) {
  const { locale, dict, roleLabel, userName, children } = props;
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(props.initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [journalDrawerOpen, setJournalDrawerOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [sidebarActions, setSidebarActions] = useState<React.ReactNode | null>(null);
  const lastScrollY = useRef(0);

  const isJournalPage =
    pathname.endsWith('/teacher/journal') ||
    pathname.endsWith('/teacher/calendar') ||
    pathname.endsWith('/teacher/whiteboard');

  useEffect(() => {
    setMobileOpen(false);
    setJournalDrawerOpen(false);
    setSidebarActions(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen && !journalDrawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        setJournalDrawerOpen(false);
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen, journalDrawerOpen]);

  useEffect(() => {
    if (isJournalPage) return;

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

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [mobileOpen, isJournalPage]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    setCookie(SIDEBAR_COOKIE, next ? '1' : '0');
  }

  function toggleSidebarDrawer() {
    setJournalDrawerOpen((prev) => !prev);
  }

  const navLabel = dict.dashboard.navLabel;
  const nav =
    props.role === 'teacher' ? (
      <DashboardNav
        locale={locale}
        label={navLabel}
        role="teacher"
        labels={props.labels}
        collapsed={isJournalPage ? true : collapsed}
      />
    ) : (
      <DashboardNav
        locale={locale}
        label={navLabel}
        role="student"
        labels={props.labels}
        collapsed={isJournalPage ? true : collapsed}
      />
    );

  const mobileNav =
    props.role === 'teacher' ? (
      <DashboardNav locale={locale} label={navLabel} role="teacher" labels={props.labels} />
    ) : (
      <DashboardNav locale={locale} label={navLabel} role="student" labels={props.labels} />
    );

  return (
    <DashboardContext.Provider
      value={{
        sidebarDrawerOpen: journalDrawerOpen,
        toggleSidebarDrawer,
        isJournalPage,
        sidebarActions,
        setSidebarActions,
      }}>
      <div
        className={`bg-paper text-ink ${isJournalPage ? 'h-[100dvh] overflow-hidden flex flex-col' : 'min-h-screen'}`}>
        {!isJournalPage && (
          <aside
            className={[
              'fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-hairline/60 bg-paper-deep/95 backdrop-blur-md transition-[width] duration-200 lg:flex',
              collapsed ? 'w-[4.75rem]' : 'w-72',
            ].join(' ')}>
            <SidebarChrome
              locale={locale}
              dict={dict}
              roleLabel={roleLabel}
              userName={userName}
              collapsed={collapsed}
              onToggle={toggleCollapsed}
              nav={nav}
              sidebarActions={sidebarActions}
            />
          </aside>
        )}

        {isJournalPage && (
          <>
            {journalDrawerOpen && (
              <div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={() => setJournalDrawerOpen(false)}
              />
            )}
            <aside
              className={`fixed inset-y-0 left-0 z-50 flex w-[4.75rem] flex-col border-r border-hairline/60 bg-paper-deep/95 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out ${
                journalDrawerOpen ? 'translate-x-0' : '-translate-x-full'
              }`}>
              <SidebarChrome
                locale={locale}
                dict={dict}
                roleLabel={roleLabel}
                userName={userName}
                collapsed={true}
                onToggle={() => setJournalDrawerOpen(false)}
                closeLabel={dict.dashboard.closeNav}
                nav={nav}
                sidebarActions={sidebarActions}
              />
            </aside>
          </>
        )}

        {mobileOpen ? (
          <div className="lg:hidden">
            <button
              type="button"
              className="fixed inset-0 z-40 bg-black/65 backdrop-blur-xs"
              aria-label={dict.dashboard.closeNav}
              onClick={() => setMobileOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-hairline/60 bg-paper-deep shadow-2xl">
              <SidebarChrome
                locale={locale}
                dict={dict}
                roleLabel={roleLabel}
                userName={userName}
                collapsed={false}
                onToggle={() => setMobileOpen(false)}
                closeLabel={dict.dashboard.closeNav}
                nav={mobileNav}
                sidebarActions={sidebarActions}
              />
            </aside>
          </div>
        ) : null}

        <div
          className={[
            'flex-1 flex flex-col min-w-0 transition-[padding] duration-200',
            !isJournalPage && (collapsed ? 'lg:pl-[4.75rem]' : 'lg:pl-72'),
            isJournalPage ? 'h-full overflow-hidden' : '',
          ].join(' ')}>
          {!isJournalPage && (
            <header
              className={[
                'sticky top-0 z-30 border-b border-hairline/60 bg-paper/90 backdrop-blur-md shrink-0',
                'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out',
                headerHidden ? '-translate-y-full' : 'translate-y-0',
              ].join(' ')}>
              <div className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
                <button
                  type="button"
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline/60 bg-surface/80 text-muted transition-colors hover:border-brass/40 hover:text-brass lg:hidden"
                  aria-label={dict.dashboard.openNav}
                  aria-expanded={mobileOpen}
                  onClick={() => setMobileOpen(true)}>
                  <Menu className="size-4" aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1 lg:hidden">
                  <SiteLogo locale={locale} brand={dict.brand} />
                </div>
                <p className="hidden min-w-0 flex-1 text-xs font-bold uppercase tracking-wider text-muted lg:block">
                  {dict.dashboard.workspace}
                </p>

                <Link
                  href={localePath(locale, '/')}
                  className="hidden rounded-xl border border-hairline/60 bg-surface/70 px-3.5 py-2.5 text-xs font-bold text-muted transition-colors hover:border-brass/40 hover:text-brass sm:inline-flex">
                  {dict.nav.home}
                </Link>
                <LanguageSwitcher locale={locale} label={dict.header.language} />
                <ThemeToggle label={dict.header.theme} />
              </div>
            </header>
          )}

          <main
            className={
              isJournalPage
                ? 'h-[100dvh] w-full p-2 sm:p-3 overflow-hidden flex flex-col box-border'
                : 'px-4 py-6 sm:px-6 lg:px-8'
            }>
            {children}
          </main>
        </div>
      </div>
    </DashboardContext.Provider>
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
  sidebarActions,
}: {
  locale: Locale;
  dict: Dictionary;
  roleLabel: string;
  userName: string;
  collapsed: boolean;
  onToggle: () => void;
  closeLabel?: string;
  nav: React.ReactNode;
  sidebarActions?: React.ReactNode;
}) {
  const toggleLabel = closeLabel ? closeLabel : collapsed ? dict.dashboard.expandNav : dict.dashboard.collapseNav;

  return (
    <>
      {/* ლოგოს და ჩაკეცვის ზოლი */}
      <div
        className={[
          'flex border-b border-hairline/60',
          collapsed ? 'flex-col items-center gap-2 px-2 py-3' : 'items-center gap-2 px-3.5 py-3',
        ].join(' ')}>
        <SiteLogo
          locale={locale}
          brand={dict.brand}
          markOnly={collapsed}
          className={collapsed ? 'justify-center' : 'min-w-0 flex-1'}
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={toggleLabel}
          aria-expanded={closeLabel ? undefined : !collapsed}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-brass">
          {closeLabel ? (
            <X className="size-4" aria-hidden="true" />
          ) : collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ნავიგაციის სექცია */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 thin-scrollbar">{nav}</div>

      {sidebarActions && (
        <div
          className={[
            'border-t border-hairline/60 bg-paper/40 transition-all',
            collapsed ? 'p-2 flex flex-col items-center gap-2' : 'p-3 space-y-2',
          ].join(' ')}>
          {sidebarActions}
        </div>
      )}

      {/* მომხმარებლის პროფილი და გამოსვლა */}
      <div
        className={[
          'border-t border-hairline/60 bg-paper/20',
          collapsed ? 'flex flex-col items-center gap-1 p-2' : 'p-3.5',
        ].join(' ')}>
        {collapsed ? (
          <p className="sr-only">
            {userName}, {roleLabel}
          </p>
        ) : (
          <div className="mb-2">
            <p className="truncate text-xs font-bold text-ink">{userName}</p>
            <p className="truncate text-[11px] text-muted">{roleLabel}</p>
          </div>
        )}
        <div className={collapsed ? undefined : 'mt-1.5'}>
          <SignOutButton locale={locale} label={dict.dashboard.signOut} variant={collapsed ? 'icon' : 'sidebar'} />
        </div>
      </div>
    </>
  );
}
