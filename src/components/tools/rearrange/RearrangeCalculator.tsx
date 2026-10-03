'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, Calculator, History, RotateCcw } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import { REARRANGE_EXAMPLES, REARRANGE_HISTORY_KEY, type RearrangeInput, type RearrangeResult } from './rearrange';

type Copy = Dictionary['rearrangeTool'];

interface Props {
  locale: string;
  copy: Copy;
  title: string;
  description: string;
  embedded?: boolean;
}

const fieldClass =
  'w-full min-w-0 rounded-box border border-hairline bg-searchInput px-3 py-2.5 font-mono text-sm text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none';

const chipClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-sectionHeader';

const panelClass =
  'relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5';

export function RearrangeCalculator({ copy, embedded = false }: Props) {
  const [expression, setExpression] = useState('A = pi*r**2');
  const [variable, setVariable] = useState('r');
  const [result, setResult] = useState<RearrangeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RearrangeInput[]>([]);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REARRANGE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function solveWith(item: RearrangeInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/rearrange/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : copy.invalidExpression);
      setResult(data);
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter((h) => h.expression !== item.expression || h.variable !== item.variable),
        ].slice(0, 10);
        try {
          localStorage.setItem(REARRANGE_HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidExpression);
    } finally {
      setLoading(false);
    }
  }

  function apply(item: RearrangeInput) {
    setExpression(item.expression);
    setVariable(item.variable);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(item), 0);
  }

  return (
    <main
      className={
        embedded ? 'text-ink' : 'mx-auto min-h-screen max-w-[1500px] space-y-6 px-4 py-8 text-ink sm:px-6 lg:px-8'
      }>
      <div
        className={
          embedded
            ? 'grid w-full gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]'
            : 'my-6 grid w-full gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]'
        }>
        <section className={panelClass}>
          <h2 className="mb-3 text-sm font-semibold text-ink">{copy.inputTitle}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (expression.trim() && variable.trim()) solveWith({ expression, variable });
            }}
            className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">{copy.expressionLabel}</label>
              <input
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder={copy.expressionPlaceholder}
                spellCheck={false}
                className={fieldClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">{copy.variableLabel}</label>
              <input
                value={variable}
                onChange={(e) => setVariable(e.target.value)}
                spellCheck={false}
                className={fieldClass}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !expression.trim() || !variable.trim()}
                className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none px-5 py-2.5 text-sm">
                <Calculator className="size-4" aria-hidden="true" />
                {loading ? copy.solving : copy.solveButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setExpression('A = pi*r**2');
                  setVariable('r');
                  setResult(null);
                  setError(null);
                }}
                className={chipClass}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {copy.reset}
              </button>
            </div>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
            <span className="text-xs font-semibold text-muted">{copy.examples}</span>
            {REARRANGE_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => apply(ex)}
                className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted transition hover:bg-sectionHeader hover:text-ink">
                {ex.label}
              </button>
            ))}
          </div>
          {error && (
            <div className="mt-3 rounded-box border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-500">
              {error}
            </div>
          )}
        </section>
        <section className={panelClass}>
          {loading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-box border-4 border-[#465D73] border-t-transparent" />
            </div>
          )}
          {!result && !loading && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
                <ArrowLeftRight className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              <ol className="space-y-3">
                {result.steps.map((step, i) => (
                  <li
                    key={i}
                    className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {i + 1}. {copy.ops[step.op as keyof Copy['ops']] ?? step.op}
                    </p>
                    <div className="overflow-x-auto hide-scrollbar">
                      <KatexPreview tex={step.latex} />
                    </div>
                  </li>
                ))}
              </ol>
              {history.length > 0 && (
                <div className="border-t border-hairline pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <History className="size-3.5" />
                      {copy.history}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHistory([]);
                        try {
                          localStorage.removeItem(REARRANGE_HISTORY_KEY);
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="text-[11px] font-semibold text-muted hover:text-rose-500">
                      {copy.clearHistory}
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {history.slice(0, 5).map((h, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => apply(h)}
                          className="w-full rounded-box border border-hairline-soft bg-main px-2 py-1.5 text-left font-mono text-[11px] text-body hover:bg-sectionHeader">
                          {h.expression} → {h.variable}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
