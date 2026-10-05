import { notFound } from 'next/navigation';
import { WorkspaceDock } from '@/components/auth/WorkspaceDock';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { findRequestUser } from '@/lib/auth/request-user';
import { isUserRole } from '@/lib/auth/roles';
import { getSession } from '@/lib/auth/session';

export default async function PublicLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const session = await getSession();
  const databaseUser = session?.user?.email
    ? await findRequestUser(session.user.id ?? '', session.user.email)
    : null;
  const databaseRole = databaseUser && isUserRole(databaseUser.role) ? databaseUser.role : null;
  const user = session?.user ? { role: databaseRole ?? session.user.role } : null;

  // სამუშაო სივრცის მენიუ (Dock) გამოუჩნდეს მხოლოდ სტუდენტს, მასწავლებელს ან ადმინს
  const hasWorkspaceAccess = user?.role === 'STUDENT' || user?.role === 'TEACHER' || user?.role === 'ADMIN';

  const roleLabel = user?.role === 'STUDENT' ? dict.dashboard.student.role : dict.dashboard.teacher.role;

  return (
    <div className="flex min-h-screen flex-col bg-paper pb-[calc(4.25rem+env(safe-area-inset-bottom))] min-[500px]:pb-0">
      <SiteHeader locale={locale} dict={dict} session={user} />
      <main className="flex-1">{children}</main>

      {hasWorkspaceAccess && user ? (
        <WorkspaceDock
          locale={locale}
          role={user.role}
          roleLabel={roleLabel}
          label={dict.dashboard.workspace}
          hint={dict.dashboard.openWorkspace}
        />
      ) : null}

      <SiteFooter locale={locale} dict={dict} />
    </div>
  );
}
