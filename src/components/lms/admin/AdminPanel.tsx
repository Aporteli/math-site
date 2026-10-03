'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  BookOpen,
  CreditCard,
  Database,
  Flag,
  FolderTree,
  Globe2,
  Languages,
  LayoutDashboard,
  Library,
  School,
  Server,
  Shield,
  Sparkles,
  Terminal,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { TaxonomyManager } from '@/components/lms/admin/components/TaxonomyManager';
import { PageHero } from '@/components/ui/PageHero';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import type { TaxonomyNodeDto } from '@/lib/math/problems/taxonomy-shared';
import { CoursesManager } from './components/CoursesManager';
import { ComingSoonCard } from './components/ComingSoonCard';
import { AdminTerminal } from './components/AdminTerminal';
import { ServerManager } from '@/components/ServerManager';
import { LiveKitDiagnostics } from './components/LiveKitDiagnostics';

type AdminCopy = Dictionary['dashboard']['teacher']['admin'];
type TaxonomyCopy = Dictionary['dashboard']['teacher']['taxonomy'];

export type AdminSectionId = keyof AdminCopy['sections'] | 'courses' | 'server' | 'diagnostics' | 'terminal';

const SECTION_ICONS: Record<AdminSectionId, LucideIcon> = {
  overview: LayoutDashboard,
  taxonomy: FolderTree,
  courses: BookOpen,
  users: Users,
  roles: Shield,
  ai: Bot,
  prompts: Sparkles,
  content: Library,
  storage: Database,
  lms: School,
  analytics: BarChart3,
  i18n: Languages,
  locales: Globe2,
  billing: CreditCard,
  featureFlags: Flag,
  system: Wrench,
  server: Server,
  diagnostics: Activity,
  terminal: Terminal,
};

function visibleSections(canUseTerminal: boolean): AdminSectionId[] {
  const sections: AdminSectionId[] = ['taxonomy', 'courses', 'server', 'diagnostics'];
  if (canUseTerminal) sections.push('terminal');
  return sections;
}

export function AdminPanel({
  locale,
  copy,
  taxonomyCopy,
  taxonomyNodes,
  canUseTerminal,
}: {
  locale: Locale;
  copy: AdminCopy;
  taxonomyCopy: TaxonomyCopy;
  taxonomyNodes: TaxonomyNodeDto[];
  canUseTerminal: boolean;
}) {
  const [section, setSection] = useState<AdminSectionId>('overview');
  const sections = useMemo(() => visibleSections(canUseTerminal), [canUseTerminal]);

  const getActiveSectionInfo = (id: AdminSectionId) => {
    if (id === 'courses') {
      return {
        title: 'ჯგუფები',
        description: 'მართეთ კლასები, დაამატეთ ახალი, მიამაგრეთ მასწავლებელი ან მართეთ მოსწავლეები',
      };
    }

    if (id === 'server') {
      return {
        title: 'სერვერი',
        description: 'LiveKit ვიდეოგაკვეთილის სერვერის მდგომარეობის მონიტორინგი და მართვა',
      };
    }

    if (id === 'diagnostics') {
      return {
        title: 'დიაგნოსტიკა',
        description: 'LiveKit კავშირის რეალური ტელემეტრია და სესიის ისტორია',
      };
    }

    if (id === 'terminal') {
      return {
        title: 'ტერმინალი',
        description: 'უსაფრთხო დიაგნოსტიკური ბრძანებები VPS-ზე',
      };
    }

    return copy.sections[id as keyof AdminCopy['sections']];
  };

  const active = useMemo(() => getActiveSectionInfo(section), [copy, section]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[2000px] ">
      <PageHero icon={Shield} eyebrow={copy.eyebrow} title={copy.title} description={copy.subtitle} />

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] mt-4">
        <aside className="h-fit overflow-hidden rounded-box border border-hairline bg-main shadow-sm lg:sticky lg:top-4">
          <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
          <p className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">{copy.sectionsNav}</p>

          <nav aria-label={copy.sectionsNav} className="space-y-0.5 px-2 pb-2">
            {sections.map((id) => {
              const Icon = SECTION_ICONS[id];
              const item = getActiveSectionInfo(id);
              const selected = section === id;

              return (
                <button
                  key={id}
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  className={[
                    'flex w-full cursor-pointer items-center gap-2 rounded-box px-3 py-2.5 text-left text-[13px] font-bold transition-all duration-300',
                    selected
                      ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12),0_6px_18px_rgba(0,0,0,0.08)]'
                      : 'text-mainText hover:bg-sectionHeader',
                  ].join(' ')}
                  onClick={() => setSection(id)}>
                  <Icon className="size-4 shrink-0" aria-hidden="true" />

                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 space-y-4">
          {section === 'overview' ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-box border border-hairline bg-sectionHeader p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-ink">{active.title}</h2>

                <p className="mt-1 text-sm text-body">{active.description}</p>

                <p className="mt-4 text-sm text-muted">{copy.overviewHint}</p>
              </div>

              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {sections.map((id) => {
                  const Icon = SECTION_ICONS[id];
                  const item = getActiveSectionInfo(id);

                  return (
                    <li key={id}>
                      <button
                        type="button"
                        className="flex h-full w-full cursor-pointer flex-col gap-2 rounded-box border border-hairline bg-main p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-navy/30 hover:shadow-md"
                        onClick={() => setSection(id)}>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-9 items-center justify-center  text-brass-strong/70">
                            <Icon className="size-7" aria-hidden="true" strokeWidth={2.5} />
                          </span>

                          <span className="text-sm font-bold text-ink">{item.title}</span>
                        </div>
                        <span className="text-xs text-body">{item.description}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {section === 'taxonomy' ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-box border border-hairline bg-sectionHeader p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-ink">{active.title}</h2>

                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>

              <div className="overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm sm:p-5">
                <TaxonomyManager locale={locale} copy={taxonomyCopy} initialNodes={taxonomyNodes} embedded />
              </div>
            </div>
          ) : null}

          {section === 'courses' ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-box border border-hairline bg-sectionHeader p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-ink">{active.title}</h2>

                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>

              <div className="overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm sm:p-5">
                <CoursesManager />
              </div>
            </div>
          ) : null}

          {section === 'server' ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-box border border-hairline bg-sectionHeader p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-ink">{active.title}</h2>

                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>

              <ServerManager locale={locale} canManageHost={canUseTerminal} />
            </div>
          ) : null}

          {section === 'diagnostics' ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-box border border-hairline bg-sectionHeader p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-ink">{active.title}</h2>

                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>

              <LiveKitDiagnostics />
            </div>
          ) : null}

          {section === 'terminal' && canUseTerminal ? (
            <div className="space-y-4">
              <div className="overflow-hidden rounded-box border border-hairline bg-sectionHeader p-5 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-ink">{active.title}</h2>

                <p className="mt-1 text-sm text-body">{active.description}</p>
              </div>

              <AdminTerminal locale={locale} />
            </div>
          ) : null}

          {section !== 'overview' &&
          section !== 'taxonomy' &&
          section !== 'courses' &&
          section !== 'server' &&
          section !== 'diagnostics' &&
          section !== 'terminal' ? (
            <ComingSoonCard
              title={active.title}
              description={active.description}
              soon={copy.comingSoon}
              hint={copy.comingSoonHint}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
