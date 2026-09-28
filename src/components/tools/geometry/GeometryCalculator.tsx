'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BookOpen, Box, Calculator, Delete, History, Keyboard, RotateCcw, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  GEOMETRY_EXAMPLES,
  GEOMETRY_HISTORY_KEY,
  SHAPE_DEFAULTS,
  SHAPE_FIELDS,
  SHAPE_GROUPS,
  SHAPE_TARGETS,
  type GeometryHistoryItem,
  type GeometryResult,
  type ShapeId,
} from './geometry';

type Copy = Dictionary['geometryTool'];

interface Props {
  locale: string;
  copy: Copy;
  title: string;
  description: string;
  embedded?: boolean;
}

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const keyClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const panelClass =
  'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

function formatNum(n: number | null) {
  if (n == null || !Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e6)) return n.toExponential(4);
  return String(Math.round(n * 1e6) / 1e6);
}

export function GeometryCalculator({ copy, embedded = false }: Props) {
  const [shape, setShape] = useState<ShapeId>('sphere');
  const [params, setParams] = useState<Record<string, string>>({ r: '3' });
  const [target, setTarget] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [variable, setVariable] = useState('x');
  const [activeField, setActiveField] = useState('r');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<GeometryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeometryHistoryItem[]>([]);
  const [syntaxOpen, setSyntaxOpen] = useState(false);

  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GEOMETRY_HISTORY_KEY);
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

  async function solveWith(item: GeometryHistoryItem) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/geometry/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shape: item.shape,
          params: item.params,
          target: item.target,
          targetValue: item.targetValue,
          variable: item.variable,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : copy.invalidExpression);
      setResult(data);
      setHistory((prev) => {
        const next = [item, ...prev.filter((h) => JSON.stringify(h) !== JSON.stringify(item))].slice(0, 10);
        try {
          localStorage.setItem(GEOMETRY_HISTORY_KEY, JSON.stringify(next));
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

  function currentItem(): GeometryHistoryItem {
    const fields = SHAPE_FIELDS[shape];
    const next: Record<string, string> = {};
    for (const key of fields) next[key] = params[key] ?? '';
    return { label: shape, shape, params: next, target, targetValue, variable };
  }

  function apply(item: GeometryHistoryItem) {
    setShape(item.shape);
    setParams(item.params);
    setTarget(item.target);
    setTargetValue(item.targetValue);
    setVariable(item.variable);
    setActiveField(SHAPE_FIELDS[item.shape][0]);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(item), 0);
  }

  function insertKey(key: string) {
    const nextOf = (current: string) =>
      key === 'backspace' ? current.slice(0, -1) : key === 'clear' ? '' : current + key;
    if (activeField === '__target') {
      setTargetValue(nextOf);
      return;
    }
    setParams((prev) => ({ ...prev, [activeField]: nextOf(prev[activeField] ?? '') }));
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') setShowKeyboard(false);
  }

  const targets = SHAPE_TARGETS[shape];

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
        <section className={panelClass} onKeyDown={onInputKeyDown}>
          <div ref={keyboardRootRef}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{copy.inputTitle}</h2>
              <button
                type="button"
                onClick={() => setShowKeyboard((o) => !o)}
                className={
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ' +
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
                solveWith(currentItem());
              }}
              className="space-y-3">
              <div>
                <label htmlFor="geom-shape" className="mb-1 block text-xs font-semibold text-muted">
                  {copy.shapeLabel}
                </label>
                <select
                  id="geom-shape"
                  value={shape}
                  onChange={(e) => {
                    const next = e.target.value as ShapeId;
                    setShape(next);
                    setParams(SHAPE_DEFAULTS[next]);
                    setTarget('');
                    setActiveField(SHAPE_FIELDS[next][0]);
                    setResult(null);
                    setError(null);
                  }}
                  className={fieldClass}>
                  {SHAPE_GROUPS.map((group) => (
                    <optgroup key={group.id} label={copy.groups[group.id]}>
                      {group.shapes.map((id) => (
                        <option key={id} value={id}>
                          {copy.shapes[id]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted">{copy.hints[shape]}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SHAPE_FIELDS[shape].map((key) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold text-muted">
                      {copy.fields[key as keyof Copy['fields']]}
                    </label>
                    <input
                      value={params[key] ?? ''}
                      onFocus={() => setActiveField(key)}
                      onChange={(e) => setParams((prev) => ({ ...prev, [key]: e.target.value }))}
                      spellCheck={false}
                      autoComplete="off"
                      inputMode={showKeyboard ? 'none' : 'text'}
                      className={fieldClass}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">{copy.targetLabel}</label>
                  <select value={target} onChange={(e) => setTarget(e.target.value)} className={fieldClass}>
                    <option value="">{copy.targetNone}</option>
                    {targets.map((id) => (
                      <option key={id} value={id}>
                        {copy.labels[id as keyof Copy['labels']]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">{copy.variableLabel}</label>
                  <input
                    value={variable}
                    onChange={(e) => setVariable(e.target.value || 'x')}
                    spellCheck={false}
                    className={fieldClass}
                  />
                </div>
              </div>
              {target && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">{copy.targetValueLabel}</label>
                  <input
                    value={targetValue}
                    onFocus={() => setActiveField('__target')}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder={copy.targetPlaceholder}
                    spellCheck={false}
                    className={fieldClass}
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-50">
                  <Calculator className="size-4" aria-hidden="true" />
                  {loading ? copy.solving : copy.solveButton}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShape('sphere');
                    setParams({ r: '3' });
                    setTarget('');
                    setTargetValue('');
                    setVariable('x');
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
                className="mt-4 rounded-2xl border border-hairline bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-slate-700">
                  <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(false)}
                    aria-label="close"
                    className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-paper hover:text-navy dark:hover:bg-slate-800">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 px-4 py-4">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.', 'pi', 'sqrt(', '/', '^', 'x', '(', ')'].map(
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
                    <Delete className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={keyClass} onClick={() => insertKey('clear')}>
                    {copy.clear}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-muted">{copy.examples}</span>
              {GEOMETRY_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => apply(ex)}
                  className="rounded-lg border border-hairline px-2 py-1 text-[11px] text-muted hover:border-navy/30 hover:text-ink dark:border-slate-700 transition">
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
                <ul className="mt-2 space-y-1 rounded-xl bg-paper-deep/60 p-3 font-mono text-[11px] text-body dark:bg-slate-800/40 dark:text-slate-300">
                  {copy.syntax.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>
        </section>

        <section className={panelClass}>
          {loading && (
            <div className="flex min-h-[200px] items-center justify-center">
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
            </div>
          )}
          {!result && !loading && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-navy-tint text-navy dark:bg-sky-950/40 dark:text-sky-400">
                <Box className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              {result.mode === 'solve' &&
                (result.solutions.length > 0 ? (
                  <div className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {copy.solutionsLabel}
                    </p>
                    <ul className="space-y-2">
                      {result.solutions.map((s, i) => (
                        <li key={i} className="overflow-x-auto hide-scrollbar">
                          <KatexPreview tex={`${variable} = ${s.latex}`} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{copy.noSolution}</p>
                ))}
              <ul className="grid gap-3 sm:grid-cols-2">
                {result.quantities.map((q) => {
                  const numeric = formatNum(q.numeric);
                  return (
                    <li
                      key={q.id}
                      className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {copy.labels[q.id as keyof Copy['labels']] ?? q.id}
                      </p>
                      <div className="overflow-x-auto hide-scrollbar">
                        <KatexPreview tex={q.latex} />
                      </div>
                      {numeric && numeric !== q.latex && <p className="mt-1 font-mono text-xs text-muted">{numeric}</p>}
                    </li>
                  );
                })}
              </ul>
              {history.length > 0 && (
                <div className="border-t border-hairline pt-3 dark:border-slate-800">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                      <History className="size-3.5" aria-hidden="true" />
                      {copy.history}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setHistory([]);
                        try {
                          localStorage.removeItem(GEOMETRY_HISTORY_KEY);
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
                          className="w-full rounded-lg border border-hairline-soft bg-white px-2 py-1.5 text-left font-mono text-[11px] text-body hover:border-navy/30 hover:bg-navy-tint dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                          {copy.shapes[h.shape]} {Object.values(h.params).join(', ')}
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
