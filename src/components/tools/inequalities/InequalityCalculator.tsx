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
  'w-full min-w-0 rounded-box border border-hairline bg-searchInput px-3 py-2.5 font-mono text-sm text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none';

const keyClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-sectionHeader';

const chipClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-45';

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
          className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted transition hover:bg-sectionHeader hover:text-ink">
          {ex.label}
        </button>
      ))}
    </div>
  );

  const badge = result ? TYPE_BADGE[result.type] : null;

  return (
    <main className="mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        {/* ══════════ LEFT: Input ══════════ */}
        <section
        className="relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5"
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
                  'inline-flex items-center gap-1.5 rounded-box border px-3 py-2 text-xs font-semibold transition-colors ' +
                  (showKeyboard
                    ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                    : 'border-hairline bg-main text-ink hover:bg-sectionHeader  ')
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
                      'rounded-box border px-3 py-1.5 text-xs font-semibold font-mono transition-colors ' +
                      (variable === v
                        ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                        : 'border-hairline bg-main text-muted hover:bg-sectionHeader  ')
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
                  <div className="mt-2 overflow-x-auto rounded-box border border-hairline bg-main px-3 py-2">
                    <KatexPreview tex={inequality} />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || !inequality.trim()}
                  className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] px-5 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
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
            <div className="mt-4 border-t border-hairline pt-3">{exampleButtons}</div>

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-box border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-500">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* ══════════ RIGHT: Results ══════════ */}
        <section className="relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5">
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
                    <span className={'rounded-box px-2.5 py-0.5 text-[11px] font-semibold ' + badge.className}>
                      {badge.label}
                    </span>
                  )}
                </div>

                {result.intervals.length === 0 ? (
                  <div className="rounded-box border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-500">
                    {copy.noSolution}
                  </div>
                ) : (
                  <>
                    <div className="mb-2 flex items-center justify-between gap-2 rounded-box border border-hairline bg-main px-3 py-2.5">
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
                    <p className="rounded-box bg-sectionHeader px-3 py-2 font-mono text-xs text-muted">
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
                        className="rounded-box border border-hairline bg-main px-3 py-1.5 text-sm">
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
                        className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                        <h3 className="text-xs font-bold text-[#465D73]">{st.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-body">{st.explanation}</p>
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

              {/* History */}
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
      className="mt-4 rounded-box border border-hairline bg-main shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-box text-muted transition-colors hover:bg-sectionHeader hover:text-mainText">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="overflow-x-auto rounded-box border border-hairline bg-paper px-3 py-2 text-center font-mono text-lg text-ink">
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
