import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { ProblemBankWorkspace } from '@/components/lms/problem-bank/problem-bank-workspace';
import { teacherPageMetadata } from '@/components/lms/dashboard-page';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { getSession } from '@/lib/auth/session';
import { ensureDbUser } from '@/lib/auth/ensure-user';
import { SEED_PROBLEM_BANK, HIDDEN_SEED_COOKIE, parseHiddenSeedIds, withoutHiddenSeeds } from '@/lib/math/problems';
import { loadDraftLessonSet, loadTeacherProblems } from '@/lib/math/problems/persist';
import { canUseAdminSlashPrompts } from '@/lib/math/problems/slash-prompts-access';
import { ensureDefaultTaxonomy } from '@/lib/math/problems/taxonomy';

type PageProps = { params: Promise<{ locale: string }> };

export const dynamic = 'force-dynamic';

// Keep AI Server Actions (generateDiverseProblemsAction / teacherAiChatAction)
// within the Vercel function duration ceiling instead of the default 10s.
export const maxDuration = 300;

export function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return teacherPageMetadata('problems', params);
}

export default async function TeacherProblemsPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  await connection();

  const dict = getDictionary(locale);
  const page = dict.dashboard.teacher.pages.problems;
  const session = await getSession();
  const hiddenSeeds = parseHiddenSeedIds((await cookies()).get(HIDDEN_SEED_COOKIE)?.value);
  const catalog = withoutHiddenSeeds(SEED_PROBLEM_BANK, hiddenSeeds);

  let saved = catalog;
  let lessonSetIds: string[] = [];
  let taxonomyNodes: Awaited<ReturnType<typeof ensureDefaultTaxonomy>> = [];

  if (session?.user?.email) {
    try {
      const user = await ensureDbUser(session.user);
      const [problems, draftIds, taxonomy] = await Promise.all([
        loadTeacherProblems(user.id),
        loadDraftLessonSet(user.id),
        ensureDefaultTaxonomy().catch((error) => {
          console.error('Failed to load taxonomy', error);
          return [] as Awaited<ReturnType<typeof ensureDefaultTaxonomy>>;
        }),
      ]);
      taxonomyNodes = taxonomy;
      saved = [...problems, ...catalog];
      lessonSetIds = draftIds;
    } catch (error) {
      console.error('Failed to load teacher problem bank', error);
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
      initialBank={saved}
      initialLessonSetIds={lessonSetIds}
      hydrateSavedBank
      visibleToolIds={[ 'chat', 'import', 'variants']}
      initialPanel={null}
      showGenerateVariants={false}
      showSendToLab
      enableSlashPrompts={slash.enabled}
      slashPromptsUserId={slash.storageKey}
      taxonomyNodes={taxonomyNodes}
    />
  );
}
