import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProblemBankWorkspace } from "@/components/lms/problem-bank/problem-bank-workspace";
import { teacherPageMetadata } from "@/components/lms/dashboard-page";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";

type PageProps = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("problems", params);
}

export default async function TeacherProblemsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const page = dict.dashboard.teacher.pages.problems;

  return (
    <ProblemBankWorkspace
      locale={locale}
      title={page.title}
      subtitle={page.subtitle}
      copy={dict.dashboard.teacher.problemBank}
    />
  );
}
