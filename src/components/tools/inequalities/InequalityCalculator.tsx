'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  BookOpen,
  Calculator,
  Check,
  Copy,
  Delete,
  History,
  Keyboard,
  ListOrdered,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import { INEQ_EXAMPLES, INEQ_HISTORY_KEY, INEQ_VARIABLES, type IneqHistoryItem, type IneqResult } from './inequalities';
import { NumberLine } from './NumberLine';

type Copy = Dictionary['inequalityTool'];

interface Props {
  locale: string;
  copy: Copy;
  title: string;
  description: string;
}

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const keyClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const TYPE_BADGE: Record<IneqResult['type'], { label: string; className: string }> = {
  linear: {
    label: 'წრფივი',
    className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  },
  quadratic: {
    label: 'კვადრატული',
    className: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  },
  absolute: {
    label: 'მოდულიანი',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  other: {
    label: 'სხვა',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

export function InequalityCalculator({ copy }: Props) {
  const [inequality, setInequality] = useState('x^2 - 5x + 6 < 0');
  const [variable, setVariable] = useState('x');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<IneqResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<IneqHistoryItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const panelClass =
    'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

  /* ── History load ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(INEQ_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  /* ── Keyboard close outside ── */
  useEffect(() => {
    if (!showKeyboard) return;
    function onPointerDown(e: PointerEvent) {
      if (!keyboardRootRef.current?.contains(e.target as Node)) {
        setShowKeyboard(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showKeyboard]);

  /* ── Copied reset ── */
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function handleSolve(e?: React.FormEvent) {
    e?.preventDefault();
    if (!inequality.trim()) return;

    const normalized = inequality
      .replace(/≤/g, '<=')
      .replace(/≥/g, '>=')
      .replace(/≠/g, '!=')
      .replace(/≤/g, '<')
      .replace(/≥/g, '>');

    if (!/[<>=]/.test(normalized)) {
      setError(copy.invalidInequality);
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/inequality/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inequality, variable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidInequality);
      setResult(data);

      const item: IneqHistoryItem = { inequality, variable };
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter((h) => !(h.inequality === item.inequality && h.variable === item.variable)),
        ].slice(0, 10);
        try {
          localStorage.setItem(INEQ_HISTORY_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidInequality);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setInequality('x^2 - 5x + 6 < 0');
    setVariable('x');
    setResult(null);
    setError(null);
  }

  function applyExample(ex: (typeof INEQ_EXAMPLES)[0]) {
    setInequality(ex.inequality);
    setVariable(ex.variable);
    setResult(null);
    setError(null);
    setTimeout(() => {
      handleSolveWith(ex.inequality, ex.variable);
    }, 0);
  }

  async function handleSolveWith(ineq: string, v: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/inequality/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inequality: ineq, variable: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidInequality);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidInequality);
    } finally {
      setLoading(false);
    }
  }

  function applyHistory(item: IneqHistoryItem) {
    setInequality(item.inequality);
    setVariable(item.variable);
    handleSolveWith(item.inequality, item.variable);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(INEQ_HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }

  function insertKey(key: string) {
    setInequality((s) => {
      if (key === 'backspace') return s.slice(0, -1);
      if (key === 'clear') return '';
      return s + key;
    });
    inputRef.current?.focus();
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') setShowKeyboard(false);
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
    } catch {
      /* ignore */
    }
  }

  const exampleButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">{copy.examples}</span>
      {INEQ_EXAMPLES.map((ex) => (
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

  const badge = result ? TYPE_BADGE[result.type] : null;

  return (
    <main className="mx-auto max-w-[1500px] space-y-6 px-4 py-8 sm:px-6 lg:px-8 min-h-screen text-ink">
      <div className="my-6 grid w-full gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* ══════════ LEFT: Input ══════════ */}
        <section
          className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800"
          onKeyDown={onInputKeyDown}>
          <div ref={keyboardRootRef}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">{copy.inputTitle}</h2>
              <button
                type="button"
                aria-expanded={showKeyboard}
                aria-controls={keyboardTitleId}
                aria-haspopup="true"
                onClick={() => setShowKeyboard((o) => !o)}
                className={
                  'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ' +
                  (showKeyboard
                    ? 'border-navy/30 bg-navy text-white hover:bg-navy-strong'
                    : 'border-hairline bg-white text-ink hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800')
                }>
                <Keyboard className="size-3.5" aria-hidden="true" />
                {copy.keyboard}
              </button>
            </div>

            {/* Variable */}
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-muted">{copy.variableLabel}</label>
              <div className="flex flex-wrap gap-1">
                {INEQ_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariable(v)}
                    className={
                      'rounded-lg border px-3 py-1.5 text-xs font-semibold font-mono transition-colors ' +
                      (variable === v
                        ? 'border-navy bg-navy text-white'
                        : 'border-hairline bg-white text-muted hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800')
                    }>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Inequality input */}
            <form onSubmit={handleSolve} className="space-y-3">
              <div>
                <label htmlFor="ineq-input" className="mb-1 block text-xs font-semibold text-muted">
                  {copy.inequalityLabel}
                </label>
                <input
                  id="ineq-input"
                  ref={inputRef}
                  value={inequality}
                  onChange={(e) => setInequality(e.target.value)}
                  placeholder={copy.inequalityPlaceholder}
                  spellCheck={false}
                  autoComplete="off"
                  inputMode={showKeyboard ? 'none' : 'text'}
                  className={fieldClass}
                />
                {inequality.trim() && (
                  <div className="mt-2 overflow-x-auto rounded-lg border border-hairline bg-white px-3 py-2 dark:bg-slate-900 dark:border-slate-700">
                    <KatexPreview tex={inequality} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || !inequality.trim()}
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

            {/* Keyboard */}
            {showKeyboard && (
              <InequalityKeyboard
                copy={copy}
                titleId={keyboardTitleId}
                value={inequality}
                onKey={insertKey}
                onClose={() => setShowKeyboard(false)}
              />
            )}

            {/* Examples */}
            <div className="mt-4 border-t border-hairline pt-3 dark:border-slate-800">{exampleButtons}</div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* ══════════ RIGHT: Results ══════════ */}
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
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {/* Solution card */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted">{copy.resultTitle}</p>
                  {badge && (
                    <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-semibold ' + badge.className}>
                      {badge.label}
                    </span>
                  )}
                </div>

                {result.intervals.length === 0 ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                    {copy.noSolution}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-hairline bg-white px-3 py-2.5 dark:bg-slate-900 dark:border-slate-700">
                      <div className="min-w-0 overflow-x-auto">
                        <KatexPreview tex={result.solutionLatex} displayMode={false} />
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(result.intervalNotation, 'sol')}
                        className="shrink-0 text-muted hover:text-ink"
                        aria-label="copy">
                        {copied === 'sol' ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="rounded-lg bg-paper/50 px-3 py-2 font-mono text-xs text-muted dark:bg-slate-800/40">
                      {result.intervalNotation}
                    </p>
                  </>
                )}
              </div>

              {/* Number line */}
              {result.intervals.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">{copy.numberLineTitle}</p>
                  <NumberLine criticalPoints={result.criticalPointsNumeric} intervals={result.intervals} />
                </div>
              )}

              {/* Critical points */}
              {result.criticalPoints.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">{copy.criticalPointsTitle}</p>
                  <div className="flex flex-wrap gap-2">
                    {result.criticalPoints.map((cp, i) => (
                      <span
                        key={i}
                        className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700">
                        <KatexPreview tex={`${variable} = ${cp}`} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Steps */}
              {result.steps.length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted">
                    <ListOrdered className="size-3.5" aria-hidden="true" />
                    {copy.stepsTitle}
                  </p>
                  <div className="space-y-3">
                    {result.steps.map((st, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                        <h3 className="text-xs font-bold text-navy dark:text-sky-400">{st.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-ink/80 dark:text-slate-300">{st.explanation}</p>
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

              {/* History */}
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
                          {h.inequality}
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

function InequalityKeyboard({
  copy,
  titleId,
  value,
  onKey,
  onClose,
}: {
  copy: Copy;
  titleId: string;
  value: string;
  onKey: (key: string) => void;
  onClose: () => void;
}) {
  const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
  const ops = ['<', '>', '≤', '≥', '=', '|'];
  const vars = ['x', 'y', 'z', 't'];
  const extras = ['+', '-', '*', '/', '^', '(', ')', '.'];

  return (
    <div
      id={titleId}
      role="region"
      aria-label={copy.keyboard}
      className="mt-4 rounded-2xl border border-hairline bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3 dark:border-slate-700">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-paper hover:text-navy dark:hover:bg-slate-800">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="overflow-x-auto rounded-xl border border-hairline bg-paper px-3 py-2 text-center font-mono text-lg text-ink dark:bg-slate-950 dark:border-slate-700">
          {value || '\u00a0'}
        </div>

        {/* Inequality operators */}
        <div className="grid grid-cols-6 gap-1.5">
          {ops.map((o) => (
            <button key={o} type="button" className={keyClass} onClick={() => onKey(o)}>
              {o}
            </button>
          ))}
        </div>

        {/* Variables */}
        <div className="grid grid-cols-4 gap-1.5">
          {vars.map((v) => (
            <button key={v} type="button" className={keyClass} onClick={() => onKey(v)}>
              {v}
            </button>
          ))}
        </div>

        {/* Digits */}
        <div className="grid grid-cols-3 gap-1.5">
          {digits.map((d) => (
            <button key={d} type="button" className={keyClass} onClick={() => onKey(d)}>
              {d}
            </button>
          ))}
          <button type="button" className={keyClass} onClick={() => onKey('.')}>
            .
          </button>
          <button type="button" className={keyClass} onClick={() => onKey('0')}>
            0
          </button>
          <button type="button" aria-label="backspace" className={keyClass} onClick={() => onKey('backspace')}>
            <Delete className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Extras */}
        <div className="grid grid-cols-8 gap-1.5">
          {extras.map((k) => (
            <button key={k} type="button" className={keyClass} onClick={() => onKey(k)}>
              {k}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1">
          <button type="button" className={keyClass} onClick={() => onKey('clear')}>
            {copy.clear}
          </button>
        </div>
      </div>
    </div>
  );
}
