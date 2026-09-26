'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  Check,
  Copy,
  Delete,
  Divide,
  History,
  Keyboard,
  RotateCcw,
  X,
} from 'lucide-react';
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
  copy: Copy;
}

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2.5 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800';

const keyClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800';

type FieldId = 'expression' | 'divisor';
type TabId = 'factor' | 'roots' | 'division';

function applyKey(current: string, key: string): string {
  if (key === 'backspace') return current.slice(0, -1);
  if (key === 'clear') return '';
  return current + key;
}

export function PolynomialCalculator({ copy, title, description }: Props & { title: string; description: string }) {
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

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/api/polynomial/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression,
          variable,
          divisor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || copy.invalidEquation);

      setResult(data);
      setActiveTab(data.division ? 'factor' : 'factor');

      const item: PolynomialHistoryItem = {
        expression,
        variable,
        divisor,
      };
      setHistory((prev) => {
        const next = [
          item,
          ...prev.filter(
            (h) =>
              !(
                h.expression === item.expression &&
                h.divisor === item.divisor &&
                h.variable === item.variable
              ),
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

  const activeSteps =
    result && activeTab
      ? result.operations[activeTab] ?? []
      : [];

  const availableTabs: TabId[] = result
    ? (['factor', 'roots', 'division'] as TabId[]).filter(
        (t) => (result.operations[t]?.length ?? 0) > 0,
      )
    : [];

  const exampleButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">{copy.examples}</span>
      {POLY_EXAMPLES.map((ex) => (
        <button
          key={ex.label}
          type="button"
          onClick={() => applyExample(ex)}
          className="text-xs font-semibold text-navy hover:text-navy-strong dark:text-sky-400">
          {ex.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      {/* ══════════ LEFT: Input ══════════ */}
      <section
        className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800"
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
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ' +
                (showKeyboard
                  ? 'border-navy/30 bg-navy text-white hover:bg-navy-strong'
                  : 'border-hairline bg-white text-ink hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800')
              }>
              <Keyboard className="size-3.5" aria-hidden="true" />
              {copy.keyboard}
            </button>
          </div>

          <form onSubmit={handleSolve} className="space-y-3">
            {/* Variable */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">
                {copy.variableLabel}
              </label>
              <div className="flex flex-wrap gap-1">
                {POLY_VARIABLES.map((v) => (
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
                className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-navy-strong disabled:opacity-50">
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
              fieldLabel={
                activeField === 'expression'
                  ? `P(${variable})`
                  : copy.divisorLabel
              }
              value={activeField === 'expression' ? expression : divisor}
              onKey={insertKey}
              onFieldChange={setActiveField}
              activeField={activeField}
              onClose={() => setShowKeyboard(false)}
            />
          )}

          {/* Examples */}
          <div className="mt-4 border-t border-hairline pt-3 dark:border-slate-800">
            {exampleButtons}
          </div>

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
      <section className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5 dark:bg-slate-900/60 dark:border-slate-800">
        {loading && (
          <div className="flex min-h-[200px] items-center justify-center">
            <span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-navy border-t-transparent" />
          </div>
        )}

        {!loading && !result && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{copy.emptyResult}</p>
            {exampleButtons}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-5">
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
                    {copy.degree}:{' '}
                    <span className="font-mono text-ink dark:text-slate-200">
                      {result.degree}
                    </span>
                  </span>
                  <span>
                    {copy.leadingCoeff}:{' '}
                    <span className="font-mono text-ink dark:text-slate-200">
                      {result.leading_coeff}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Roots */}
            {result.roots.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">
                  {copy.rootsTitle}
                </p>
                <div className="flex flex-wrap gap-2">
                  {result.roots.map((r, i) => (
                    <span
                      key={i}
                      className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-sm dark:bg-slate-900 dark:border-slate-700">
                      <KatexPreview tex={`${variable} = ${r}`} />
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Division result */}
            {result.division && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">
                  {copy.divisionTitle}
                </p>
                <div className="overflow-x-auto rounded-xl border border-hairline bg-white px-3 py-3 dark:bg-slate-900 dark:border-slate-700">
                  <KatexPreview
                    tex={`\\text{${copy.quotient}}:\\; ${result.division.quotient_latex}`}
                  />
                  <div className="mt-2">
                    <KatexPreview
                      tex={`\\text{${copy.remainder}}:\\; ${result.division.remainder_latex}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step tabs */}
            {availableTabs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">
                  {copy.stepsTitle}
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {availableTabs.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setActiveTab(t)}
                      className={
                        'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ' +
                        (activeTab === t
                          ? 'bg-navy text-white dark:bg-sky-600'
                          : 'border border-hairline text-muted hover:text-ink dark:border-slate-700')
                      }>
                      {t === 'factor'
                        ? copy.tabFactor
                        : t === 'roots'
                          ? copy.tabRoots
                          : copy.tabDivision}
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  {activeSteps.map((st, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-hairline bg-paper/30 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <h3 className="text-xs font-bold text-navy dark:text-sky-400">
                        {st.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-ink/80 dark:text-slate-300">
                        {st.explanation}
                      </p>
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
                        className="w-full overflow-x-auto rounded-lg border border-hairline-soft bg-white px-2 py-1.5 text-left font-mono text-[11px] text-body transition-colors hover:border-navy/30 hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800">
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
    <div className="rounded-xl border border-hairline bg-white px-3 py-2 dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted">{label}</span>
        <button
          type="button"
          onClick={() => onCopy(tex, copyKey)}
          className="text-[11px] font-semibold text-navy hover:text-navy-strong dark:text-sky-400">
          {copied === copyKey ? (
            <Check className="size-3.5 text-emerald-500" />
          ) : (
            <Copy className="size-3.5" />
          )}
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
      className="mt-4 rounded-2xl border border-hairline bg-white shadow-sm dark:bg-slate-900 dark:border-slate-700">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3 dark:border-slate-700">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
          <p className="mt-0.5 text-xs text-muted">{fieldLabel}</p>
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

        {/* Field switcher */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onFieldChange('expression')}
            className={
              'flex-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ' +
              (activeField === 'expression'
                ? 'border-navy bg-navy text-white'
                : 'border-hairline bg-white text-muted dark:bg-slate-800 dark:border-slate-700')
            }>
            P({copy.variableLabel})
          </button>
          <button
            type="button"
            onClick={() => onFieldChange('divisor')}
            className={
              'flex-1 rounded-lg border px-2 py-1 text-[11px] font-semibold transition-colors ' +
              (activeField === 'divisor'
                ? 'border-navy bg-navy text-white'
                : 'border-hairline bg-white text-muted dark:bg-slate-800 dark:border-slate-700')
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