import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ProblemBankWorkspace } from "@/components/lms/problem-bank/problem-bank-workspace";
import { teacherPageMetadata } from "@/components/lms/dashboard-page";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import { getSession } from "@/lib/auth/session";
import { ensureDbUser } from "@/lib/auth/ensure-user";
import {
  loadDraftLessonSet,
  loadLabWorkspace,
} from "@/lib/math/problems/persist";
import { loadTeacherFamilies } from "@/lib/math/problems/family-persist";
import type { BankProblem } from "@/lib/math/problems";
import { canUseAdminSlashPrompts } from "@/lib/math/problems/slash-prompts-access";
import { ensureDefaultTaxonomy } from "@/lib/math/problems/taxonomy";

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

  let lessonSetIds: string[] = [];
  let labProblems: BankProblem[] = [];
  let labIds: string[] = [];
  let families: Awaited<ReturnType<typeof loadTeacherFamilies>> = [];
  let taxonomyNodes: Awaited<ReturnType<typeof ensureDefaultTaxonomy>> = [];

  if (session?.user?.email) {
    try {
      const user = await ensureDbUser(session.user);
      const [draftIds, lab, loadedFamilies, taxonomy] = await Promise.all([
        loadDraftLessonSet(user.id),
        loadLabWorkspace(user.id),
        loadTeacherFamilies(user.id).catch((error) => {
          console.error("Failed to load teacher families", error);
          return [] as Awaited<ReturnType<typeof loadTeacherFamilies>>;
        }),
        ensureDefaultTaxonomy().catch((error) => {
          console.error("Failed to load taxonomy", error);
          return [] as Awaited<ReturnType<typeof ensureDefaultTaxonomy>>;
        }),
      ]);
      lessonSetIds = draftIds;
      labProblems = lab.problems;
      labIds = lab.labIds;
      families = loadedFamilies;
      taxonomyNodes = taxonomy;
    } catch (error) {
      console.error("Failed to load teacher lab", error);
    }
  } else {
    try {
      taxonomyNodes = await ensureDefaultTaxonomy();
    } catch {
      taxonomyNodes = [];
    }
  }

  const slash = canUseAdminSlashPrompts(session?.user);

  return (
    <ProblemBankWorkspace
      locale={locale}
      title={page.title}
      subtitle={page.subtitle}
      copy={dict.dashboard.teacher.problemBank}
      initialBank={labProblems}
      initialLessonSetIds={lessonSetIds}
      initialLabIds={labIds}
      initialFamilies={families}
      hydrateSavedBank={false}
      visibleToolIds={["generate", "chat", "import", "families", "variants"]}
      initialPanel={null}
      showCreateCard
      showSaveToLab
      enableSlashPrompts={slash.enabled}
      slashPromptsUserId={slash.storageKey}
      taxonomyNodes={taxonomyNodes}
    />
  );
}
