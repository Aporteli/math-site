import { notFound } from 'next/navigation';
import HomeLandPage from '@/components/public/HomePage';
import { isLocale, type Locale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale as Locale);

  return (
    <>
      <HomeLandPage locale={locale} dict={dict} />
    </>
  );
}
