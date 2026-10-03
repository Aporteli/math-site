'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, LayoutGrid, Search } from 'lucide-react';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import { PageHero, SectionHeading } from '@/components/ui/PageHero';
import { badgeToneClass, TOOL_SECTIONS, type ToolItem, type ToolSectionId } from '@/lib/teacher-tools';

type ToolsCopy = Dictionary['toolsPage'];
type FilterId = 'all' | ToolSectionId;

interface ToolsHubProps {
  locale: Locale;
  copy: ToolsCopy;
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function itemMatches(item: ToolsCopy['items'][ToolItem['id']], query: string) {
  if (!query) return true;
  return normalize(`${item.title} ${item.description} ${item.badge}`).includes(query);
}

function sectionMatches(section: ToolsCopy['sections'][ToolSectionId], query: string) {
  if (!query) return false;
  return normalize(`${section.title} ${section.subtitle} ${section.filter}`).includes(query);
}

function ToolCard({
  locale,
  tool,
  item,
  openLabel,
}: {
  locale: Locale;
  tool: ToolItem;
  item: ToolsCopy['items'][ToolItem['id']];
  openLabel: string;
}) {
  const Icon = tool.icon;
  const tone = badgeToneClass[tool.badgeColor];

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-box border border-hairline bg-main shadow-sm transition-all before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass hover:shadow-md">
      <Link href={localePath(locale, tool.href)} className="flex h-full min-w-0 flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-box ${tone.chip}`}>
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span
            className={`min-w-0 max-w-[11rem] truncate rounded-box px-2.5 py-1 text-xs font-semibold leading-none ${tone.badge}`}>
            {item.badge}
          </span>
        </div>
        <h3 className="mt-4 break-words text-lg font-bold leading-snug text-ink">{item.title}</h3>
        <p className="mt-2 min-h-0 flex-1 break-words text-sm leading-relaxed text-body">{item.description}</p>
        <span className="mt-5 inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-box bg-[#465D73] px-3 py-2.5 text-center text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 group-hover:bg-[#526C85] group-hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)]">
          {openLabel}
          <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </Link>
    </article>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`max-w-full rounded-box border px-3.5 py-2 text-sm font-medium transition-colors duration-200 sm:px-4 ${
        active
          ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
          : 'border-hairline bg-main text-mainText hover:bg-sectionHeader'
      }`}>
      {children}
    </button>
  );
}

export function ToolsHub({ locale, copy }: ToolsHubProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const normalizedQuery = normalize(query);

  const visibleSections = TOOL_SECTIONS.filter((section) => filter === 'all' || section.id === filter)
    .map((section) => {
      const sectionCopy = copy.sections[section.id];
      const tools = sectionMatches(sectionCopy, normalizedQuery)
        ? section.tools
        : section.tools.filter((tool) => itemMatches(copy.items[tool.id], normalizedQuery));

      return { section, sectionCopy, tools };
    })
    .filter(({ tools }) => tools.length > 0);

  const visibleCount = visibleSections.reduce((total, { tools }) => total + tools.length, 0);

  return (
    <div className="mx-auto w-full min-w-0 max-w-[2000px]">
    <div className="mx-auto w-full min-w-0 max-w-[2000px] ">
    <PageHero
          icon={LayoutGrid}
          eyebrow={copy.hero.eyebrow}
          title={copy.hero.title}
          description={copy.hero.subtitle}
          aside={
            <>
              <label className="relative block">
                <span className="sr-only">{copy.hero.searchLabel}</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.hero.searchPlaceholder}
                  autoComplete="off"
                  className="w-full min-w-0 appearance-none rounded-box border border-hairline bg-searchInput py-3 pr-4 pl-12 text-base text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
              </label>
              <p className="text-sm text-muted" aria-live="polite">
                {copy.hero.resultCount.replace('{count}', String(visibleCount))}
              </p>
            </>
          }
          footer={
            <nav aria-label={copy.filters.aria}>
              <div className="flex flex-wrap gap-2">
                <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
                  {copy.filters.all}
                </FilterPill>
                {TOOL_SECTIONS.map((section) => (
                  <FilterPill key={section.id} active={filter === section.id} onClick={() => setFilter(section.id)}>
                    {copy.sections[section.id].filter}
                  </FilterPill>
                ))}
              </div>
            </nav>
          }
        />

        <div className="mt-12">
          {visibleSections.length === 0 ? (
            <p className="relative overflow-hidden rounded-box border border-hairline bg-main px-6 py-16 text-center text-body shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass">
              {copy.hero.empty}
            </p>
          ) : (
            <div className="space-y-14 sm:space-y-16">
              {visibleSections.map(({ section, sectionCopy, tools }) => (
                <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
                  <SectionHeading
                    id={`${section.id}-title`}
                    title={sectionCopy.title}
                    description={sectionCopy.subtitle}
                  />
                  <ul
                    className={
                      section.id === 'advanced' ||
                      section.id === 'applied' ||
                      section.id === 'exam' ||
                      section.id === 'formulas' ||
                      section.id === 'widgets' ||
                      section.id === 'games'
                        ? 'mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                        : 'mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
                    }>
                    {tools.map((tool) => (
                      <li key={tool.id} className="min-w-0">
                        <ToolCard locale={locale} tool={tool} item={copy.items[tool.id]} openLabel={copy.openTool} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
