'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, Search } from 'lucide-react';
import type { Dictionary } from '@/i18n/types';
import type { Locale } from '@/i18n/config';
import { PageHero } from '@/components/ui/PageHero';
import { TOOL_SECTIONS, type ToolItemId, type ToolSectionId } from '@/lib/tools';

const LogarithmLoader = dynamic(() => import('./logarithms/LogarithmLoader').then((m) => m.LogarithmLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const ExponentLoader = dynamic(() => import('./exponents/ExponentLoader').then((m) => m.ExponentLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const UnitCircleLoader = dynamic(() => import('./unit-circle/UnitCircleLoader').then((m) => m.UnitCircleLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const GeometryLoader = dynamic(() => import('./geometry/GeometryLoader').then((m) => m.GeometryLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const VectorLoader = dynamic(() => import('./vectors/VectorLoader').then((m) => m.VectorLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const CombinatoricsLoader = dynamic(() => import('./combinatorics/CombinatoricsLoader').then((m) => m.CombinatoricsLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const SequenceLoader = dynamic(() => import('./sequences/SequenceLoader').then((m) => m.SequenceLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const RadicalLoader = dynamic(() => import('./radicals/RadicalLoader').then((m) => m.RadicalLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const RearrangeLoader = dynamic(() => import('./rearrange/RearrangeLoader').then((m) => m.RearrangeLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const QuadraticLoader = dynamic(() => import('./quadratic/QuadraticLoader').then((m) => m.QuadraticLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const SystemSolverLoader = dynamic(() => import('./systems/SystemSolverLoader').then((m) => m.SystemSolverLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const PolynomialLoader = dynamic(() => import('./polynomial/PolynomialLoader').then((m) => m.PolynomialLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const InequalityLoader = dynamic(() => import('./inequalities/InequalityLoader').then((m) => m.InequalityLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const TriangleLoader = dynamic(() => import('./triangle/TriangleLoader').then((m) => m.TriangleLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const FractionToolLoader = dynamic(() => import('./fraction/FractionLoader').then((m) => m.FractionToolLoader), {
  ssr: false,
  loading: () => <Loading />,
});
const GraphingToolLoader = dynamic(() => import('./graphing/GraphingLoader').then((m) => m.GraphingToolLoader), {
  ssr: false,
  loading: () => <Loading />,
});

type ToolId =
  | 'logarithms'
  | 'exponents'
  | 'unitCircle'
  | 'geometry'
  | 'vectors'
  | 'combinatorics'
  | 'sequences'
  | 'radicals'
  | 'rearrange'
  | 'quadratic-equations'
  | 'systemSolver'
  | 'polynomials'
  | 'inequalities'
  | 'triangle'
  | 'fractions'
  | 'graphing';

const IMPLEMENTED: ToolId[] = [
  'logarithms',
  'exponents',
  'unitCircle',
  'geometry',
  'vectors',
  'combinatorics',
  'sequences',
  'radicals',
  'rearrange',
  'quadratic-equations',
  'systemSolver',
  'polynomials',
  'inequalities',
  'triangle',
  'fractions',
  'graphing',
];

type FilterId = 'all' | ToolSectionId;

function isImplemented(id: string): id is ToolId {
  return (IMPLEMENTED as string[]).includes(id);
}

function sectionForTool(id: string) {
  return TOOL_SECTIONS.find((section) => section.tools.some((tool) => tool.id === id));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`max-w-full rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 sm:px-4 ${
        active
          ? 'border-navy bg-navy text-white shadow-sm'
          : 'border-hairline bg-white text-body hover:border-navy/30 hover:text-ink'
      }`}>
      {children}
    </button>
  );
}

export function CalculatorHub({
  locale,
  dict,
  initialId,
}: {
  locale: Locale;
  dict: Dictionary;
  initialId?: string;
}) {
  const copy = dict.toolsPage;
  const [activeId, setActiveId] = useState<ToolItemId>(
    initialId && initialId in dict.toolsPage.items ? (initialId as ToolItemId) : 'logarithms',
  );
  const [filter, setFilter] = useState<FilterId>('calculators');
  const [query, setQuery] = useState('');

  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;
      const section = TOOL_SECTIONS.find((entry) => entry.id === hash);
      if (section) {
        setFilter(section.id);
        return;
      }
      const owner = sectionForTool(hash);
      if (owner) {
        setFilter(owner.id);
        setActiveId(hash as ToolItemId);
      }
    }
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  function switchTo(id: ToolItemId) {
    const owner = sectionForTool(id);
    if (owner) setFilter(owner.id);
    setActiveId(id);
    window.history.replaceState(null, '', `#${id}`);
  }

  const normalizedQuery = normalize(query);
  const matchedTools = useMemo(() => {
    const sections = filter === 'all' ? TOOL_SECTIONS : TOOL_SECTIONS.filter((section) => section.id === filter);
    return sections.flatMap((section) =>
      section.tools.filter((tool) => {
        if (!normalizedQuery) return true;
        const item = copy.items[tool.id];
        if (!item) return false;
        return normalize(`${item.title} ${item.description} ${item.badge}`).includes(normalizedQuery);
      }),
    );
  }, [copy.items, filter, normalizedQuery]);

  const subcategoryTools = filter === 'all' && !normalizedQuery ? [] : matchedTools;
  const showSubcategories = filter !== 'all' || normalizedQuery.length > 0;
  const activeItem = copy.items[activeId];
  const activeImplemented = isImplemented(activeId);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1720px] space-y-6 px-4 py-8 text-ink sm:px-6 lg:px-8">
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
                className="w-full min-w-0 appearance-none rounded-2xl border border-hairline bg-white py-3 pr-4 pl-12 text-base text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:ring-2 focus:ring-navy/15 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
            </label>
            <p className="text-sm text-muted" aria-live="polite">
              {copy.hero.resultCount.replace('{count}', String(matchedTools.length))}
            </p>
          </>
        }
        footer={
          <div className="space-y-3">
            <nav aria-label={copy.filters.aria}>
              <div className="flex flex-wrap gap-2">
                {TOOL_SECTIONS.map((section) => (
                  <FilterPill
                    key={section.id}
                    active={filter === section.id}
                    onClick={() => setFilter(section.id)}>
                    {copy.sections[section.id].filter}
                  </FilterPill>
                ))}
              </div>
            </nav>
            {showSubcategories ? (
              subcategoryTools.length === 0 ? (
                <p className="text-sm font-medium text-body">{copy.hero.empty}</p>
              ) : (
                <div className="flex flex-wrap gap-2 border-t border-brass/40 pt-3">
                  {subcategoryTools.map((tool) => {
                    const item = copy.items[tool.id];
                    if (!item) return null;
                    const Icon = tool.icon;
                    const active = tool.id === activeId;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        onClick={() => switchTo(tool.id)}
                        aria-current={active ? 'page' : undefined}
                        className={
                          'inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ' +
                          (active
                            ? 'border-navy bg-navy text-white shadow-sm'
                            : 'border-hairline bg-white text-body hover:border-navy/30 hover:text-ink')
                        }>
                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              )
            ) : null}
          </div>
        }
      />

      {/* ── Active calculator ── */}
      <div>
        {activeId === 'logarithms' && (
          <LogarithmLoader
            locale={locale}
            copy={dict.logarithmTool}
            title={copy.items.logarithms.title}
            description={copy.items.logarithms.description}
          />
        )}
        {activeId === 'exponents' && (
          <ExponentLoader
            locale={locale}
            copy={dict.exponentTool}
            title={copy.items.exponents.title}
            description={copy.items.exponents.description}
          />
        )}
        {activeId === 'unitCircle' && (
          <UnitCircleLoader
            locale={locale}
            copy={dict.unitCircleTool}
            title={copy.items.unitCircle.title}
            description={copy.items.unitCircle.description}
          />
        )}
        {activeId === 'geometry' && (
          <GeometryLoader
            locale={locale}
            copy={dict.geometryTool}
            title={copy.items.geometry.title}
            description={copy.items.geometry.description}
          />
        )}
        {activeId === 'vectors' && (
          <VectorLoader
            locale={locale}
            copy={dict.vectorTool}
            title={copy.items.vectors.title}
            description={copy.items.vectors.description}
          />
        )}
        {activeId === 'combinatorics' && (
          <CombinatoricsLoader
            locale={locale}
            copy={dict.combinatoricsTool}
            title={copy.items.combinatorics.title}
            description={copy.items.combinatorics.description}
          />
        )}
        {activeId === 'sequences' && (
          <SequenceLoader
            locale={locale}
            copy={dict.sequencesTool}
            title={copy.items.sequences.title}
            description={copy.items.sequences.description}
          />
        )}
        {activeId === 'radicals' && (
          <RadicalLoader
            locale={locale}
            copy={dict.radicalTool}
            title={copy.items.radicals.title}
            description={copy.items.radicals.description}
          />
        )}
        {activeId === 'rearrange' && (
          <RearrangeLoader
            locale={locale}
            copy={dict.rearrangeTool}
            title={copy.items.rearrange.title}
            description={copy.items.rearrange.description}
          />
        )}
        {activeId === 'quadratic-equations' && (
          <QuadraticLoader
            locale={locale}
            copy={dict.equations}
            title={copy.items['quadratic-equations'].title}
            description={copy.items['quadratic-equations'].description}
          />
        )}
        {activeId === 'systemSolver' && (
          <SystemSolverLoader
            locale={locale}
            copy={dict.systemSolverTool}
            title={copy.items.systemSolver.title}
            description={copy.items.systemSolver.description}
          />
        )}
        {activeId === 'polynomials' && (
          <PolynomialLoader
            locale={locale}
            copy={dict.polynomialTool}
            title={copy.items.polynomials.title}
            description={copy.items.polynomials.description}
          />
        )}
        {activeId === 'inequalities' && (
          <InequalityLoader
            locale={locale}
            copy={dict.inequalityTool}
            title={copy.items.inequalities.title}
            description={copy.items.inequalities.description}
          />
        )}
        {activeId === 'triangle' && (
          <TriangleLoader
            locale={locale}
            copy={dict.triangleTool}
            title={copy.items.triangle.title}
            description={copy.items.triangle.description}
          />
        )}
        {activeId === 'fractions' && (
          <FractionToolLoader
            locale={locale}
            copy={dict.fractionTool}
            title={copy.items.fractions.title}
            description={copy.items.fractions.description}
          />
        )}
        {activeId === 'graphing' && (
          <GraphingToolLoader
            locale={locale}
            copy={dict.graphingTool}
            title={copy.items.graphing.title}
            description={copy.items.graphing.description}
          />
        )}
        {!activeImplemented && activeItem ? (
          <section className="rounded-3xl border border-hairline bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight text-ink">{activeItem.title}</h2>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-body">{activeItem.description}</p>
            <h3 className="mt-6 text-lg font-semibold text-ink">{copy.tool.comingSoon}</h3>
            <p className="mt-2 max-w-3xl text-base leading-relaxed text-body">{copy.tool.comingSoonText}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Loading() {
  return <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />;
}
