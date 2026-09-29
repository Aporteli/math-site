import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalculatorHub } from "@/components/tools/CalculatorHub";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type ToolsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: ToolsPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { toolsPage } = getDictionary(locale);

  return {
    title: toolsPage.meta.title,
    description: toolsPage.meta.description,
  };
}

export default async function ToolsPage({ params }: ToolsPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return <CalculatorHub locale={locale} dict={dict} />;
}
