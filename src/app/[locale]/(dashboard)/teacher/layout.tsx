import { notFound } from 'next/navigation';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { requireRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  // მკაცრი დაცვა: უშვებს მხოლოდ TEACHER და ADMIN როლებს. VISITOR და STUDENT ავტომატურად იბლოკებიან.
  const session = await requireRole(locale, ['TEACHER', 'ADMIN']);
  const dict = getDictionary(locale);
  const teacher = dict.dashboard.teacher;

  return (
    <DashboardShell
      locale={locale}
      dict={dict}
      roleLabel={teacher.role}
      userName={session.user.name ?? session.user.email ?? teacher.role}
      role="teacher"
      labels={teacher.nav}>
      {children}
    </DashboardShell>
  );
}
