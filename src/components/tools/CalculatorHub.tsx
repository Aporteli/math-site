'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  Calculator,
  ChevronDown,
  Divide,
  GitBranch,
  LineChart,
  Percent,
  Sigma,
  SquareFunction,
  Triangle as TriangleIcon,
  Grid3x3,
} from 'lucide-react';
import type { Dictionary } from '@/i18n/types';
import type { Locale } from '@/i18n/config';

const LogarithmLoader = dynamic(() => import('./logarithms/LogarithmLoader').then((m) => m.LogarithmLoader), {
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
  | 'quadratic-equations'
  | 'systemSolver'
  | 'polynomials'
  | 'inequalities'
  | 'triangle'
  | 'fractions'
  | 'graphing';

const TABS: { id: ToolId; icon: typeof Calculator }[] = [
  { id: 'logarithms', icon: Sigma },
  { id: 'quadratic-equations', icon: SquareFunction },
  { id: 'systemSolver', icon: Grid3x3 },
  { id: 'polynomials', icon: Divide },
  { id: 'inequalities', icon: GitBranch },
  { id: 'triangle', icon: TriangleIcon },
  { id: 'fractions', icon: Percent },
  { id: 'graphing', icon: LineChart },
];

export function CalculatorHub({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  const [activeId, setActiveId] = useState<ToolId>('logarithms');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1) as ToolId;
    if (TABS.some((t) => t.id === hash)) setActiveId(hash);
    function onHash() {
      const h = window.location.hash.slice(1) as ToolId;
      if (TABS.some((t) => t.id === h)) setActiveId(h);
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    function onClick() {
      setDropdownOpen(false);
    }
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [dropdownOpen]);

  function switchTo(id: ToolId) {
    setActiveId(id);
    setDropdownOpen(false);
    window.history.replaceState(null, '', `#${id}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const items = dict.toolsPage.items;
  const activeTab = TABS.find((t) => t.id === activeId);
  const ActiveIcon = activeTab?.icon ?? Calculator;
  const activeItem = activeTab ? items[activeTab.id] : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-ink">
      {/* Header */}
      <header className="flex items-center gap-2">
        <Calculator className="size-5 text-navy dark:text-sky-400" aria-hidden="true" />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">კალკულატორები</h1>
      </header>

      {/* ── Desktop: Tabs (wrap, full height) ── */}
      <nav
        aria-label="კალკულატორები"
        className="hidden rounded-2xl border border-hairline bg-white p-2 shadow-sm dark:bg-slate-900/60 dark:border-slate-800 sm:block">
        <div className="flex flex-wrap items-center gap-1.5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const item = items[t.id];
            if (!item) return null;
            const active = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => switchTo(t.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ' +
                  (active
                    ? 'bg-navy text-white shadow-sm dark:bg-sky-600'
                    : 'text-body hover:bg-navy-tint hover:text-navy dark:hover:bg-slate-800 dark:hover:text-sky-400')
                }>
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile: Dropdown ── */}
      <div className="relative sm:hidden" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-navy/30 dark:bg-slate-900/60 dark:border-slate-800">
          <span className="flex min-w-0 items-center gap-2">
            <ActiveIcon className="size-4 shrink-0 text-navy dark:text-sky-400" aria-hidden="true" />
            <span className="truncate">{activeItem?.title ?? ''}</span>
          </span>
          <ChevronDown
            className={`size-4 shrink-0 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {dropdownOpen && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-hairline bg-white p-1.5 shadow-lg dark:bg-slate-900 dark:border-slate-700">
            {TABS.map((t) => {
              const Icon = t.icon;
              const item = items[t.id];
              if (!item) return null;
              const active = t.id === activeId;
              return (
                <li key={t.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => switchTo(t.id)}
                    className={
                      'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ' +
                      (active
                        ? 'bg-navy text-white dark:bg-sky-600'
                        : 'text-body hover:bg-navy-tint hover:text-navy dark:hover:bg-slate-800 dark:hover:text-sky-400')
                    }>
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.title}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Active calculator ── */}
      <div>
        {activeId === 'logarithms' && (
          <LogarithmLoader
            locale={locale}
            copy={dict.logarithmTool}
            title={items.logarithms.title}
            description={items.logarithms.description}
          />
        )}
        {activeId === 'quadratic-equations' && (
          <QuadraticLoader
            locale={locale}
            copy={dict.equations}
            title={items['quadratic-equations'].title}
            description={items['quadratic-equations'].description}
          />
        )}
        {activeId === 'systemSolver' && (
          <SystemSolverLoader
            locale={locale}
            copy={dict.systemSolverTool}
            title={items.systemSolver.title}
            description={items.systemSolver.description}
          />
        )}
        {activeId === 'polynomials' && (
          <PolynomialLoader
            locale={locale}
            copy={dict.polynomialTool}
            title={items.polynomials.title}
            description={items.polynomials.description}
          />
        )}
        {activeId === 'inequalities' && (
          <InequalityLoader
            locale={locale}
            copy={dict.inequalityTool}
            title={items.inequalities.title}
            description={items.inequalities.description}
          />
        )}
        {activeId === 'triangle' && (
          <TriangleLoader
            locale={locale}
            copy={dict.triangleTool}
            title={items.triangle.title}
            description={items.triangle.description}
          />
        )}
        {activeId === 'fractions' && (
          <FractionToolLoader
            locale={locale}
            copy={dict.fractionTool}
            title={items.fractions.title}
            description={items.fractions.description}
          />
        )}
        {activeId === 'graphing' && (
          <GraphingToolLoader
            locale={locale}
            copy={dict.graphingTool}
            title={items.graphing.title}
            description={items.graphing.description}
          />
        )}
      </div>
    </div>
  );
}

function Loading() {
  return <div className="h-80 animate-pulse rounded-2xl border border-hairline bg-white dark:bg-slate-900" />;
}
