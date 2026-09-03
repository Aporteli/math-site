import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogToolShell } from '@/components/tools/CatalogToolShell';
import { GraphingToolLoader } from '@/components/tools/graphing/GraphingLoader';
import { QuadraticLoader } from '@/components/tools/quadratic/QuadraticLoader';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { MathStepSolver } from '@/components/tools/math-step-solver/MathStepSolver';
import { catalogToolStaticParams, getCatalogToolByPath } from '@/lib/tools';

type ToolPageProps = {
  params: Promise<{ locale: string; tools: string[] }>;
};

export function generateStaticParams() {
  return catalogToolStaticParams();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { locale, tools } = await params;
  if (!isLocale(locale)) return {};

  const tool = getCatalogToolByPath(tools.join('/'));
  if (!tool) return {};

  const item = getDictionary(locale).toolsPage.items[tool.id];
  return {
    title: item.title,
    description: item.description,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { locale, tools } = await params;
  if (!isLocale(locale)) notFound();

  const tool = getCatalogToolByPath(tools.join('/'));
  if (!tool) notFound();

  const dict = getDictionary(locale);
  const item = dict.toolsPage.items[tool.id];
  const sectionTitle = dict.toolsPage.sections[tool.sectionId].title;

  if (tool.id === 'graphing') {
    return (
      <GraphingToolLoader locale={locale} copy={dict.graphingTool} title={item.title} description={item.description} />
    );
  }

  if (tool.id === 'quadratic-equations') {
    return (
      <QuadraticLoader locale={locale} copy={dict.equations} title={item.title} description={item.description} />
    );
  }

  if (tool.id === 'animations') {
    return (
      <MathStepSolver
      // locale={locale}
      // copy={dict.equations}
      // title={item.title}
      // description={item.description}
      />
    );
  }

  return (
    <CatalogToolShell locale={locale} tool={tool} item={item} sectionTitle={sectionTitle} copy={dict.toolsPage.tool} />
  );
}
