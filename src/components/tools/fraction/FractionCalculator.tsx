'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Delete, Keyboard, Plus, RotateCcw, Undo2, X } from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  evaluateExpression,
  FractionError,
  type FractionEvalResult,
  type FractionOp,
} from '@/lib/math/tools/fractions';

export type FractionCalculatorCopy = Dictionary['fractionTool'];

type Op = FractionOp;
type TermKind = 'whole' | 'fraction' | 'mixed';
type ActivePart = 'whole' | 'n' | 'd';
type ActiveField = { termIndex: number; part: ActivePart };

type FractionTerm = {
  type: 'fraction';
  kind: TermKind;
  whole: string;
  n: string;
  d: string;
};

type Term = FractionTerm | { type: 'op'; op: Op };

type LastGood = {
  expr: string;
  result: string;
  mixed: string;
  decimal: string;
  plain: string;
};

type Props = {
  copy: FractionCalculatorCopy;
};

const MAX_FRACTIONS = 8;
const HISTORY_KEY = 'mathlab.fraction.history';

const INITIAL_TERMS: Term[] = [
  { type: 'fraction', kind: 'fraction', whole: '', n: '1', d: '2' },
  { type: 'op', op: '+' },
  { type: 'fraction', kind: 'fraction', whole: '', n: '1', d: '3' },
];

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-center font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

const keyClass =
  'inline-flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15';

const chipClass =
  'inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint disabled:cursor-not-allowed disabled:opacity-50';

function applyKey(current: string, key: string): string {
  if (key === 'backspace') return current.slice(0, -1);
  if (key === 'clear') return '';
  if (key === 'sign') {
    return current.startsWith('-') ? current.slice(1) : `-${current}`;
  }
  if (key === '.') {
    if (current.includes('.')) return current;
    if (current === '' || current === '-') return `${current}0.`;
    return `${current}.`;
  }
  if (current === '0') return key;
  if (current === '-0') return `-${key}`;
  return current + key;
}

function decimalLatex(out: FractionEvalResult): string {
  const r = out.forms.repeating;
  if (!r) return out.forms.decimal;
  const head = out.forms.decimal.split('.')[0] ?? '0';
  return `${head}.${r.nonRepeating}\\overline{${r.repeating}}`;
}

function isTerms(value: unknown): value is Term[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const t = item as Term;
    if (t.type === 'op') {
      return t.op === '+' || t.op === '-' || t.op === '*' || t.op === '/';
    }
    return (
      t.type === 'fraction' &&
      (t.kind === 'whole' || t.kind === 'fraction' || t.kind === 'mixed') &&
      typeof t.whole === 'string' &&
      typeof t.n === 'string' &&
      typeof t.d === 'string'
    );
  });
}
type HistoryEntry = { tex: string; terms: Term[] };

function isHistory(value: unknown): value is HistoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as HistoryEntry).tex === 'string' &&
        isTerms((item as HistoryEntry).terms),
    )
  );
}

function FractionFields({
  term,
  nLabel,
  dLabel,
  wholeLabel,
  legend,
  activePart,
  errorPart,
  onChange,
  onFocus,
  keyboardOpen,
}: {
  term: FractionTerm;
  nLabel: string;
  dLabel: string;
  wholeLabel: string;
  legend: string;
  activePart: ActivePart | null;
  errorPart: ActivePart | null;
  onChange: (part: ActivePart, value: string) => void;
  onFocus: (part: ActivePart) => void;
  keyboardOpen: boolean;
}) {
  const baseId = useId();

  function ring(part: ActivePart) {
    if (errorPart === part) return ' border-navy ring-2 ring-navy/30';
    if (activePart === part) return ' border-navy/40 ring-2 ring-navy/20';
    return '';
  }

  function renderInput(part: ActivePart, label: string, value: string) {
    const id = `${baseId}-${part}`;
    return (
      <>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <input
          id={id}
          className={`${fieldClass}${ring(part)}`}
          inputMode={keyboardOpen ? 'none' : 'decimal'}
          value={value}
          onChange={(e) => onChange(part, e.target.value)}
          onFocus={(e) => {
            onFocus(part);
            if (keyboardOpen) e.currentTarget.select();
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </>
    );
  }

  return (
    <fieldset className="min-w-0 w-full">
      <legend className="sr-only">{legend}</legend>
      <div className="flex items-center gap-2">
        {term.kind !== 'fraction' ? (
          <div className="min-w-0 flex-1">{renderInput('whole', wholeLabel, term.whole)}</div>
        ) : null}
        {term.kind !== 'whole' ? (
          <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
            {renderInput('n', nLabel, term.n)}
            <div className="border-t border-hairline" />
            {renderInput('d', dLabel, term.d)}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

function FractionKeyboardPopup({
  copy,
  titleId,
  fieldLabel,
  value,
  onKey,
  onNext,
  onClose,
}: {
  copy: FractionCalculatorCopy;
  titleId: string;
  fieldLabel: string;
  value: string;
  onKey: (key: string) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const digits = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

  return (
    <div
      id={titleId}
      role="region"
      aria-label={copy.keyboard}
      className="mt-4 rounded-2xl border border-hairline bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
          <p className="mt-0.5 text-xs text-muted">{fieldLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.keyboardClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-paper hover:text-navy">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="overflow-x-auto rounded-xl border border-hairline bg-paper px-3 py-2 text-center font-mono text-lg text-ink">
          {value || '\u00a0'}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {digits.map((digit) => (
            <button key={digit} type="button" className={keyClass} onClick={() => onKey(digit)}>
              {digit}
            </button>
          ))}
          <button type="button" className={keyClass} onClick={() => onKey('.')}>
            .
          </button>
          <button type="button" className={keyClass} onClick={() => onKey('0')}>
            0
          </button>
          <button type="button" aria-label={copy.backspace} className={keyClass} onClick={() => onKey('backspace')}>
            <Delete className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button type="button" className={keyClass} onClick={() => onKey('sign')}>
            ±
          </button>
          <button type="button" className={keyClass} onClick={() => onKey('clear')}>
            {copy.clear}
          </button>
          <button type="button" className={keyClass} onClick={onNext}>
            {copy.nextField}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FractionCalculator({ copy }: Props) {
  const [terms, setTerms] = useState<Term[]>(INITIAL_TERMS);
  const [activeField, setActiveField] = useState<ActiveField>({
    termIndex: 0,
    part: 'n',
  });
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [copied, setCopied] = useState<'latex' | 'text' | null>(null);
  type HistoryEntry = {
    tex: string;
    terms: Term[];
  };
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [ready, setReady] = useState(false);
  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<Term[][]>([]);
  const lastGoodRef = useRef<LastGood | null>(null);
  const lastHistoryItem = useRef('');

  const fields = terms
    .filter((t): t is FractionTerm => t.type === 'fraction')
    .map((t) => ({
      whole: t.kind === 'fraction' ? '' : t.whole,
      n: t.kind === 'whole' ? t.whole : t.n,
      d: t.kind === 'whole' ? '' : t.d,
    }));

  const ops = terms.filter((t): t is Extract<Term, { type: 'op' }> => t.type === 'op').map((t) => t.op);

  let exprTex = lastGoodRef.current?.expr ?? '';
  let resultTex = lastGoodRef.current?.result ?? '';
  let mixedTex = lastGoodRef.current?.mixed ?? '';
  let decimalTex = lastGoodRef.current?.decimal ?? '';
  let plainResult = lastGoodRef.current?.plain ?? '';
  let errorMessage = '';
  let errorIndex: number | undefined;
  let errorField: ActivePart | undefined;
  let mathError = false;

  try {
    const out = evaluateExpression(fields, ops, 'precedence');
    exprTex = out.expressionLatex;
    resultTex = out.forms.latex;
    mixedTex = out.forms.mixedLatex;
    decimalTex = decimalLatex(out);
    plainResult = `${out.forms.plain}`;
    lastGoodRef.current = {
      expr: exprTex,
      result: resultTex,
      mixed: mixedTex,
      decimal: decimalTex,
      plain: `${out.expressionLatex} = ${out.forms.plain}`,
    };
  } catch (e) {
    if (e instanceof FractionError) {
      errorMessage = copy.errors[e.code];
      errorIndex = e.index;
      errorField = e.field === 'whole' || e.field === 'n' || e.field === 'd' ? e.field : undefined;
      mathError = e.code === 'ZERO_DENOMINATOR' || e.code === 'DIVISION_BY_ZERO';
    } else {
      errorMessage = copy.invalid;
    }
  }

  useEffect(() => {
    if (!showKeyboard) return;
    function handlePointerDown(event: PointerEvent) {
      if (!keyboardRootRef.current?.contains(event.target as Node)) {
        setShowKeyboard(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showKeyboard]);

  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get('f');
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isTerms(parsed)) setTerms(parsed);
      }
    } catch {
      /* ignore */
    }
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (isHistory(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    url.searchParams.set('f', JSON.stringify(terms));
    window.history.replaceState(null, '', url);
  }, [ready, terms]);

  useEffect(() => {
    if (errorMessage || !lastGoodRef.current) return;
    const item: HistoryEntry = {
      tex: `${lastGoodRef.current.expr} = ${lastGoodRef.current.result}`,
      terms,
    };
    if (item.tex === lastHistoryItem.current) return;
    lastHistoryItem.current = item.tex;
    setHistory((prev) => {
      const next = [item, ...prev.filter((x) => x.tex !== item.tex)].slice(0, 8);

      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, [resultTex, errorMessage]);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(null), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  const fractionCount = terms.filter((t) => t.type === 'fraction').length;

  function commit(next: Term[]) {
    pastRef.current = [...pastRef.current, terms].slice(-30);
    setCanUndo(pastRef.current.length > 0);
    setTerms(next);
  }

  function updateFraction(index: number, part: ActivePart, value: string) {
    setTerms((prev) =>
      prev.map((term, i) => (i === index && term.type === 'fraction' ? { ...term, [part]: value } : term)),
    );
  }

  function setKind(index: number, kind: TermKind) {
    commit(
      terms.map((term, i) => {
        if (i !== index || term.type !== 'fraction') return term;
        if (kind === 'whole') {
          return {
            ...term,
            kind,
            whole: term.whole || term.n || '1',
          };
        }
        if (kind === 'fraction') {
          return { ...term, kind, n: term.n || '1', d: term.d || '1' };
        }
        return {
          ...term,
          kind,
          whole: term.whole || '1',
          n: term.n || '1',
          d: term.d || '2',
        };
      }),
    );
    setActiveField({
      termIndex: index,
      part: kind === 'fraction' ? 'n' : 'whole',
    });
  }

  function updateOp(index: number, op: Op) {
    commit(terms.map((term, i) => (i === index && term.type === 'op' ? { ...term, op } : term)));
  }

  function addFraction(op: Op = '+') {
    if (fractionCount >= MAX_FRACTIONS) return;
    const nextIndex = terms.length + 1;
    commit([...terms, { type: 'op', op }, { type: 'fraction', kind: 'fraction', whole: '', n: '1', d: '1' }]);
    setActiveField({ termIndex: nextIndex, part: 'n' });
  }

  function removeFraction(index: number) {
    if (fractionCount <= 1) return;
    const next = [...terms];
    if (index > 0 && next[index - 1]?.type === 'op') {
      next.splice(index - 1, 2);
    } else if (next[index + 1]?.type === 'op') {
      next.splice(index, 2);
    } else {
      next.splice(index, 1);
    }
    commit(next);
    setActiveField({ termIndex: 0, part: 'n' });
  }

  function reset() {
    commit(INITIAL_TERMS);
    setActiveField({ termIndex: 0, part: 'n' });
  }

  function undo() {
    const prev = pastRef.current.pop();
    if (!prev) return;
    setCanUndo(pastRef.current.length > 0);
    setTerms(prev);
  }

  function applyExample(kind: 'add' | 'mixed' | 'whole') {
    if (kind === 'add') {
      commit(INITIAL_TERMS);
      setActiveField({ termIndex: 0, part: 'n' });
      return;
    }
    if (kind === 'mixed') {
      commit([
        { type: 'fraction', kind: 'mixed', whole: '2', n: '1', d: '3' },
        { type: 'op', op: '-' },
        { type: 'fraction', kind: 'mixed', whole: '1', n: '1', d: '6' },
      ]);
      setActiveField({ termIndex: 0, part: 'whole' });
      return;
    }
    commit([
      { type: 'fraction', kind: 'whole', whole: '5', n: '', d: '' },
      { type: 'op', op: '+' },
      { type: 'fraction', kind: 'fraction', whole: '', n: '1', d: '2' },
    ]);
    setActiveField({ termIndex: 0, part: 'whole' });
  }

  function applyHistory(entry: HistoryEntry) {
    lastHistoryItem.current = entry.tex;
    commit(entry.terms);
    const first = entry.terms.findIndex((t) => t.type === 'fraction');
    const term = first >= 0 ? entry.terms[first] : undefined;
    setActiveField({
      termIndex: first < 0 ? 0 : first,
      part: term?.type === 'fraction' && term.kind !== 'fraction' ? 'whole' : 'n',
    });
  }

  function allFieldOrder(): ActiveField[] {
    const order: ActiveField[] = [];
    terms.forEach((term, i) => {
      if (term.type !== 'fraction') return;
      if (term.kind !== 'fraction') order.push({ termIndex: i, part: 'whole' });
      if (term.kind !== 'whole') {
        order.push({ termIndex: i, part: 'n' });
        order.push({ termIndex: i, part: 'd' });
      }
    });
    return order;
  }

  function activeFieldLabel(): string {
    const term = terms[activeField.termIndex];
    if (term?.type !== 'fraction') return '';
    const num = terms.slice(0, activeField.termIndex).filter((t) => t.type === 'fraction').length + 1;
    const part =
      activeField.part === 'whole' ? copy.whole : activeField.part === 'n' ? copy.numerator : copy.denominator;
    return `${copy.fractionLabel} ${num} · ${part}`;
  }

  function activeFieldValue(): string {
    const term = terms[activeField.termIndex];
    if (term?.type !== 'fraction') return '';
    return term[activeField.part];
  }

  function insertKey(key: string) {
    const term = terms[activeField.termIndex];
    if (term?.type !== 'fraction') return;
    const part = activeField.part;
    if (term.kind === 'whole' && part !== 'whole') return;
    if (term.kind === 'fraction' && part === 'whole') return;
    updateFraction(activeField.termIndex, part, applyKey(term[part], key));
  }

  function goNextField() {
    const order = allFieldOrder();
    if (order.length === 0) return;
    const i = order.findIndex((f) => f.termIndex === activeField.termIndex && f.part === activeField.part);
    setActiveField(order[(i + 1) % order.length]!);
  }

  function onExpressionKeyDown(event: KeyboardEvent<HTMLElement>) {
    const key = event.key;
    const asOp: Op | undefined =
      key === '+' || key === '-' || key === '*' || key === '/' ? key : key === 'x' || key === 'X' ? '*' : undefined;

    if (asOp) {
      event.preventDefault();
      const last = terms[terms.length - 1];
      if (last?.type === 'op') {
        updateOp(terms.length - 1, asOp);
        return;
      }
      addFraction(asOp);
      return;
    }

    if (key === 'Escape') setShowKeyboard(false);
  }

  async function copyValue(kind: 'latex' | 'text') {
    const latex = `${exprTex} = ${resultTex}`;
    const text = lastGoodRef.current?.plain ?? plainResult;
    await navigator.clipboard.writeText(kind === 'latex' ? latex : text);
    setCopied(kind);
  }

  const exampleButtons = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted">{copy.examples}</span>
      <button
        type="button"
        onClick={() => applyExample('add')}
        className="text-xs font-semibold text-navy hover:text-navy-strong">
        1/2 + 1/3
      </button>
      <button
        type="button"
        onClick={() => applyExample('mixed')}
        className="text-xs font-semibold text-navy hover:text-navy-strong">
        2 1/3 − 1 1/6
      </button>
      <button
        type="button"
        onClick={() => applyExample('whole')}
        className="text-xs font-semibold text-navy hover:text-navy-strong">
        5 + 1/2
      </button>
    </div>
  );

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <section
        className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5"
        onKeyDown={onExpressionKeyDown}>
        <div ref={keyboardRootRef}>
          <div className="mb-3 flex justify-end md:hidden">
            <button
              type="button"
              aria-expanded={showKeyboard}
              aria-controls={keyboardTitleId}
              aria-haspopup="true"
              onClick={() => setShowKeyboard((open) => !open)}
              className={
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ' +
                (showKeyboard
                  ? 'border-navy/30 bg-navy text-white hover:bg-navy-strong'
                  : 'border-hairline bg-white text-ink hover:bg-navy-tint')
              }>
              <Keyboard className="size-4" aria-hidden="true" />
              {copy.keyboard}
            </button>
          </div>

          <div className="flex w-full flex-col gap-3">
            {terms.map((term, index) => {
              if (term.type === 'op') {
                return (
                  <div key={`op-${index}`} className="flex shrink-0 justify-center">
                    <label htmlFor={`${keyboardTitleId}-op-${index}`} className="sr-only">
                      {copy.operation}
                    </label>
                    <select
                      id={`${keyboardTitleId}-op-${index}`}
                      value={term.op}
                      onChange={(e) => updateOp(index, e.target.value as Op)}
                      className="h-10 rounded-xl border border-hairline bg-white px-2 text-sm font-semibold text-ink">
                      <option value="+">+</option>
                      <option value="-">−</option>
                      <option value="*">×</option>
                      <option value="/">÷</option>
                    </select>
                  </div>
                );
              }

              const fractionIndex = terms.slice(0, index).filter((t) => t.type === 'fraction').length;
              const kinds: TermKind[] = ['whole', 'fraction', 'mixed'];

              return (
                <div key={`frac-${index}`} className="w-full rounded-xl border border-hairline bg-white p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex rounded-lg border border-hairline p-0.5">
                      {kinds.map((kind) => (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setKind(index, kind)}
                          className={
                            'rounded-md px-2 py-1 text-[11px] font-semibold ' +
                            (term.kind === kind ? 'bg-navy text-white' : 'bg-transparent text-muted')
                          }>
                          {kind === 'whole' ? copy.kindWhole : kind === 'mixed' ? copy.kindMixed : copy.kindFraction}
                        </button>
                      ))}
                    </div>
                    {fractionCount > 1 ? (
                      <button
                        type="button"
                        aria-label={copy.removeFraction}
                        onClick={() => removeFraction(index)}
                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-paper hover:text-navy">
                        <X className="size-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  <FractionFields
                    term={term}
                    nLabel={copy.numerator}
                    dLabel={copy.denominator}
                    wholeLabel={copy.whole}
                    legend={`${copy.fractionLabel} ${fractionIndex + 1}`}
                    activePart={activeField.termIndex === index ? activeField.part : null}
                    errorPart={errorIndex === fractionIndex ? (errorField ?? null) : null}
                    onChange={(part, value) => updateFraction(index, part, value)}
                    onFocus={(part) => setActiveField({ termIndex: index, part })}
                    keyboardOpen={showKeyboard}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addFraction()}
              disabled={fractionCount >= MAX_FRACTIONS}
              className={chipClass}>
              <Plus className="size-4" aria-hidden="true" />
              {copy.addFraction}
            </button>
            <button type="button" onClick={undo} disabled={!canUndo} className={chipClass}>
              <Undo2 className="size-4" aria-hidden="true" />
              {copy.undo}
            </button>
            <button type="button" onClick={reset} className={chipClass}>
              <RotateCcw className="size-4" aria-hidden="true" />
              {copy.reset}
            </button>
          </div>
          {fractionCount >= MAX_FRACTIONS ? (
            <p className="mt-2 text-xs text-muted">{copy.maxTerms.replace('{max}', String(MAX_FRACTIONS))}</p>
          ) : null}

          <div className="mt-3">{exampleButtons}</div>

          {showKeyboard ? (
            <div className="md:hidden">
              <FractionKeyboardPopup
                copy={copy}
                titleId={keyboardTitleId}
                fieldLabel={activeFieldLabel()}
                value={activeFieldValue()}
                onKey={insertKey}
                onNext={goNextField}
                onClose={() => setShowKeyboard(false)}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
        {errorMessage ? (
          <p className={`mb-3 text-sm font-semibold ${mathError ? 'text-navy' : 'text-muted'}`}>{errorMessage}</p>
        ) : null}

        {exprTex ? (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">{copy.expression}</p>
              <div className="overflow-x-auto rounded-xl border border-hairline bg-white px-3 py-3 text-ink">
                <KatexPreview tex={exprTex} displayMode />
              </div>
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted">{copy.result}</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => void copyValue('latex')}
                    className="text-xs font-semibold text-navy hover:text-navy-strong">
                    {copied === 'latex' ? copy.copied : copy.copyLatex}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyValue('text')}
                    className="text-xs font-semibold text-navy hover:text-navy-strong">
                    {copied === 'text' ? copy.copied : copy.copyText}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-hairline bg-white px-3 py-3 text-ink">
                <KatexPreview tex={resultTex} displayMode />
              </div>
              {mixedTex ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-body">
                  <span className="text-xs font-semibold text-muted">{copy.mixedResult}</span>
                  <KatexPreview tex={mixedTex} />
                </div>
              ) : null}
              {decimalTex ? (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-body">
                  <span className="text-xs font-semibold text-muted">{copy.decimalResult}</span>
                  <KatexPreview tex={decimalTex} />
                </div>
              ) : null}
            </div>
            {history.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold text-muted">{copy.history}</p>
                <ul className="space-y-2">
                  {history.map((item) => (
                    <li key={item.tex}>
                      <button
                        type="button"
                        onClick={() => applyHistory(item)}
                        className="w-full overflow-x-auto rounded-xl border border-hairline-soft bg-white px-3 py-2 text-left transition-colors hover:border-navy/30 hover:bg-navy-tint">
                        <KatexPreview tex={item.tex} />
                      </button>{' '}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted">{copy.invalid}</p>
            {exampleButtons}
          </div>
        )}
      </section>
    </div>
  );
}
