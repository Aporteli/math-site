import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AdminPanel } from '@/components/lms/admin/AdminPanel';
import { teacherPageMetadata } from '@/components/layout/DashboardPage';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { requireRole } from '@/lib/auth/session';
import { ensureDefaultTaxonomy } from '@/lib/math/problems/taxonomy';

type PageProps = { params: Promise<{ locale: string }> };

export const dynamic = 'force-dynamic';

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata('admin', params);
}

export default async function TeacherAdminPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await requireRole(locale, ['TEACHER', 'ADMIN']);
  const dict = getDictionary(locale);
  const nodes = await ensureDefaultTaxonomy();

  return (
    <AdminPanel
      locale={locale}
      copy={dict.dashboard.teacher.admin}
      taxonomyCopy={dict.dashboard.teacher.taxonomy}
      taxonomyNodes={nodes}
    />
  );
}
