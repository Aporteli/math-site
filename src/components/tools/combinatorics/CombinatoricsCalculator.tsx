'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BookOpen, Calculator, Delete, History, Keyboard, RotateCcw, Sigma, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  COMB_EXAMPLES,
  COMB_HISTORY_KEY,
  type CombInput,
  type CombKind,
  type CombinatoricsResult,
} from './combinatorics';

type Copy = Dictionary['combinatoricsTool'];

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
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main px-2 py-2 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-sectionHeader';

const chipClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-sectionHeader';

const panelClass =
  'relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5';

const KINDS: CombKind[] = ['P', 'A', 'C', 'binomial'];

function formatNum(n: number | null) {
  if (n == null || !Number.isFinite(n)) return null;
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-6 || abs >= 1e12)) return n.toExponential(4);
  return String(Math.round(n * 1e6) / 1e6);
}

export function CombinatoricsCalculator({ copy, embedded = false }: Props) {
  const [kind, setKind] = useState<CombKind>('C');
  const [n, setN] = useState('10');
  const [k, setK] = useState('3');
  const [repetition, setRepetition] = useState(false);
  const [expression, setExpression] = useState('');
  const [active, setActive] = useState<'n' | 'k' | 'expression'>('n');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<CombinatoricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CombInput[]>([]);
  const [syntaxOpen, setSyntaxOpen] = useState(false);
  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COMB_HISTORY_KEY);
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

  function current(): CombInput {
    return {
      kind,
      n,
      k,
      repetition: kind === 'A' || kind === 'C' ? repetition : false,
      expression: kind === 'binomial' ? expression : '',
    };
  }

  async function solveWith(item: CombInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/combinatorics/analyze`, {
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
          localStorage.setItem(COMB_HISTORY_KEY, JSON.stringify(next));
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

  function apply(item: CombInput) {
    setKind(item.kind);
    setN(item.n);
    setK(item.k);
    setRepetition(item.repetition);
    setExpression(item.expression);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(item), 0);
  }

  function insertKey(key: string) {
    const write = (value: string) => (key === 'backspace' ? value.slice(0, -1) : key === 'clear' ? '' : value + key);
    if (active === 'n') setN(write);
    else if (active === 'k') setK(write);
    else setExpression(write);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') setShowKeyboard(false);
  }

  const numeric = formatNum(result?.numeric ?? null);

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
                    ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                    : 'border-hairline bg-main text-ink hover:bg-sectionHeader  ')
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
                {KINDS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setKind(id);
                      setResult(null);
                    }}
                    className={
                      'rounded-box border px-3 py-1.5 text-xs font-semibold ' +
                      (kind === id
                        ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                        : 'border-hairline bg-main text-muted hover:bg-sectionHeader ')
                    }>
                    {copy.kinds[id]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">n</label>
                  <input
                    value={n}
                    onFocus={() => setActive('n')}
                    onChange={(e) => setN(e.target.value)}
                    spellCheck={false}
                    className={fieldClass}
                  />
                </div>
                {kind !== 'P' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted">k</label>
                    <input
                      value={k}
                      onFocus={() => setActive('k')}
                      onChange={(e) => setK(e.target.value)}
                      spellCheck={false}
                      className={fieldClass}
                    />
                  </div>
                )}
              </div>
              {(kind === 'A' || kind === 'C') && (
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input type="checkbox" checked={repetition} onChange={(e) => setRepetition(e.target.checked)} />
                  {copy.repetition}
                </label>
              )}
              {kind === 'binomial' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted">{copy.expressionLabel}</label>
                  <input
                    value={expression}
                    onFocus={() => setActive('expression')}
                    onChange={(e) => setExpression(e.target.value)}
                    placeholder={copy.expressionPlaceholder}
                    spellCheck={false}
                    className={fieldClass}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] px-5 py-2.5 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] hover:shadow-[0_4px_12px_rgba(70,93,115,0.27)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
                  <Calculator className="size-4" aria-hidden="true" />
                  {loading ? copy.solving : copy.solveButton}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setKind('C');
                    setN('10');
                    setK('3');
                    setRepetition(false);
                    setExpression('');
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
                className="mt-4 rounded-box border border-hairline bg-main shadow-sm">
                <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
                  <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(false)}
                    aria-label="close"
                    className="inline-flex size-9 items-center justify-center rounded-box text-muted hover:bg-paper">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5 px-4 py-4">
                  {['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', 'n', 'k', 'x', 'y', '+', '^', '(', ')'].map(
                    (key) => (
                      <button key={key} type="button" className={keyClass} onClick={() => insertKey(key)}>
                        {key}
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
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
              <span className="text-xs font-semibold text-muted">{copy.examples}</span>
              {COMB_EXAMPLES.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => apply(ex)}
                  className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted transition hover:bg-sectionHeader hover:text-ink">
                  {ex.label}
                </button>
              ))}
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
                <ul className="mt-2 space-y-1 rounded-box bg-paper-deep/60 p-3 font-mono text-[11px] text-body">
                  {copy.syntax.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              )}
            </div>
            {error && (
              <div className="mt-3 rounded-box border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-500">
                {error}
              </div>
            )}
          </div>
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
                <Sigma className="size-5" />
              </span>
              <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
            </div>
          )}
          {result && !loading && (
            <div className="space-y-4">
              {result.formulaLatex && result.formulaLatex !== result.valueLatex && (
                <Block label={copy.formulaLabel} tex={result.formulaLatex} />
              )}
              {result.valueLatex && <Block label={copy.valueLabel} tex={result.valueLatex} />}
              {numeric && <p className="font-mono text-xs text-muted">{numeric}</p>}
              {result.expandedLatex && <Block label={copy.expandedLabel} tex={result.expandedLatex} />}
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
                          localStorage.removeItem(COMB_HISTORY_KEY);
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
                          {copy.kinds[h.kind]} {h.expression || `n=${h.n}${h.kind === 'P' ? '' : `, k=${h.k}`}`}
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

function Block({ label, tex }: { label: string; tex: string }) {
  return (
    <div className="rounded-box border border-hairline bg-sectionHeader p-3.5">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <div className="overflow-x-auto hide-scrollbar">
        <KatexPreview tex={tex} />
      </div>
    </div>
  );
}
