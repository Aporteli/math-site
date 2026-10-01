'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  BookOpen, Calculator, Check, Copy, Delete, History, Keyboard,
  RotateCcw, Sparkles, X,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  EXP_EXAMPLES, EXP_HISTORY_KEY, EXP_VARIABLES,
  type ExpHistoryItem, type ExpResult,
} from './exponents';

type Copy = Dictionary['exponentTool'];

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
  'inline-flex min-h-11 items-center justify-center rounded-box border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-box border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const panelClass =
  'rounded-box border border-hairline bg-white p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800';

export function ExponentCalculator({ copy, embedded = false }: Props) {
  const [expression, setExpression] = useState('2^(x + 1) = 16');
  const [variable, setVariable] = useState('x');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<ExpResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ExpHistoryItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [syntaxOpen, setSyntaxOpen] = useState(false);

  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(EXP_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!showKeyboard) return;
    function onPointerDown(e: PointerEvent) {
      if (!keyboardRootRef.current?.contains(e.target as Node)) setShowKeyboard(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showKeyboard]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function solveWith(expr: string, v: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/exponent/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, variable: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidExpression);
      setResult(data);

      const item: ExpHistoryItem = { expression: expr, variable: v };
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter((h) => !(h.expression === item.expression && h.variable === item.variable)),
        ].slice(0, 10);
        try { localStorage.setItem(EXP_HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidExpression);
    } finally {
      setLoading(false);
    }
  }

  function applyExample(ex: (typeof EXP_EXAMPLES)[number]) {
    setExpression(ex.expression);
    setVariable(ex.variable);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(ex.expression, ex.variable), 0);
  }

  function insertKey(key: string) {
    setExpression((s) => {
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
    } catch { /* ignore */ }
  }

  return (
    <main className={embedded ? 'text-ink' : "mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"}>
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
                    : 'border-hairline bg-white text-ink hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800')
                }>
                <Keyboard className="size-3.5" aria-hidden="true" />
                {copy.keyboard}
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-muted">{copy.variableLabel}</label>
              <div className="flex flex-wrap gap-1">
                {EXP_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariable(v)}
                    className={
                      'rounded-box border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ' +
                      (variable === v
                        ? 'border-navy bg-navy text-white'
                        : 'border-hairline bg-white text-muted hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800')
                    }>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (expression.trim()) solveWith(expression, variable);
              }}
              className="space-y-3">
              <div>
                <label htmlFor="exp-input" className="mb-1 block text-xs font-semibold text-muted">
                  {copy.expressionLabel}
                </label>
                <input
                  id="exp-input"
                  ref={inputRef}
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder={copy.expressionPlaceholder}
                  spellCheck={false}
                  autoComplete="off"
                  inputMode={showKeyboard ? 'none' : 'text'}
                  className={fieldClass}
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading || !expression.trim()}
                  className="inline-flex items-center gap-2 rounded-box bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-50">
                  <Calculator className="size-4" aria-hidden="true" />
                  {loading ? copy.solving : copy.solveButton}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpression('2^(x + 1) = 16');
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
              <ExpKeyboard
                copy={copy}
                titleId={keyboardTitleId}
                value={expression}
                onKey={insertKey}
                onClose={() => setShowKeyboard(false)}
              />
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3 dark:border-slate-800">
              <span className="text-xs font-semibold text-muted">{copy.examples}</span>
              {EXP_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => applyExample(ex)}
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
              <div className="mt-3 flex items-start gap-2 rounded-box border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
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
                <Sparkles className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {result.mode === 'simplify' && (
                <>
                  <ResultBlock label={copy.simplifiedLabel} tex={result.simplifiedLatex} />
                  {result.expandedLatex && result.expandedLatex !== result.simplifiedLatex && (
                    <ResultBlock label={copy.expandedLabel} tex={result.expandedLatex} />
                  )}
                  {result.numericLatex && result.numericLatex !== result.simplifiedLatex && (
                    <ResultBlock label={copy.numericLabel} tex={result.numericLatex} />
                  )}
                </>
              )}

              {result.mode === 'solve' && (
                result.identity ? (
                  <div className="rounded-box border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {copy.identityMessage}
                  </div>
                ) : result.solutionLatex ? (
                  <ResultBlock label={copy.solutionSetLabel} tex={result.solutionLatex} />
                ) : !result.solutions || result.solutions.length === 0 ? (
                  <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{copy.noSolution}</p>
                ) : (
                  <div className="rounded-box border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {copy.solutionsLabel}
                    </p>
                    <ul className="space-y-2">
                      {result.solutions.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between gap-2 rounded-box border border-hairline bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
                          <div className="min-w-0 overflow-x-auto hide-scrollbar">
                            <KatexPreview tex={`${variable} = ${s.latex}`} />
                          </div>
                          <button
                            type="button"
                            onClick={() => copyText(`${variable} = ${s.latex}`, `sol-${i}`)}
                            className="shrink-0 text-muted hover:text-ink">
                            {copied === `sol-${i}` ? (
                              <Check className="size-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}

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
                        try { localStorage.removeItem(EXP_HISTORY_KEY); } catch { /* ignore */ }
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
                          onClick={() => {
                            setExpression(h.expression);
                            setVariable(h.variable);
                            solveWith(h.expression, h.variable);
                          }}
                          className="w-full overflow-x-auto rounded-box border border-hairline-soft bg-white px-2 py-1.5 text-left font-mono text-[11px] text-body transition-colors hover:border-navy/30 hover:bg-navy-tint dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                          {h.expression}
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

function ResultBlock({ label, tex }: { label: string; tex: string }) {
  return (
    <div className="rounded-box border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="overflow-x-auto hide-scrollbar">
        <KatexPreview tex={tex} />
      </div>
    </div>
  );
}

function ExpKeyboard({
  copy, titleId, value, onKey, onClose,
}: {
  copy: Copy;
  titleId: string;
  value: string;
  onKey: (key: string) => void;
  onClose: () => void;
}) {
  const fns = ['^', 'exp(', 'sqrt(', 'e^', '**'];
  const ops = ['=', '>', '<', '<=', '>=', '+', '-', '*', '/', '(', ')'];
  const vars = ['x', 'y', 'a', 'n', 't'];
  const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

  return (
    <div
      id={titleId}
      role="region"
      aria-label={copy.keyboard}
      className="mt-4 rounded-box border border-hairline bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-box text-muted transition-colors hover:bg-paper hover:text-navy dark:hover:bg-slate-800">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div className="overflow-x-auto rounded-box border border-hairline bg-paper px-3 py-2 text-center font-mono text-lg text-ink dark:border-slate-700 dark:bg-slate-950">
          {value || '\u00a0'}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {fns.map((k) => (
            <button key={k} type="button" className={keyClass} onClick={() => onKey(k)}>{k}</button>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {vars.map((v) => (
            <button key={v} type="button" className={keyClass} onClick={() => onKey(v)}>{v}</button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {digits.map((d) => (
            <button key={d} type="button" className={keyClass} onClick={() => onKey(d)}>{d}</button>
          ))}
          <button type="button" className={keyClass} onClick={() => onKey('.')}>.</button>
          <button type="button" className={keyClass} onClick={() => onKey('0')}>0</button>
          <button type="button" aria-label="backspace" className={keyClass} onClick={() => onKey('backspace')}>
            <Delete className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {ops.map((k) => (
            <button key={k} type="button" className={keyClass} onClick={() => onKey(k)}>{k}</button>
          ))}
          <button type="button" className={keyClass} onClick={() => onKey('clear')}>{copy.clear}</button>
        </div>
      </div>
    </div>
  );
}
