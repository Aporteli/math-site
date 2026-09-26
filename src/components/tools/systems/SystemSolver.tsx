'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calculator,
  Check,
  CheckCircle2,
  Copy,
  Delete,
  Grid3x3,
  History,
  Keyboard,
  ListOrdered,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { RichText } from '@/components/math/RichText';
import { ToolHeader } from '@/components/ui/ToolHeader';
import { BackButton } from '@/components/ui/BackButton';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import {
  HISTORY_KEY,
  METHOD_LABELS,
  PRESETS_SYSTEMS,
  type HistoryItem,
  type SolveMethod,
  type SolveResponse,
  type VarCount,
} from './systems';

type Copy = Dictionary['systemSolverTool'];

interface Props {
  locale: Locale;
  copy: Copy;
  title: string;
  description: string;
}

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const panelClass =
  'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const DEFAULT_2 = ['2x + 3y = 8', 'x - y = -1'];
const DEFAULT_3 = ['x + y + z = 6', '2x - y + z = 3', 'x + 2y - z = 2'];

const SYNTAX_HINTS = [
  'წრფივი: 2x + 3y = 8',
  'არაწრფივი: x^2 + y = 5',
  'გამრავლება: 2*x ან 2x',
  'ხარისხი: x^2 (ან x**2)',
  'ფრჩხილები: (x + 1)*(y - 2) = 0',
  'ფუნქციები: sin(x), cos(y), exp(x)',
];

export function SystemSolver({ locale, copy, title, description }: Props) {
  const [size, setSize] = useState<VarCount>(2);
  const [equations, setEquations] = useState<string[]>(DEFAULT_2);
  const [activeMethod, setActiveMethod] = useState<SolveMethod | null>(null);
  const [result, setResult] = useState<SolveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [syntaxOpen, setSyntaxOpen] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const variables = useMemo(() => (size === 2 ? ['x', 'y'] : ['x', 'y', 'z']), [size]);

  /* ─── Size change resets state ─── */
  useEffect(() => {
    setEquations(size === 2 ? DEFAULT_2 : DEFAULT_3);
    setResult(null);
    setError(null);
    setActiveMethod(null);
  }, [size]);

  /* ─── Load history on mount ─── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* ─── Copied reset ─── */
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  /* ─── Solve ─── */
  async function handleSolve(e?: FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equations, variables }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || copy.invalidEquation);
      }
      setResult(data);
      setActiveMethod(data.methods?.[0]?.method ?? null);

      const item: HistoryItem = {
        equations: [...equations],
        variables: [...variables],
        solutions: data.solutions,
      };
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter((h) => JSON.stringify(h.equations) !== JSON.stringify(item.equations)),
        ].slice(0, 12);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidEquation);
    } finally {
      setLoading(false);
    }
  }

  /* ─── Reset ─── */
  function reset() {
    setEquations(size === 2 ? DEFAULT_2 : DEFAULT_3);
    setResult(null);
    setError(null);
    setActiveMethod(null);
  }

  /* ─── Preset ─── */
  function applyPreset(p: (typeof PRESETS_SYSTEMS)[0]) {
    setSize(p.size);
    setEquations([...p.equations]);
    setResult(null);
    setError(null);
    setActiveMethod(null);
  }

  /* ─── History apply ─── */
  function applyHistory(item: HistoryItem) {
    setSize(item.variables.length as VarCount);
    setEquations([...item.equations]);
    handleSolveWith(item.equations, item.variables);
  }

  async function handleSolveWith(eqs: string[], vars: string[]) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equations: eqs, variables: vars }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidEquation);
      setResult(data);
      setActiveMethod(data.methods?.[0]?.method ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidEquation);
    } finally {
      setLoading(false);
    }
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }

  /* ─── Equation helpers ─── */
  function updateEquation(i: number, value: string) {
    setEquations((prev) => prev.map((eq, idx) => (idx === i ? value : eq)));
  }

  function insertKey(key: string) {
    const input = inputRefs.current[focusedIndex];
    if (!input) return;
    const current = equations[focusedIndex] ?? '';
    const next = key === 'BACKSPACE' ? current.slice(0, -1) : key === 'CLEAR' ? '' : current + key;
    updateEquation(focusedIndex, next);
    input.focus();
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
  }

  const activeMethodData = useMemo(() => {
    if (!result?.methods || !activeMethod) return null;
    return result.methods.find((m) => m.method === activeMethod) ?? null;
  }, [result, activeMethod]);

  const allFilled = equations.length === size && equations.every((e) => e.trim());
  const liveWarning = !allFilled && equations.some((e) => e.trim() && !e.includes('='));

  const solveForLabel = variables.join(', ');

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-ink">
      <BackButton href={`/${locale}/tools`} />
      <ToolHeader
        title={title}
        description={description}
        category={copy.eyebrow}
        icon={<Calculator className="size-4" />}
      />

      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* ══════════ Left: Input ══════════ */}
        <div className="space-y-4">
          <section className={panelClass}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{copy.inputTitle}</h2>
              <div className="flex rounded-lg border border-hairline p-0.5 dark:border-slate-700">
                {([2, 3] as VarCount[]).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSize(n)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      size === n ? 'bg-navy text-white' : 'text-muted hover:text-ink'
                    }`}>
                    {n}×{n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <span className="font-semibold text-ink">{copy.solveFor}</span>
              <span className="font-mono">{solveForLabel}</span>
            </div>

            {/* Equations */}
            <form onSubmit={handleSolve} className="mt-4 space-y-2.5">
              {equations.map((eq, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-center font-mono text-xs font-bold text-muted">({i + 1})</span>
                  <input
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    value={eq}
                    onChange={(e) => updateEquation(i, e.target.value)}
                    onFocus={() => setFocusedIndex(i)}
                    placeholder={`${variables[0]} ... = ...`}
                    spellCheck={false}
                    autoComplete="off"
                    className={fieldClass}
                  />
                  {equations.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setEquations((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-muted hover:text-rose-500"
                      aria-label={copy.reset}>
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}

              {equations.length < size && (
                <button type="button" onClick={() => setEquations((prev) => [...prev, ''])} className={chipClass}>
                  <Plus className="size-3.5" /> +1
                </button>
              )}

              {liveWarning && !error && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400">{copy.liveError}</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || !allFilled}
                  className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-50">
                  <Calculator className="size-4" />
                  {copy.solveButton}
                </button>
                <button type="button" onClick={reset} className={chipClass}>
                  <RotateCcw className="size-3.5" />
                  {copy.reset}
                </button>
                <button type="button" onClick={() => setShowKeyboard((v) => !v)} className={chipClass}>
                  <Keyboard className="size-3.5" />
                  {copy.keyboard}
                </button>
              </div>
            </form>

            {showKeyboard && <KeyboardPopup copy={copy} onInsert={insertKey} onClose={() => setShowKeyboard(false)} />}

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-hairline pt-3 dark:border-slate-800">
              {PRESETS_SYSTEMS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="rounded-lg border border-hairline px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-navy/30 hover:text-ink dark:border-slate-700">
                  {p.label}
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
                  {SYNTAX_HINTS.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </section>

          {history.length > 0 && (
            <section className={panelClass}>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <History className="size-4 text-navy dark:text-sky-400" />
                  {copy.history}
                </h2>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-[11px] font-semibold text-muted hover:text-rose-500">
                  {copy.clearHistory}
                </button>
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {history.map((h, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => applyHistory(h)}
                      className="w-full rounded-lg px-2 py-1.5 text-left font-mono text-[11px] text-body transition-colors hover:bg-paper-deep/60 dark:hover:bg-slate-800">
                      {h.equations.join('  |  ')}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ══════════ Right: Results ══════════ */}
        <div className="space-y-4">
          {!result && !loading && (
            <section
              className={`${panelClass} flex min-h-[200px] flex-col items-center justify-center gap-3 text-center`}>
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-navy-tint text-navy dark:bg-sky-950/40 dark:text-sky-400">
                <Sparkles className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </section>
          )}

          {loading && (
            <section className={`${panelClass} flex min-h-[200px] items-center justify-center`}>
              <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
            </section>
          )}

          {result && (
            <>
              {/* Solutions */}
              <section className={panelClass}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="size-4 text-navy dark:text-sky-400" />
                    {copy.resultTitle}
                  </h2>
                  <span className="rounded-full bg-navy-tint px-2.5 py-0.5 text-[11px] font-semibold text-navy dark:bg-sky-950/40 dark:text-sky-400">
                    {result.is_linear ? 'წრფივი' : 'არაწრფივი'}
                  </span>
                </div>

                {result.solutions.length === 0 ? (
                  <p className="text-sm text-rose-600 dark:text-rose-400">
                    {result.status === 'inconsistent'
                      ? '⚠ სისტემას ამონახსნი არ აქვს (არათავსებადია)'
                      : result.status === 'infinite'
                        ? '♾ უსასრულოდ ბევრი ამონახსნი — ერთი ან მეტი თავისუფალი ცვლადი'
                        : copy.emptyResult}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {result.solutions.map((sol, i) => {
                      const tex = variables
                        .filter((v) => v in sol)
                        .map((v) => `${v} = ${sol[v]}`)
                        .join(',\\quad ');
                      const plain = variables
                        .filter((v) => v in sol)
                        .map((v) => `${v}=${sol[v]}`)
                        .join(', ');
                      return (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-paper/40 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
                          <div className="min-w-0 overflow-x-auto">
                            <KatexPreview tex={tex} />
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(plain, `sol-${i}`)}
                            className="shrink-0 text-muted hover:text-ink">
                            {copied === `sol-${i}` ? (
                              <Check className="size-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {/* Matrix view */}
              {result.linear && (
                <section className={panelClass}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Grid3x3 className="size-4 text-navy dark:text-sky-400" />
                    მატრიცული ხედი
                  </h2>
                  <div className="overflow-x-auto">
                    <div className="inline-flex items-center gap-4 font-mono text-sm">
                      <span className="text-muted">A =</span>
                      <MatrixView rows={result.linear.matrix_A} />
                      <span className="text-muted">b =</span>
                      <MatrixView rows={result.linear.vector_b.map((v) => [v])} />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted">
                    det(A) = <span className="font-mono text-ink dark:text-slate-200">{result.linear.determinant}</span>
                  </p>
                </section>
              )}

              {/* Steps — ყველა ღია, სქროლადი კონტეინერით */}
              {result.methods && result.methods.length > 0 && (
                <section className={panelClass}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <ListOrdered className="size-4 text-navy dark:text-sky-400" />
                    ნაბიჯ-ნაბიჯ ამოხსნა
                  </h2>

                  {result.methods.length > 1 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {result.methods.map((m) => (
                        <button
                          key={m.method}
                          type="button"
                          onClick={() => setActiveMethod(m.method)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            activeMethod === m.method
                              ? 'bg-navy text-white dark:bg-sky-600'
                              : 'border border-hairline text-muted hover:text-ink dark:border-slate-700'
                          }`}>
                          {METHOD_LABELS[m.method] ?? m.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMethodData && (
                    <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-320px)]">
                      {activeMethodData.steps.map((st, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                          <h3 className="text-xs font-bold text-navy dark:text-sky-400">{st.title}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-ink/80 dark:text-slate-300">
                            <RichText text={st.explanation} />
                          </p>
                          {st.latex && (
                            <div className="mt-2 min-w-0 overflow-x-auto rounded-lg border border-hairline bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                              <KatexPreview tex={st.latex} displayMode />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Graph */}
              {size === 2 && result.solutions.length > 0 && (
                <section className={panelClass}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="size-4 text-navy dark:text-sky-400" />
                    {copy.graphTitle}
                  </h2>
                  <SystemGraph equations={equations} solutions={result.solutions} />
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════════ */

function MatrixView({ rows }: { rows: string[][] }) {
  const cols = rows[0]?.length ?? 1;
  return (
    <span className="inline-flex items-stretch gap-1">
      <span className="w-1 rounded-l border-y border-l border-ink/40" />
      <span
        className="inline-grid gap-x-4 gap-y-1 px-2 py-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        }}>
        {rows.flatMap((row, ri) =>
          row.map((cell, ci) => (
            <span key={`${ri}-${ci}`} className="text-center text-ink dark:text-slate-200">
              {cell}
            </span>
          )),
        )}
      </span>
      <span className="w-1 rounded-r border-y border-r border-ink/40" />
    </span>
  );
}

function KeyboardPopup({
  copy,
  onInsert,
  onClose,
}: {
  copy: Copy;
  onInsert: (key: string) => void;
  onClose: () => void;
}) {
  const rows: string[][] = [
    ['7', '8', '9', 'x', 'y', 'z'],
    ['4', '5', '6', '+', '-', '*'],
    ['1', '2', '3', '/', '^', '('],
    ['0', '.', '=', ')', 'BACKSPACE', 'CLEAR'],
  ];
  return (
    <div className="mt-3 rounded-2xl border border-hairline bg-paper-deep/40 p-3 dark:border-slate-700 dark:bg-slate-800/40">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">{copy.keyboard}</span>
        <button type="button" onClick={onClose} className="text-muted hover:text-ink" aria-label="close">
          <X className="size-3.5" />
        </button>
      </div>
      <div className="space-y-1.5">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-6 gap-1.5">
            {row.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onInsert(k)}
                className="flex min-h-9 items-center justify-center rounded-lg border border-hairline bg-white px-2 text-xs font-semibold text-ink transition-colors hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800">
                {k === 'BACKSPACE' ? (
                  <Delete className="size-3.5" />
                ) : k === 'CLEAR' ? (
                  <RotateCcw className="size-3.5" />
                ) : (
                  k
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function SystemGraph({ equations, solutions }: { equations: string[]; solutions: Record<string, string>[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hostRef.current) return;
    let disposed = false;

    async function draw() {
      try {
        const mod = await import('function-plot');
        const functionPlot = mod.default;
        if (disposed || !hostRef.current) return;

        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        hostRef.current.replaceChildren();

        const exprs: string[] = [];
        for (const eq of equations) {
          const conv = toYEquals(eq);
          if (!conv) {
            setError(true);
            return;
          }
          exprs.push(conv);
        }

        const rootX: number[] = [];
        const rootY: number[] = [];
        for (const sol of solutions) {
          const x = Number(sol.x);
          const y = Number(sol.y);
          if (Number.isFinite(x) && Number.isFinite(y)) {
            rootX.push(x);
            rootY.push(y);
          }
        }

        const colors = isDark ? ['#38bdf8', '#f472b6', '#a78bfa'] : ['#2563eb', '#db2777', '#7c3aed'];

        const data: any[] = exprs.map((expr, i) => ({
          fn: expr,
          color: colors[i % colors.length],
          graphType: 'polyline',
        }));

        if (rootX.length) {
          data.push({
            points: rootX.map((x, i) => [x, rootY[i]] as [number, number]),
            fnType: 'points',
            graphType: 'scatter',
            color: isDark ? '#34d399' : '#059669',
            attr: { r: 5 },
          });
        }

        functionPlot({
          target: hostRef.current,
          width: hostRef.current.clientWidth || 400,
          height: 300,
          grid: true,
          xAxis: { domain: [-10, 10] },
          yAxis: { domain: [-10, 10] },
          data,
        });
        setError(false);
      } catch {
        setError(true);
      }
    }

    draw();
    return () => {
      disposed = true;
    };
  }, [equations, solutions]);

  if (error)
    return (
      <p className="rounded-xl border border-dashed border-hairline bg-paper/40 px-3 py-6 text-center text-xs text-muted dark:border-slate-700 dark:bg-slate-800/40">
        გრაფიკი ხელმისაწვდომია მხოლოდ y = f(x) ტიპის სისტემებისთვის.
      </p>
    );

  return (
    <div
      ref={hostRef}
      className="flex w-full justify-center overflow-hidden rounded-xl border border-hairline bg-white [&_svg]:block [&_svg]:max-w-full dark:border-slate-800 dark:bg-slate-950 dark:[&_.domain]:stroke-slate-600 dark:[&_.grid]:stroke-slate-800 dark:[&_.origin]:stroke-slate-400 dark:[&_.tick_line]:stroke-slate-700 dark:[&_.tick_text]:fill-slate-400"
    />
  );
}

function toYEquals(eq: string): string | null {
  const clean = eq.replace(/\s+/g, '');
  if (/[\^]/.test(clean) || /sin|cos|tan|log|exp|sqrt/i.test(clean)) return null;
  const parts = clean.split('=');
  if (parts.length !== 2) return null;

  const norm = (s: string) => s.replace(/(\d)([a-z(])/g, '$1*$2');
  const l = norm(parts[0]);
  const r = norm(parts[1]);

  const yRegex = /([+-]?\d*\.?\d*)\*?y/;
  const ly = l.match(yRegex);
  const ry = r.match(yRegex);

  if (!ly && !ry) return null;

  const [, coefRaw] = (ly ?? ry)!;
  const coef = coefRaw === '' || coefRaw === '+' ? 1 : coefRaw === '-' ? -1 : Number(coefRaw);
  if (!Number.isFinite(coef) || coef === 0) return null;

  const stripY = (s: string) => s.replace(yRegex, '').replace(/^\+/, '');
  const restL = stripY(l);
  const restR = stripY(r);

  let rhs: string;
  if (ly) {
    rhs = restL ? `(${r})-(${restL})` : r;
  } else {
    rhs = restR ? `(${l})-(${restR})` : l;
  }

  return `(${rhs})/${coef}`;
}