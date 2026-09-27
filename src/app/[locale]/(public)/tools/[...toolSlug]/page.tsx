import { CalculatorHub } from '@/components/tools/CalculatorHub';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  return <CalculatorHub locale={locale} dict={dict} />;
}