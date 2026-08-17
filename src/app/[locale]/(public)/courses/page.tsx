import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CoursesHub } from "@/components/public/courses-hub";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type CoursesPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: CoursesPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const { coursesPage } = getDictionary(locale);

  return {
    title: coursesPage.meta.title,
    description: coursesPage.meta.description,
  };
}

export default async function CoursesPage({ params }: CoursesPageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);

  return <CoursesHub locale={locale} copy={dict.coursesPage} />;
}
