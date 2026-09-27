'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Calculator,
  Info,
  ListOrdered,
  RotateCcw,
  History,
  Sparkles,
  Triangle as TriangleIcon,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { ToolHeader } from '@/components/ui/ToolHeader';
import { BackButton } from '@/components/ui/BackButton';
import type { Dictionary } from '@/i18n/types';
import {
  TRIANGLE_EXAMPLES,
  TRIANGLE_HISTORY_KEY,
  type TriangleHistoryItem,
  type TriangleResult,
  type TriangleSolution,
} from './triangle';
import { TriangleSvg } from './TriangleSvg';

type Copy = Dictionary['triangleTool'];

interface Props {
  locale: string;
  copy: Copy;
  title: string;
  description: string;
}

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const panelClass =
  'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

const SIDE_FIELDS = ['a', 'b', 'c'] as const;
const ANGLE_FIELDS = ['A', 'B', 'C'] as const;
type SideKey = (typeof SIDE_FIELDS)[number];
type AngleKey = (typeof ANGLE_FIELDS)[number];
type FieldKey = SideKey | AngleKey;

const EMPTY: Record<FieldKey, string> = {
  a: '',
  b: '',
  c: '',
  A: '',
  B: '',
  C: '',
};

function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return '—';
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(digits)).toString();
}

export function TriangleCalculator({
  locale,
  copy,
  title,
  description,
}: Props) {
  const [values, setValues] = useState<Record<FieldKey, string>>({
    ...EMPTY,
    a: '3',
    b: '4',
    c: '5',
  });
  const [result, setResult] = useState<TriangleResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TriangleHistoryItem[]>([]);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRIANGLE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function solve(e?: FormEvent) {
    e?.preventDefault();
    const filled = Object.values(values).filter((v) => v.trim() !== '');
    if (filled.length < 3) {
      setError(copy.needThree);
      return;
    }
    await solveWith(values);
  }

  async function solveWith(vals: Record<FieldKey, string>) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/triangle/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vals),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidInput);
      setResult(data);

      const item: TriangleHistoryItem = { ...vals };
      setHistory((prev) => {
        const key = JSON.stringify(item);
        const next = [
          item,
          ...prev.filter((h) => JSON.stringify(h) !== key),
        ].slice(0, 8);
        try {
          localStorage.setItem(TRIANGLE_HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidInput);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setValues(EMPTY);
    setResult(null);
    setError(null);
  }

  function applyExample(ex: (typeof TRIANGLE_EXAMPLES)[0]) {
    const next = { ...EMPTY, ...ex.values };
    setValues(next);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(next), 0);
  }

  function applyHistory(h: TriangleHistoryItem) {
    setValues(h);
    solveWith(h);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(TRIANGLE_HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }

  function setField(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  const exampleButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">{copy.examples}</span>
      {TRIANGLE_EXAMPLES.map((ex) => (
        <button
          key={ex.label}
          type="button"
          onClick={() => applyExample(ex)}
          className="rounded-lg border border-hairline px-2 py-1 text-[11px] text-muted hover:border-navy/30 hover:text-ink dark:border-slate-700 transition">
          {ex.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-ink">
      <BackButton href={`/${locale}/tools`} />
      <ToolHeader
        title={title}
        description={description}
        category={copy.eyebrow}
        icon={<TriangleIcon className="size-4" />}
      />

      <div className="my-6 grid w-full gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ═════ LEFT: Input ═════ */}
        <section className={panelClass}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              {copy.inputTitle}
            </h2>
          </div>

          <form onSubmit={solve} className="space-y-4">
            {/* Sides */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">
                {copy.sidesLabel}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SIDE_FIELDS.map((k) => (
                  <label key={k} className="block">
                    <span className="mb-1 block font-mono text-xs font-semibold text-muted">
                      {k}
                    </span>
                    <input
                      value={values[k]}
                      onChange={(e) => setField(k, e.target.value)}
                      placeholder="—"
                      spellCheck={false}
                      autoComplete="off"
                      inputMode="decimal"
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Angles */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">
                {copy.anglesLabel}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ANGLE_FIELDS.map((k) => (
                  <label key={k} className="block">
                    <span className="mb-1 block font-mono text-xs font-semibold text-muted">
                      {k}°
                    </span>
                    <input
                      value={values[k]}
                      onChange={(e) => setField(k, e.target.value)}
                      placeholder="—"
                      spellCheck={false}
                      autoComplete="off"
                      inputMode="decimal"
                      className={fieldClass}
                    />
                  </label>
                ))}
              </div>
            </div>

            <p className="rounded-lg bg-navy-tint/50 px-3 py-2 text-[11px] leading-relaxed text-navy dark:bg-sky-950/30 dark:text-sky-300">
              {copy.hint}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-50">
                <Calculator className="size-4" aria-hidden="true" />
                {loading ? copy.solving : copy.solveButton}
              </button>
              <button type="button" onClick={reset} className={chipClass}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {copy.reset}
              </button>
            </div>
          </form>

          <div className="mt-4 border-t border-hairline pt-3 dark:border-slate-800">
            {exampleButtons}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ═════ RIGHT: Results ═════ */}
        <section className={panelClass}>
          {loading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
            </div>
          )}

          {!result && !loading && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-navy-tint text-navy dark:bg-sky-950/40 dark:text-sky-400">
                <Sparkles className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">
                {copy.emptyResult}
              </p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {result.ambiguous && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                  <Info
                    className="mt-0.5 size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{copy.ambiguousNote}</span>
                </div>
              )}

              {result.solutions.map((sol, idx) => (
                <SolutionCard
                  key={idx}
                  solution={sol}
                  index={idx}
                  total={result.solutions.length}
                  copy={copy}
                />
              ))}

              {history.length > 0 && (
                <div className="border-t border-hairline pt-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <History className="size-3.5" aria-hidden="true" />
                      {copy.history}
                    </p>
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[11px] font-semibold text-muted hover:text-rose-500">
                      {copy.clearHistory}
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {history.slice(0, 5).map((h, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => applyHistory(h)}
                          className="w-full overflow-x-auto rounded-lg border border-hairline-soft bg-white px-2 py-1.5 text-left font-mono text-[11px] text-body transition-colors hover:border-navy/30 hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800">
                          {Object.entries(h)
                            .filter(([, v]) => v.trim() !== '')
                            .map(([k, v]) => `${k}=${v}`)
                            .join('  ·  ')}
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

/* ══════════════════════════════════════════════════════════ */

function SolutionCard({
  solution,
  index,
  total,
  copy,
}: {
  solution: TriangleSolution;
  index: number;
  total: number;
  copy: Copy;
}) {
  const sides: [string, number][] = [
    ['a', solution.a],
    ['b', solution.b],
    ['c', solution.c],
  ];
  const angles: [string, number][] = [
    ['A', solution.A],
    ['B', solution.B],
    ['C', solution.C],
  ];

  const triType =
    solution.tri_type === 'right'
      ? copy.typeRight
      : solution.tri_type === 'obtuse'
        ? copy.typeObtuse
        : copy.typeAcute;

  const shape =
    solution.shape_type === 'equilateral'
      ? copy.shapeEquilateral
      : solution.shape_type === 'isosceles'
        ? copy.shapeIsosceles
        : copy.shapeScalene;

  return (
    <div className="space-y-4">
      {total > 1 && (
        <p className="text-xs font-bold text-navy dark:text-sky-400">
          {copy.solutionLabel} {index + 1}
        </p>
      )}

      <TriangleSvg solution={solution} />

      {/* Sides & Angles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-paper/40 p-3 dark:bg-slate-800/40 dark:border-slate-700">
          <p className="mb-2 text-[11px] font-semibold text-muted">
            {copy.sidesResult}
          </p>
          <ul className="space-y-1 font-mono text-sm">
            {sides.map(([name, val]) => (
              <li key={name} className="flex justify-between">
                <span className="text-muted">{name} =</span>
                <span className="text-ink dark:text-slate-200">
                  {fmt(val)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-hairline bg-paper/40 p-3 dark:bg-slate-800/40 dark:border-slate-700">
          <p className="mb-2 text-[11px] font-semibold text-muted">
            {copy.anglesResult}
          </p>
          <ul className="space-y-1 font-mono text-sm">
            {angles.map(([name, val]) => (
              <li key={name} className="flex justify-between">
                <span className="text-muted">{name} =</span>
                <span className="text-ink dark:text-slate-200">
                  {fmt(val)}°
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Derived */}
      <div className="rounded-xl border border-hairline bg-paper/40 p-3 dark:bg-slate-800/40 dark:border-slate-700">
        <p className="mb-2 text-[11px] font-semibold text-muted">
          {copy.derivedTitle}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 text-sm">
          <Row label={copy.areaLabel} value={fmt(solution.area)} />
          <Row label={copy.perimeterLabel} value={fmt(solution.perimeter)} />
          <Row label={copy.semiLabel} value={fmt(solution.semiperimeter)} />
          {solution.R !== null && (
            <Row label={copy.RLabel} value={fmt(solution.R)} />
          )}
          <Row label={copy.rLabel} value={fmt(solution.r)} />
          <Row label={copy.typeLabel} value={triType} />
          <Row label={copy.shapeLabel} value={shape} />
        </div>

        <div className="mt-3 space-y-2 border-t border-hairline pt-3 dark:border-slate-700">
          <Row
            label={copy.heightsLabel}
            tex={`h_a = ${fmt(solution.heights.a)},\\quad h_b = ${fmt(
              solution.heights.b,
            )},\\quad h_c = ${fmt(solution.heights.c)}`}
          />
          <Row
            label={copy.mediansLabel}
            tex={`m_a = ${fmt(solution.medians.a)},\\quad m_b = ${fmt(
              solution.medians.b,
            )},\\quad m_c = ${fmt(solution.medians.c)}`}
          />
          <Row
            label={copy.bisectorsLabel}
            tex={`l_a = ${fmt(solution.bisectors.a)},\\quad l_b = ${fmt(
              solution.bisectors.b,
            )},\\quad l_c = ${fmt(solution.bisectors.c)}`}
          />
        </div>
      </div>

      {/* Step-by-step solution */}
      {solution.steps && solution.steps.length > 0 && (
        <div className="mt-5 border-t border-hairline pt-4 dark:border-slate-700">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
            <ListOrdered className="size-3.5" aria-hidden="true" />
            {copy.stepsTitle}
          </p>
          <div className="space-y-3">
            {solution.steps.map((st, i) => (
              <div
                key={i}
                className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                <h3 className="text-xs font-bold text-navy dark:text-sky-400">
                  {st.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-ink/80 dark:text-slate-300">
                  {st.explanation}
                </p>
                {st.latex && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-hairline bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                    <KatexPreview tex={st.latex} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tex,
}: {
  label: string;
  value?: string;
  tex?: string;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="break-all text-right font-mono text-ink dark:text-slate-200">
        {tex ? <KatexPreview tex={tex} /> : value}
      </span>
    </div>
  );
}