'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BookOpen, Calculator, Delete, History, Keyboard, MoveDiagonal, RotateCcw, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import { VECTOR_EXAMPLES, VECTOR_HISTORY_KEY, type VectorInput, type VectorMode, type VectorResult } from './vectors';

type Copy = Dictionary['vectorTool'];

interface Props {
  locale: string;
  copy: Copy;
  title: string;
  description: string;
  embedded?: boolean;
}

const fieldClass =
  'w-full min-w-0 rounded-box border border-hairline bg-white px-3 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const keyClass =
  'inline-flex min-h-11 items-center justify-center rounded-box border border-hairline bg-white px-2 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-box border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const panelClass =
  'rounded-box border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

const AXES = ['x', 'y', 'z'];

function formatNum(n: number | null) {
  if (n == null || !Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e6)) return n.toExponential(4);
  return String(Math.round(n * 1e6) / 1e6);
}

function fit(values: string[], dimension: 2 | 3) {
  const next = values.slice(0, dimension);
  while (next.length < dimension) next.push('0');
  return next;
}

export function VectorCalculator({ copy, embedded = false }: Props) {
  const [mode, setMode] = useState<VectorMode>('points');
  const [dimension, setDimension] = useState<2 | 3>(2);
  const [a, setA] = useState(['0', '0']);
  const [b, setB] = useState(['3', '4']);
  const [active, setActive] = useState('b-0');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<VectorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VectorInput[]>([]);
  const [syntaxOpen, setSyntaxOpen] = useState(false);
  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VECTOR_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!showKeyboard) return;
    function onPointerDown(e: PointerEvent) {
      if (!keyboardRootRef.current?.contains(e.target as Node)) setShowKeyboard(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showKeyboard]);

  function current(): VectorInput {
    return { mode, dimension, a: fit(a, dimension), b: fit(b, dimension) };
  }

  async function solveWith(item: VectorInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/vectors/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : copy.invalidExpression);
      setResult(data);
      setHistory((prev) => {
        const next = [item, ...prev.filter((h) => JSON.stringify(h) !== JSON.stringify(item))].slice(0, 10);
        try {
          localStorage.setItem(VECTOR_HISTORY_KEY, JSON.stringify(next));
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

  function apply(item: VectorInput) {
    setMode(item.mode);
    setDimension(item.dimension);
    setA(item.a);
    setB(item.b);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(item), 0);
  }

  function setDim(next: 2 | 3) {
    setDimension(next);
    setA((prev) => fit(prev, next));
    setB((prev) => fit(prev, next));
    setResult(null);
  }

  function insertKey(key: string) {
    const [side, index] = active.split('-');
    const i = Number(index);
    const write = (values: string[]) => {
      const next = [...values];
      const current = next[i] ?? '';
      next[i] = key === 'backspace' ? current.slice(0, -1) : key === 'clear' ? '' : current + key;
      return next;
    };
    if (side === 'a') setA(write);
    else setB(write);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') setShowKeyboard(false);
  }

  const leftTitle = mode === 'points' ? copy.pointA : copy.vectorU;
  const rightTitle = mode === 'points' ? copy.pointB : copy.vectorV;

  return (
    <main
      className={
        embedded ? 'text-ink' : 'mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]'
      }>

        <section className={panelClass} onKeyDown={onInputKeyDown}>
          <div ref={keyboardRootRef}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{copy.inputTitle}</h2>
              <button
                type="button"
                onClick={() => setShowKeyboard((o) => !o)}
                className={
                  'inline-flex items-center gap-1.5 rounded-box border px-3 py-2 text-xs font-semibold transition-colors ' +
                  (showKeyboard
                    ? 'border-navy/30 bg-navy text-white hover:bg-navy-strong'
                    : 'border-hairline bg-white text-ink hover:bg-navy-tint dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800')
                }>
                <Keyboard className="size-3.5" aria-hidden="true" />
                {copy.keyboard}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                solveWith(current());
              }}
              className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {(['points', 'vectors'] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setMode(id);
                      setResult(null);
                    }}
                    className={
                      'rounded-box border px-3 py-1.5 text-xs font-semibold ' +
                      (mode === id
                        ? 'border-navy bg-navy text-white'
                        : 'border-hairline bg-white text-muted hover:bg-navy-tint dark:border-slate-700 dark:bg-slate-900')
                    }>
                    {copy.modes[id]}
                  </button>
                ))}
                {([2, 3] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDim(id)}
                    className={
                      'rounded-box border px-3 py-1.5 text-xs font-semibold ' +
                      (dimension === id
                        ? 'border-navy bg-navy text-white'
                        : 'border-hairline bg-white text-muted hover:bg-navy-tint dark:border-slate-700 dark:bg-slate-900')
                    }>
                    {id === 2 ? copy.dim2 : copy.dim3}
                  </button>
                ))}
              </div>

              {[
                { title: leftTitle, values: a, side: 'a', set: setA },
                { title: rightTitle, values: b, side: 'b', set: setB },
              ].map((group) => (
                <div key={group.side}>
                  <p className="mb-1 text-xs font-semibold text-muted">{group.title}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {AXES.slice(0, dimension).map((axis, i) => (
                      <div key={axis}>
                        <label className="mb-1 block font-mono text-[11px] text-muted">{axis}</label>
                        <input
                          value={group.values[i] ?? ''}
                          onFocus={() => setActive(`${group.side}-${i}`)}
                          onChange={(e) =>
                            group.set((prev) => {
                              const next = fit(prev, dimension);
                              next[i] = e.target.value;
                              return next;
                            })
                          }
                          spellCheck={false}
                          autoComplete="off"
                          className={fieldClass}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-box bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong disabled:opacity-50">
                  <Calculator className="size-4" aria-hidden="true" />
                  {loading ? copy.solving : copy.solveButton}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('points');
                    setDimension(2);
                    setA(['0', '0']);
                    setB(['3', '4']);
                    setResult(null);
                    setError(null);
                  }}
                  className={chipClass}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {copy.reset}
                </button>
              </div>
            </form>

            {showKeyboard && (
              <div
                id={keyboardTitleId}
                role="region"
                aria-label={copy.keyboard}
                className="mt-4 rounded-box border border-hairline bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-slate-700">
                  <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(false)}
                    aria-label="close"
                    className="inline-flex size-9 items-center justify-center rounded-box text-muted hover:bg-paper dark:hover:bg-slate-800">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 px-4 py-4">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', '-', 'pi', 'sqrt(', '/', '^', '(', ')'].map(
                    (k) => (
                      <button key={k} type="button" className={keyClass} onClick={() => insertKey(k)}>
                        {k}
                      </button>
                    ),
                  )}
                  <button
                    type="button"
                    className={keyClass}
                    onClick={() => insertKey('backspace')}
                    aria-label="backspace">
                    <Delete className="size-4" />
                  </button>
                  <button type="button" className={keyClass} onClick={() => insertKey('clear')}>
                    {copy.clear}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-muted">{copy.examples}</span>
              {VECTOR_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => apply(ex)}
                  className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted hover:border-navy/30 hover:text-ink dark:border-slate-700 transition">
                  {ex.label}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t border-hairline pt-3 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSyntaxOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy-strong dark:text-sky-400">
                <BookOpen className="size-3.5" />
                {copy.syntaxTitle}
              </button>
              {syntaxOpen && (
                <ul className="mt-2 space-y-1 rounded-box bg-paper-deep/60 p-3 font-mono text-[11px] text-body dark:bg-slate-800/40 dark:text-slate-300">
                  {copy.syntax.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              )}
            </div>
            {error && (
              <div className="mt-3 rounded-box border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>
        </section>

        <section className={panelClass}>
          {loading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-box border-4 border-navy border-t-transparent" />
            </div>
          )}
          {!result && !loading && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-box bg-navy-tint text-navy dark:bg-sky-950/40 dark:text-sky-400">
                <MoveDiagonal className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              <ul className="grid gap-3">
                {result.quantities.map((q) => {
                  const numeric = formatNum(q.numeric);
                  return (
                    <li
                      key={q.id}
                      className="rounded-box border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {copy.labels[q.id as keyof Copy['labels']] ?? q.id}
                      </p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <KatexPreview tex={q.latex} />
                      </div>
                      {numeric && <p className="mt-1 font-mono text-xs text-muted">{numeric}</p>}
                    </li>
                  );
                })}
              </ul>
              {history.length > 0 && (
                <div className="border-t border-hairline pt-3 dark:border-slate-800">
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
                          localStorage.removeItem(VECTOR_HISTORY_KEY);
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
                          className="w-full rounded-box border border-hairline-soft bg-white px-2 py-1.5 text-left font-mono text-[11px] text-body hover:border-navy/30 hover:bg-navy-tint dark:border-slate-800 dark:bg-slate-900">
                          {copy.modes[h.mode]} ({h.a.join(', ')}) ({h.b.join(', ')})
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
