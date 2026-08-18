import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProblemBankWorkspace } from "@/components/lms/problem-bank/problem-bank-workspace";
import { teacherPageMetadata } from "@/components/lms/dashboard-page";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";
import { ensureDbUser } from "@/lib/auth/ensure-user";
import { SEED_PROBLEM_BANK } from "@/lib/math/problems";
import {
  loadDraftLessonSet,
  loadTeacherProblems,
} from "@/lib/math/problems/persist";

type PageProps = { params: Promise<{ locale: string }> };

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata("lab", params);
}

export default async function TeacherLabPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await connection();

  const dict = getDictionary(locale);
  const page = dict.dashboard.teacher.pages.lab;
  const session = await getSession();

  let saved = SEED_PROBLEM_BANK;
  let lessonSetIds: string[] = [];

  if (session?.user?.email) {
    try {
      const user = await ensureDbUser(session.user);
      const problems = await loadTeacherProblems(user.id);
      saved = [...problems, ...SEED_PROBLEM_BANK];
      lessonSetIds = await loadDraftLessonSet(user.id);
    } catch (error) {
      console.error("Failed to load teacher problem bank", error);
    }
  }

  return (
    <ProblemBankWorkspace
      locale={locale}
      title={page.title}
      subtitle={page.subtitle}
      copy={dict.dashboard.teacher.problemBank}
      initialBank={saved}
      initialLessonSetIds={lessonSetIds}
    />
  );
}
