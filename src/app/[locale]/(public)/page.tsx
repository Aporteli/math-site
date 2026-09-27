import { notFound } from 'next/navigation';
import { WorkspaceHub } from '@/components/public/WorkspaceHub';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <>
      <WorkspaceHub locale={locale} copy={dict.home} tools={dict.toolsPage.items} />
    </>
  );
}
