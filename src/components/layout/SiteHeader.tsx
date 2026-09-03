import { AuthEntry } from '@/components/auth/auth-entry';
import { WorkspaceDock } from '@/components/auth/workspace-dock';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { NavLinks } from '@/components/layout/NavLinks';
import { SiteLogo } from '@/components/layout/SiteLogo';
import { SearchTrigger, SiteSearch } from '@/components/layout/SiteSearch';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import type { UserRole } from '@/lib/auth/roles';

interface SiteHeaderProps {
  locale: Locale;
  dict: Dictionary;
  session: { role: UserRole } | null;
}

export function SiteHeader({ locale, dict, session }: SiteHeaderProps) {
  const roleLabel = session?.role === 'STUDENT' ? dict.dashboard.student.role : dict.dashboard.teacher.role;

  const auth = (
    <AuthEntry locale={locale} loginLabel={dict.header.login} signOutLabel={dict.dashboard.signOut} session={session} />
  );

  const search = (
    <>
      <SearchTrigger variant="field" className="hidden md:flex md:w-44 2xl:w-56" />
      <SearchTrigger variant="icon" className="hidden min-[500px]:inline-flex md:hidden" />
    </>
  );

  return (
    <SiteSearch
      locale={locale}
      header={dict.header}
      nav={dict.nav}
      toolItems={dict.toolsPage.items}
      posts={dict.blogPage.posts}>
      <header className="sticky top-0 z-50 border-b border-hairline bg-paper/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8 xl:gap-4">
          <SiteLogo locale={locale} brand={dict.brand} className="shrink-0" />

          <nav aria-label={dict.header.mainNav} className="hidden flex-1 shrink-0 justify-center xl:flex">
            <NavLinks locale={locale} labels={dict.nav} menus={dict.menus} />
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2 xl:ml-0">
            <div className="hidden min-[500px]:contents">
              {search}
              <LanguageSwitcher locale={locale} label={dict.header.language} />
              <ThemeToggle label={dict.header.theme} />
              {auth}
            </div>

            <MobileMenu locale={locale} header={dict.header} nav={dict.nav} menus={dict.menus}>
              {session ? <SignOutButton locale={locale} label={dict.dashboard.signOut} variant="header" /> : null}
            </MobileMenu>
          </div>
        </div>
      </header>

      <nav
        aria-label={dict.header.quickActions}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-paper/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md min-[500px]:hidden">
        <div className="flex items-center justify-around gap-2 px-3 py-2">
          <SearchTrigger variant="icon" />
          <LanguageSwitcher locale={locale} label={dict.header.language} menuPlacement="above" menuAlign="center" />
          <ThemeToggle label={dict.header.theme} />
          {session ? (
            <WorkspaceDock
              locale={locale}
              role={session.role}
              roleLabel={roleLabel}
              label={dict.dashboard.workspace}
              hint={dict.dashboard.openWorkspace}
              variant="bar"
            />
          ) : (
            <AuthEntry
              locale={locale}
              loginLabel={dict.header.login}
              signOutLabel={dict.dashboard.signOut}
              session={null}
              withText
            />
          )}
        </div>
      </nav>
    </SiteSearch>
  );
}
