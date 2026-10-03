'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Copy, Delete, Divide, History, Keyboard, RotateCcw, X, Sparkles } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  POLY_EXAMPLES,
  POLY_VARIABLES,
  POLYNOMIAL_HISTORY_KEY,
  type PolynomialHistoryItem,
  type PolyResult,
} from './polynomial';
type Copy = Dictionary['polynomialTool'];

interface Props {
  locale: string;
  copy: Copy;
}

const fieldClass =
  'w-full min-w-0 rounded-box border border-hairline bg-searchInput px-3 py-2.5 font-mono text-sm text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none';

const keyClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-sectionHeader';

const chipClass =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-sectionHeader disabled:cursor-not-allowed disabled:opacity-45';

type FieldId = 'expression' | 'divisor';
type TabId = 'factor' | 'roots' | 'division';

function applyKey(current: string, key: string): string {
  if (key === 'backspace') return current.slice(0, -1);
  if (key === 'clear') return '';
  return current + key;
}

export function PolynomialCalculator({ copy }: Props & { title: string; description: string }) {
  const [expression, setExpression] = useState('x^3 - 6x^2 + 11x - 6');
  const [divisor, setDivisor] = useState('x - 1');
  const [variable, setVariable] = useState('x');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [activeField, setActiveField] = useState<FieldId>('expression');
  const [activeTab, setActiveTab] = useState<TabId>('factor');
  const [result, setResult] = useState<PolyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<PolynomialHistoryItem[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const expressionRef = useRef<HTMLInputElement>(null);
  const divisorRef = useRef<HTMLInputElement>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const panelClass =
    'relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5';

  /* ── Load history on mount ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POLYNOMIAL_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  /* ── Close keyboard on outside click ── */
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

  /* ── Copied timeout ── */
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  /* ── Solve ── */
  async function handleSolve(e?: React.FormEvent) {
    e?.preventDefault();
    if (!expression.trim()) return;

    // ── ვალიდაცია: გამყოფი ნულის ტოლია ──
    const divClean = divisor.replace(/\s+/g, '');
    if (divClean && /^[+\-]?0(\.0*)?$/.test(divClean)) {
      setError(copy.divisorZeroError);
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/polynomial/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression, variable, divisor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidEquation);

      setResult(data);
      setActiveTab('factor');

      const item: PolynomialHistoryItem = { expression, variable, divisor };
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter(
            (h) => !(h.expression === item.expression && h.divisor === item.divisor && h.variable === item.variable),
          ),
        ].slice(0, 10);
        try {
          localStorage.setItem(POLYNOMIAL_HISTORY_KEY, JSON.stringify(next));
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

  function reset() {
    setExpression('x^3 - 6x^2 + 11x - 6');
    setDivisor('x - 1');
    setVariable('x');
    setResult(null);
    setError(null);
  }

  function applyExample(ex: (typeof POLY_EXAMPLES)[0]) {
    setExpression(ex.expression);
    setDivisor(ex.divisor);
    setVariable(ex.variable);
    setResult(null);
    setError(null);
    // Auto-solve
    setTimeout(() => {
      handleSolveWith(ex.expression, ex.variable, ex.divisor);
    }, 0);
  }

  async function handleSolveWith(expr: string, v: string, div: string) {
    const divClean = div.replace(/\s+/g, '');
    if (divClean && /^[+\-]?0(\.0*)?$/.test(divClean)) {
      setError(copy.divisorZeroError);
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/polynomial/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: expr, variable: v, divisor: div }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidEquation);
      setResult(data);
      setActiveTab('factor');
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidEquation);
    } finally {
      setLoading(false);
    }
  }

  function applyHistory(item: PolynomialHistoryItem) {
    setExpression(item.expression);
    setDivisor(item.divisor);
    setVariable(item.variable);
    handleSolveWith(item.expression, item.variable, item.divisor);
  }

  function clearHistory() {
    setHistory([]);
    try {
      localStorage.removeItem(POLYNOMIAL_HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }

  function insertKey(key: string) {
    if (activeField === 'expression') {
      setExpression((s) => applyKey(s, key));
      expressionRef.current?.focus();
    } else {
      setDivisor((s) => applyKey(s, key));
      divisorRef.current?.focus();
    }
  }

  function onExpressionKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') setShowKeyboard(false);
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
  }

  const activeSteps = result && activeTab ? (result.operations[activeTab] ?? []) : [];

  const availableTabs: TabId[] = result
    ? (['factor', 'roots', 'division'] as TabId[]).filter((t) => (result.operations[t]?.length ?? 0) > 0)
    : [];

  const exampleButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">{copy.examples}</span>
      {POLY_EXAMPLES.map((ex) => (
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
    <div className="mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      {' '}
      <section
        className="relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5"
        onKeyDown={onExpressionKeyDown}>
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

          <form onSubmit={handleSolve} className="space-y-3">
            {/* Variable */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">{copy.variableLabel}</label>
              <div className="flex flex-wrap gap-1">
                {POLY_VARIABLES.map((v) => (
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

            {/* P(x) input */}
            <div>
              <label htmlFor="poly-expr" className="mb-1 block text-xs font-semibold text-muted">
                P({variable})
              </label>
              <input
                id="poly-expr"
                ref={expressionRef}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                onFocus={() => setActiveField('expression')}
                placeholder={copy.expressionPlaceholder}
                spellCheck={false}
                autoComplete="off"
                inputMode={showKeyboard ? 'none' : 'text'}
                className={fieldClass}
              />
            </div>

            {/* Divisor input */}
            <div>
              <label htmlFor="poly-div" className="mb-1 block text-xs font-semibold text-muted">
                {copy.divisorLabel}
              </label>
              <input
                id="poly-div"
                ref={divisorRef}
                value={divisor}
                onChange={(e) => setDivisor(e.target.value)}
                onFocus={() => setActiveField('divisor')}
                placeholder={copy.divisorPlaceholder}
                spellCheck={false}
                autoComplete="off"
                inputMode={showKeyboard ? 'none' : 'text'}
                className={fieldClass}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={loading || !expression.trim()}
                className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 active:scale-[0.98] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#526C85] disabled:opacity-50">
                <Divide className="size-4" aria-hidden="true" />
                {loading ? copy.solving : copy.solveButton}
              </button>
              <button type="button" onClick={reset} className={chipClass}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {copy.reset}
              </button>
            </div>
          </form>

          {/* Keyboard popup */}
          {showKeyboard && (
            <PolynomialKeyboard
              copy={copy}
              titleId={keyboardTitleId}
              fieldLabel={activeField === 'expression' ? `P(${variable})` : copy.divisorLabel}
              value={activeField === 'expression' ? expression : divisor}
              onKey={insertKey}
              onFieldChange={setActiveField}
              activeField={activeField}
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
          <section
            className={`${panelClass} flex min-h-[200px] flex-col items-center justify-center gap-3 text-center`}>
            <span className="inline-flex size-12 items-center justify-center rounded-box bg-brass-tint text-brass-strong">
              <Sparkles className="size-5" />
            </span>
            <p className="max-w-sm text-sm text-muted">{copy.emptyResult}</p>
          </section>
        )}

        {result && !loading && (
          <div className="space-y-5">
            {/* Error banner (თუ backend-მა error დააბრუნა) */}
            {result.operations?.division?.some((s) => s.title.toLowerCase().includes('ვერ')) && (
              <div className="flex items-start gap-2 rounded-box border border-brass/30 bg-brass-tint px-3 py-2 text-xs text-brass-strong">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{result.operations.division[0]?.explanation || 'გაყოფა ვერ შესრულდა'}</span>
              </div>
            )}
            {/* Summary card */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">{copy.resultTitle}</p>
              <div className="space-y-2">
                <ResultRow
                  label={copy.expandedForm}
                  tex={result.expanded_latex}
                  copyKey="expanded"
                  copied={copied}
                  onCopy={copyText}
                  copyLabel={copy.copyLatex}
                  copiedLabel={copy.copied}
                />
                <ResultRow
                  label={copy.factoredForm}
                  tex={result.factored_latex}
                  copyKey="factored"
                  copied={copied}
                  onCopy={copyText}
                  copyLabel={copy.copyLatex}
                  copiedLabel={copy.copied}
                />
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
                  <span>
                    {copy.degree}: <span className="font-mono text-ink">{result.degree}</span>
                  </span>
                  <span>
                    {copy.leadingCoeff}:{' '}
                    <span className="font-mono text-ink">{result.leading_coeff}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Roots */}
            {/* Roots */}
            {result.roots.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">
                  {copy.rootsTitle} <span className="text-[10px] font-normal">({result.roots.length})</span>
                </p>
                <div className="space-y-2">
                  {result.roots.map((r, i) => (
                    <div
                      key={i}
                      className="overflow-x-auto rounded-box border border-hairline bg-main px-3 py-2">
                      <div className="min-w-max">
                        <KatexPreview tex={`${variable} = ${r}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Division result */}
            {result.division && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">{copy.divisionTitle}</p>
                <div className="space-y-2 overflow-x-auto rounded-box border border-hairline bg-main px-3 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 text-xs font-semibold text-muted">{copy.quotient}:</span>
                    <KatexPreview tex={result.division.quotient_latex} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="shrink-0 text-xs font-semibold text-muted">{copy.remainder}:</span>
                    <KatexPreview tex={result.division.remainder_latex} />
                  </div>
                </div>
              </div>
            )}

            {/* Step tabs */}
            {availableTabs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">{copy.stepsTitle}</p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {availableTabs.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTab(t)}
                      className={
                        'rounded-box px-3 py-1.5 text-xs font-medium transition-colors ' +
                        (activeTab === t
                          ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                          : 'border border-hairline text-muted hover:text-ink ')
                      }>
                      {t === 'factor' ? copy.tabFactor : t === 'roots' ? copy.tabRoots : copy.tabDivision}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {activeSteps.map((st, idx) => (
                    <div
                      key={idx}
                      className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                      <h3 className="text-xs font-bold text-[#465D73]">{st.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-ink/80">{st.explanation}</p>
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
                  <p className="text-xs font-semibold text-muted flex items-center gap-1.5">
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
                        {h.divisor ? ` ÷ ${h.divisor}` : ''}
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
  );
}

/* ══════════════════════════════════════════════════════════ */

function ResultRow({
  label,
  tex,
  copyKey,
  copied,
  onCopy,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  tex: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="rounded-box border border-hairline bg-main px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted">{label}</span>
        <button
          type="button"
          onClick={() => onCopy(tex, copyKey)}
          className="text-[11px] font-bold text-[#465D73] transition-colors hover:text-[#526C85]">
          {copied === copyKey ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <div className="mt-1 overflow-x-auto">
        <KatexPreview tex={tex} />
      </div>
    </div>
  );
}

function PolynomialKeyboard({
  copy,
  titleId,
  fieldLabel,
  value,
  onKey,
  onFieldChange,
  activeField,
  onClose,
}: {
  copy: Copy;
  titleId: string;
  fieldLabel: string;
  value: string;
  onKey: (key: string) => void;
  onFieldChange: (f: FieldId) => void;
  activeField: FieldId;
  onClose: () => void;
}) {
  const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];
  const extras = ['x', 'y', 'z', '+', '-', '*', '/', '^', '(', ')', '.'];

  return (
    <div
      id={titleId}
      role="region"
      aria-label={copy.keyboard}
      className="mt-4 rounded-box border border-hairline bg-main shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
          <p className="mt-0.5 text-xs text-muted">{fieldLabel}</p>
        </div>
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

        {/* Field switcher */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onFieldChange('expression')}
            className={
              'flex-1 rounded-box border px-2 py-1 text-[11px] font-semibold transition-colors ' +
              (activeField === 'expression'
                ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                : 'border-hairline bg-main text-muted ')
            }>
            P({copy.variableLabel})
          </button>
          <button
            type="button"
            onClick={() => onFieldChange('divisor')}
            className={
              'flex-1 rounded-box border px-2 py-1 text-[11px] font-semibold transition-colors ' +
              (activeField === 'divisor'
                ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                : 'border-hairline bg-main text-muted ')
            }>
            {copy.divisorLabel}
          </button>
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
          <button type="button" aria-label="backspace" className={keyClass} onClick={() => onKey('backspace')}>
            <Delete className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
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
