import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProblemBankWorkspace } from "@/components/lms/problem-bank/problem-bank-workspace";
import { teacherPageMetadata } from "@/components/lms/dashboard-page";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";
import { ensureDbUser } from "@/lib/auth/ensure-user";
import {
  SEED_PROBLEM_BANK,
  HIDDEN_SEED_COOKIE,
  parseHiddenSeedIds,
  withoutHiddenSeeds,
} from "@/lib/math/problems";
import {
  loadDraftLessonSet,
  loadTeacherProblems,
} from "@/lib/math/problems/persist";
import { loadTeacherFamilies } from "@/lib/math/problems/family-persist";

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
  const hiddenSeeds = parseHiddenSeedIds(
    (await cookies()).get(HIDDEN_SEED_COOKIE)?.value,
  );
  const catalog = withoutHiddenSeeds(SEED_PROBLEM_BANK, hiddenSeeds);

  let saved = catalog;
  let lessonSetIds: string[] = [];
  let families: Awaited<ReturnType<typeof loadTeacherFamilies>> = [];

  if (session?.user?.email) {
    try {
      const user = await ensureDbUser(session.user);
      const [problems, draftIds] = await Promise.all([
        loadTeacherProblems(user.id),
        loadDraftLessonSet(user.id),
      ]);
      saved = [...problems, ...catalog];
      lessonSetIds = draftIds;
      try {
        families = await loadTeacherFamilies(user.id);
      } catch (error) {
        console.error("Failed to load teacher families", error);
      }
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
      initialFamilies={families}
    />
  );
}
