import { CalculatorHub } from '@/components/tools/CalculatorHub';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getCatalogToolByPath } from '@/lib/tools';
import { notFound } from 'next/navigation';

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; toolSlug?: string[] }>;
}) {
  const { locale, toolSlug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const path = (toolSlug ?? []).join('/');
  const tool = path ? getCatalogToolByPath(path) : undefined;
  return <CalculatorHub locale={locale} dict={dict} initialId={tool?.id ?? toolSlug?.[0]} />;
}