import { AuthEntry } from '@/components/auth/AuthEntry';
import { WorkspaceDock } from '@/components/auth/WorkspaceDock';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { NavLinks } from '@/components/layout/NavLinks';
import { SiteLogo } from '@/components/layout/SiteLogo';
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

  return (
    <>
      <header className=" sticky top-0 z-50 border-b border-hairline bg-surface/95 shadow-sm backdrop-blur-md">
        <div className="h-1 bg-brass" aria-hidden="true" />
        <div className="mx-auto flex justify-center h-16 max-w-xl items-center gap-25 px-4 sm:px-6 lg:px-8">
          <SiteLogo locale={locale} brand={dict.brand} className="shrink-0" />

          <nav aria-label={dict.header.mainNav} className="hidden shrink-0 lg:flex">
            <NavLinks locale={locale} labels={dict.nav} menus={dict.menus} />
          </nav>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
            <div className="hidden items-center gap-2 min-[500px]:flex">
              <ThemeToggle label={dict.header.theme} />
              <LanguageSwitcher locale={locale} label={dict.header.language} />
              <AuthEntry
                locale={locale}
                loginLabel={dict.header.login}
                signOutLabel={dict.dashboard.signOut}
                session={session}
              />
            </div>
            <MobileMenu locale={locale} header={dict.header} nav={dict.nav} menus={dict.menus}>
              {session ? <SignOutButton locale={locale} label={dict.dashboard.signOut} variant="header" /> : null}
            </MobileMenu>
          </div>
        </div>
      </header>

      <nav
        aria-label={dict.header.quickActions}
        className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(16,28,52,0.06)] backdrop-blur-md min-[500px]:hidden">
        <div className="flex items-center justify-around gap-2 px-3 py-2">
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
    </>
  );
}
