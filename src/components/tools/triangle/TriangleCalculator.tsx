'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Calculator,
  Info,
  ListOrdered,
  RotateCcw,
  History,
  Sparkles,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
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
  'w-full min-w-0 rounded-box border border-hairline bg-searchInput px-3 py-2.5 font-mono text-sm text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none';

const chipClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-45';

const panelClass =
  'relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5';

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
  copy,
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
          className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted transition hover:bg-sectionHeader hover:text-ink">
          {ex.label}
        </button>
      ))}
    </div>
  );

  return (
    <main className="mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
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

            <p className="rounded-box bg-brass-tint px-3 py-2 text-[11px] leading-relaxed text-brass-strong">
              {copy.hint}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none px-5 py-2.5 text-sm">
                <Calculator className="size-4" aria-hidden="true" />
                {loading ? copy.solving : copy.solveButton}
              </button>
              <button type="button" onClick={reset} className={chipClass}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {copy.reset}
              </button>
            </div>
          </form>

          <div className="mt-4 border-t border-hairline pt-3">
            {exampleButtons}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-box border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-500">
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}
        </section>

        {/* ═════ RIGHT: Results ═════ */}
        <section className={panelClass}>
          {loading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-box border-4 border-[#465D73] border-t-transparent" />
            </div>
          )}

          {!result && !loading && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
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
                <div className="flex items-start gap-2 rounded-box border border-brass/30 bg-brass-tint px-3 py-2 text-xs text-brass-strong">
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
                <div className="border-t border-hairline pt-3">
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
                          className="w-full overflow-x-auto rounded-box border border-hairline-soft bg-main px-2 py-1.5 text-left font-mono text-[11px] text-body transition-colors hover:bg-sectionHeader">
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
        <p className="text-xs font-bold text-[#465D73]">
          {copy.solutionLabel} {index + 1}
        </p>
      )}

      <TriangleSvg solution={solution} />

      {/* Sides & Angles */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-box border border-hairline bg-sectionHeader p-3">
          <p className="mb-2 text-[11px] font-semibold text-muted">
            {copy.sidesResult}
          </p>
          <ul className="space-y-1 font-mono text-sm">
            {sides.map(([name, val]) => (
              <li key={name} className="flex justify-between">
                <span className="text-muted">{name} =</span>
                <span className="text-ink">
                  {fmt(val)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-box border border-hairline bg-sectionHeader p-3">
          <p className="mb-2 text-[11px] font-semibold text-muted">
            {copy.anglesResult}
          </p>
          <ul className="space-y-1 font-mono text-sm">
            {angles.map(([name, val]) => (
              <li key={name} className="flex justify-between">
                <span className="text-muted">{name} =</span>
                <span className="text-ink">
                  {fmt(val)}°
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Derived */}
      <div className="rounded-box border border-hairline bg-sectionHeader p-3">
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

        <div className="mt-3 space-y-2 border-t border-hairline pt-3">
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
        <div className="mt-5 border-t border-hairline pt-4">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
            <ListOrdered className="size-3.5" aria-hidden="true" />
            {copy.stepsTitle}
          </p>
          <div className="space-y-3">
            {solution.steps.map((st, i) => (
              <div
                key={i}
                className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                <h3 className="text-xs font-bold text-[#465D73]">
                  {st.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-body">
                  {st.explanation}
                </p>
                {st.latex && (
                  <div className="mt-2 overflow-x-auto rounded-box border border-hairline bg-main px-3 py-2">
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
      <span className="break-all text-right font-mono text-ink">
        {tex ? <KatexPreview tex={tex} /> : value}
      </span>
    </div>
  );
}