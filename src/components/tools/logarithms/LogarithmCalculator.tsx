'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  BookOpen, Calculator, Check, Copy, Delete, History, Keyboard,
  RotateCcw, Sparkles, X,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  LOG_EXAMPLES, LOG_HISTORY_KEY, LOG_VARIABLES,
  type LogHistoryItem, type LogResult,
} from './logarithms';

type Copy = Dictionary['logarithmTool'];

interface Props {
  locale: string;
  copy: Copy;
  title: string;
  description: string;
  embedded?: boolean;
}

const fieldClass =
  'w-full min-w-0 rounded-box border border-hairline bg-searchInput px-3 py-2.5 font-mono text-sm text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none';

const keyClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-sectionHeader';

const chipClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-45';

const panelClass =
  'relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5';

export function LogarithmCalculator({
  copy, embedded = false,
}: Props) {
  const [expression, setExpression] = useState('log_2(x - 1) = 3');
  const [variable, setVariable] = useState('x');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<LogResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LogHistoryItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [syntaxOpen, setSyntaxOpen] = useState(false);

  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOG_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch { /* ignore */ }
  }, []);

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

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function handleSolve(e?: React.FormEvent) {
    e?.preventDefault();
    if (!expression.trim()) return;
    await solveWith(expression, variable);
  }

  async function solveWith(expr: string, v: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/logarithm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, variable: v }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidExpression);
      setResult(data);

      const item: LogHistoryItem = { expression: expr, variable: v };
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter((h) => !(h.expression === item.expression && h.variable === item.variable)),
        ].slice(0, 10);
        try {
          localStorage.setItem(LOG_HISTORY_KEY, JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidExpression);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setExpression('log_2(x - 1) = 3');
    setVariable('x');
    setResult(null);
    setError(null);
  }

  function applyExample(ex: (typeof LOG_EXAMPLES)[0]) {
    setExpression(ex.expression);
    setVariable(ex.variable);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(ex.expression, ex.variable), 0);
  }

  function applyHistory(item: LogHistoryItem) {
    setExpression(item.expression);
    setVariable(item.variable);
    solveWith(item.expression, item.variable);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(LOG_HISTORY_KEY);
    } catch { /* ignore */ }
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

  const exampleButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">{copy.examples}</span>
      {LOG_EXAMPLES.map((ex) => (
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
    <main
      className={
        embedded
          ? 'text-ink'
          : "mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]"
      }>

        {/* ═════ LEFT: Input ═════ */}
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
                    ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                    : 'border-hairline bg-main text-ink hover:bg-sectionHeader  ')
                }>
                <Keyboard className="size-3.5" aria-hidden="true" />
                {copy.keyboard}
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-muted">
                {copy.variableLabel}
              </label>
              <div className="flex flex-wrap gap-1">
                {LOG_VARIABLES.map((v) => (
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

            <form onSubmit={handleSolve} className="space-y-3">
              <div>
                <label htmlFor="log-input" className="mb-1 block text-xs font-semibold text-muted">
                  {copy.expressionLabel}
                </label>
                <input
                  id="log-input"
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
                  className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 active:scale-[0.98] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#526C85] disabled:opacity-50">
                  <Calculator className="size-4" aria-hidden="true" />
                  {loading ? copy.solving : copy.solveButton}
                </button>
                <button type="button" onClick={reset} className={chipClass}>
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {copy.reset}
                </button>
              </div>
            </form>

            {showKeyboard && (
              <LogKeyboard
                copy={copy}
                titleId={keyboardTitleId}
                value={expression}
                onKey={insertKey}
                onClose={() => setShowKeyboard(false)}
              />
            )}

            <div className="mt-4 border-t border-hairline pt-3">
              {exampleButtons}
            </div>

            <div className="mt-3 border-t border-hairline pt-3">
              <button
                type="button"
                onClick={() => setSyntaxOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#465D73] transition-colors hover:text-[#526C85]">
                <BookOpen className="size-3.5" />
                {copy.syntaxTitle}
              </button>
              {syntaxOpen && (
                <ul className="mt-2 space-y-1 rounded-box bg-sectionHeader p-3 font-mono text-[11px] text-body">
                  <li>· log(x) — ფუძე 10</li>
                  <li>· ln(x) — ნატურალური</li>
                  <li>· log_2(x) ან log2(x) — ფუძე 2</li>
                  <li>· log_5(x) — ფუძე 5</li>
                  <li>· log_2(x − 1) = 3 — განტოლება</li>
                  <li>· log(x·y) — გამარტივება</li>
                </ul>
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-box border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-500">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}
          </div>
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
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-5">
              {/* ═══ SIMPLIFY ═══ */}
              {result.mode === 'simplify' && (
                <div className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                    {copy.simplifiedLabel}
                  </p>
                  <div className="overflow-x-auto hide-scrollbar">
                    <KatexPreview tex={result.simplifiedLatex} />
                  </div>
                </div>
              )}

              {/* ═══ SOLVE ═══ */}
              {result.mode === 'solve' && (
                <>
                  {result.identity ? (
                    <div className="rounded-box border border-win/30 bg-win-tint px-4 py-3 text-sm font-bold text-win">
                      {copy.identityMessage}
                    </div>
                  ) : (
                    <>
                      {result.domainLatex && (
                        <div className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                            {copy.domainLabel}
                          </p>
                          <div className="overflow-x-auto hide-scrollbar">
                            <KatexPreview tex={result.domainLatex} />
                          </div>
                        </div>
                      )}

                      <div className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {copy.solutionsLabel}
                        </p>
                        {!result.solutions || result.solutions.length === 0 ? (
                          <p className="text-sm font-semibold text-rose-500">
                            {copy.noSolution}
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {result.solutions.map((s, i) => (
                              <li
                                key={i}
                                className="flex items-center justify-between gap-2 rounded-box border border-hairline bg-main px-3 py-2">
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
                        )}
                      </div>

                      {result.rejected && result.rejected.length > 0 && (
                        <div className="rounded-box border border-brass/30 bg-brass-tint p-3.5">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-brass-strong">
                            {copy.rejectedLabel}
                          </p>
                          <ul className="space-y-1.5">
                            {result.rejected.map((s, i) => (
                              <li key={i} className="overflow-x-auto hide-scrollbar">
                                <KatexPreview
                                  tex={`${variable} = ${s.latex} \\;\\text{— ${copy.rejectedNote}}`}
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* ═══ History ═══ */}
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
                          className="w-full overflow-x-auto rounded-box border border-hairline-soft bg-main px-2 py-1.5 text-left font-mono text-[11px] text-body transition-colors hover:bg-sectionHeader hover:bg-sectionHeader">
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

/* ══════════════════════════════════════════════════════════ */

function LogKeyboard({
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
  const logFns = ['log(', 'ln(', 'log_2(', 'log_3(', 'log_5('];
  const ops = ['=', '+', '-', '*', '/', '^', '(', ')', 'e'];
  const vars = ['x', 'y', 'z', 't'];

  return (
    <div
      id={titleId}
      role="region"
      aria-label={copy.keyboard}
      className="mt-4 rounded-box border border-hairline bg-main shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="close"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-box text-muted transition-colors hover:bg-paper hover:text-mainText">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="overflow-x-auto rounded-box border border-hairline bg-paper px-3 py-2 text-center font-mono text-lg text-ink">
          {value || '\u00a0'}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {logFns.map((k) => (
            <button key={k} type="button" className={keyClass} onClick={() => onKey(k)}>
              {k}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {vars.map((v) => (
            <button key={v} type="button" className={keyClass} onClick={() => onKey(v)}>
              {v}
            </button>
          ))}
        </div>

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
          <button
            type="button"
            aria-label="backspace"
            className={keyClass}
            onClick={() => onKey('backspace')}>
            <Delete className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {ops.map((k) => (
            <button key={k} type="button" className={keyClass} onClick={() => onKey(k)}>
              {k}
            </button>
          ))}
          <button type="button" className={keyClass} onClick={() => onKey('clear')}>
            {copy.clear}
          </button>
        </div>
      </div>
    </div>
  );
}