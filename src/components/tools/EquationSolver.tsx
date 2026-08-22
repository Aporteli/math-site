'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, RotateCcw, CheckCircle2, Keyboard, History, LineChart, Delete, X } from 'lucide-react';
// @ts-ignore
import nerdamer from 'nerdamer/all.min';
import { KatexPreview } from '@/components/math/katex-preview';
import { PageHero } from '@/components/ui/page-hero';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';

const fieldClass =
  'w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15';

const panelClass = 'rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5';

type Copy = Dictionary['equations'];

type HistoryItem = {
  equation: string;
  variable: string;
  solutions: string[];
};

interface EquationSolverProps {
  locale: Locale;
  copy: Copy;
  title: string;
  description: string;
}

// ვირტუალური კლავიატურა ლოგიკური ჯგუფებით
const KEYBOARD_GROUPS = [
  {
    label: 'ციფრები',
    keys: ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'],
  },
  {
    label: 'ცვლადები & მუდმივები',
    keys: ['x', 'y', 'z', 'a', 'b', 'c', 'pi', 'e'],
  },
  {
    label: 'ოპერატორები',
    keys: ['+', '-', '*', '/', '=', '(', ')', 'BACKSPACE'],
  },
  {
    label: 'ხარისხი & ფესვი',
    keys: ['^2', '^3', '^', 'sqrt()', 'cbrt()', 'exp()'],
  },
  {
    label: 'ფუნქციები',
    keys: ['sin()', 'cos()', 'tan()', 'asin()', 'acos()', 'log()', 'ln()', 'abs()', '!'],
  },
];

// 🚀 LaTeX ფორმატის ავტომატური გაწმენდა/გარდაქმნა სტანდარტულ ტექსტად
// 🚀 გაუმჯობესებული LaTeX გამწმენდი ფუნქცია
// 🚀 საბოლოო, მაქსიმალურად დაცული LaTeX/OCR გამწმენდი ფუნქცია
function cleanLaTeXInput(input: string): string {
  if (!input) return '';
  let cleaned = input;

  // 1. მოდულების და OCR-ით დამახინჯებული სიმბოლოების უნიფიცირება ერთიან "|" ნიშნად
  cleaned = cleaned
    .replace(/\\left\s*\\vert/g, '|')
    .replace(/\\right\s*\\vert/g, '|')
    .replace(/\\left\s*\|/g, '|')
    .replace(/\\right\s*\|/g, '|')
    .replace(/\\vert\(\)/g, '|')
    .replace(/vert\(\)/g, '|')
    .replace(/\\vert/g, '|')
    .replace(/\\lvert/g, '|')
    .replace(/\\rvert/g, '|')
    .replace(/abs\(\(\)/g, '|')
    .replace(/abs\(\)/g, '|')
    .replace(/abs\(\{/g, '|');
  cleaned = cleaned
    .replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\left\s*\{/g, '(')
    .replace(/\\right\s*\}/g, ')')
    .replace(/\\left\s*\(/g, '(')
    .replace(/\\right\s*\)/g, ')')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)');
  cleaned = cleaned
    .replace(/(sin|cos|tan|cot|sec|csc)\^([0-9a-zA-Z]+)\(([^)]+)\)/g, '($1($3))^$2')
    .replace(/log_([0-9a-zA-Z]+)/g, 'log$1');
  cleaned = cleaned.replace(/\{([^}]*)\}/g, '($1)');
  cleaned = cleaned.replace(/[{}]/g, '');
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/\|([^|]+)\|/g, 'abs($1)');
  } while (cleaned !== previous);
  cleaned = cleaned
    .replace(/[\$\\]/g, '') 
    .replace(/\|/g, '') 
    .replace(/\(\)/g, '') 
    .replace(/\(\s*\)/g, '') 
    .replace(/,+/g, ',')
    .trim();

  return cleaned;
}

export function EquationSolver({ locale, copy, title, description }: EquationSolverProps) {
  const [equation, setEquation] = useState('');
  const [solveFor, setSolveFor] = useState('x');
  const [solutions, setSolutions] = useState<string[] | null>(null);

  const [error, setError] = useState(false);
  const [liveWarning, setLiveWarning] = useState<string | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphExpr, setGraphExpr] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // ლოკალური ისტორიის ჩატვირთვა
  useEffect(() => {
    const saved = localStorage.getItem('equation-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Live Feedback სინტაქსის შემოწმებისთვის
  useEffect(() => {
    if (!equation.trim()) {
      setLiveWarning(null);
      return;
    }
    try {
      nerdamer(equation.replace('=', '-'));
      setLiveWarning(null);
    } catch {
      setLiveWarning(copy?.liveError || 'Incomplete syntax...');
    }
  }, [equation, copy]);

  const handleSolve = (e?: React.FormEvent, eqToSolve = equation, varToSolve = solveFor) => {
    if (e) e.preventDefault();

    // ვასუფთავებთ ამოხსნის წინაც უსაფრთხოებისთვის
    const cleanedEq = cleanLaTeXInput(eqToSolve);

    if (!cleanedEq.trim()) {
      setError(true);
      setSolutions(null);
      return;
    }

    try {
      const result = nerdamer.solveEquations(cleanedEq, varToSolve);
      let parsedSolutions: string[] = [];

      if (Array.isArray(result) || result.length !== undefined) {
        parsedSolutions = (result as any[]).map((res) => nerdamer(res.toString()).toTeX());
      } else {
        parsedSolutions = [nerdamer(result.toString()).toTeX()];
      }

      setSolutions(parsedSolutions);
      setError(false);

      const parts = cleanedEq.split('=');
      const lhs = parts[0] || '0';
      const rhs = parts[1] || '0';
      setGraphExpr(`(${lhs}) - (${rhs})`);
      setShowGraph(true);

      const newItem = { equation: cleanedEq, variable: varToSolve, solutions: parsedSolutions };
      const newHistory = [newItem, ...history.filter((h) => h.equation !== cleanedEq)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('equation-history', JSON.stringify(newHistory));

      setShowKeyboard(false);
    } catch (err) {
      setError(true);
      setSolutions(null);
      setShowGraph(false);
    }
  };

  // ტექსტის ჩასმა + Backspace + ავტომატური LaTeX გაწმენდა პასტის (Paste) დროს
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setEquation(cleanLaTeXInput(rawValue));
  };

  const insertText = (text: string) => {
    const input = inputRef.current;

    if (text === 'BACKSPACE') {
      if (input) {
        const start = input.selectionStart ?? equation.length;
        const end = input.selectionEnd ?? equation.length;

        if (start === end && start > 0) {
          const newEq = equation.substring(0, start - 1) + equation.substring(end);
          setEquation(newEq);
          setTimeout(() => {
            input.focus();
            input.setSelectionRange(start - 1, start - 1);
          }, 0);
        } else if (start !== end) {
          const newEq = equation.substring(0, start) + equation.substring(end);
          setEquation(newEq);
          setTimeout(() => {
            input.focus();
            input.setSelectionRange(start, start);
          }, 0);
        }
      } else {
        setEquation((prev) => prev.slice(0, -1));
      }
      return;
    }

    let cursorOffset = text.length;
    if (text.endsWith('()')) {
      cursorOffset = text.length - 1;
    }

    if (input) {
      const start = input.selectionStart ?? equation.length;
      const end = input.selectionEnd ?? equation.length;
      const newEq = equation.substring(0, start) + text + equation.substring(end);
      setEquation(newEq);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }, 0);
    } else {
      setEquation(equation + text);
    }
  };

  const applyExample = (ex: string) => {
    setEquation(ex);
    setSolveFor('x');
    handleSolve(undefined, ex, 'x');
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('equation-history');
  };

  const resetForm = () => {
    setEquation('');
    setSolutions(null);
    setError(false);
    setShowGraph(false);
  };

  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={localePath(locale, '/tools')}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy?.back || 'Back to Tools'}
        </Link>
        <div className="mt-5">
          <PageHero icon={Calculator} eyebrow={copy?.eyebrow || 'Math Tool'} title={title} description={description} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">{copy?.inputTitle || 'Equation Input'}</h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-navy/30 hover:text-navy">
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {copy?.reset || 'Reset'}
                </button>
              </div>

              <form onSubmit={handleSolve} className="mt-4">
                <div className="flex gap-2">
                  <label className="shrink-0 w-24">
                    <span className="block text-xs font-medium text-muted mb-1.5 ml-1">
                      {copy?.solveFor || 'Solve for'}
                    </span>
                    <input
                      value={solveFor}
                      onChange={(e) => setSolveFor(e.target.value)}
                      maxLength={3}
                      className={`${fieldClass} text-center font-bold`}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="block text-xs font-medium text-muted mb-1.5 ml-1">Equation</span>
                    <input
                      ref={inputRef}
                      value={equation}
                      onChange={handleInputChange}
                      placeholder="e.g., sin(x) + 1 = 0"
                      spellCheck={false}
                      className={
                        error ? `${fieldClass} border-brass focus:border-brass focus:ring-brass/20` : fieldClass
                      }
                    />
                  </label>
                </div>

                {/* ფიქსირებული სიმაღლის ბლოკი Layout Shift-ის ასაცილებლად */}
                <div className="min-h-[1.5rem] mt-2">
                  {liveWarning && !error ? (
                    <p className="text-xs text-brass-strong animate-pulse">{liveWarning}</p>
                  ) : error ? (
                    <p className="text-xs text-brass-strong">
                      {copy?.invalidEquation || 'Invalid equation. Check the syntax.'}
                    </p>
                  ) : null}
                </div>

                <div className="relative mt-2">
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy-strong">
                    <Keyboard className="size-4" />
                    {copy?.keyboard || 'Virtual Keyboard'}
                  </button>

                  {/* მოტივტივე ვირტუალური კლავიატურა */}
                  {showKeyboard && (
                    <div className="absolute left-0 top-full z-[60] w-[calc(100vw-2rem)] md:w-[48rem] max-w-[90vw] -mt-1 rounded-2xl border border-navy/10 bg-white/95 p-5 shadow-2xl backdrop-blur-md">
                      <div className="flex justify-between items-center mb-4 border-b border-hairline-soft pb-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-navy">
                          {copy?.keyboard || 'Virtual Keyboard'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowKeyboard(false)}
                          className="rounded-lg p-1.5 text-muted hover:bg-paper-deep hover:text-ink transition-colors">
                          <X className="size-4.5" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5">
                        {KEYBOARD_GROUPS.map((group, i) => (
                          <div key={i} className="flex flex-col gap-2">
                            <span className="text-[10px] font-semibold tracking-wide text-muted/80 ml-1">
                              {group.label}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {group.keys.map((k) => (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => insertText(k)}
                                  className={`flex h-8 min-w-[2.2rem] items-center justify-center rounded-lg border border-hairline-soft px-2.5 text-sm font-mono font-medium shadow-sm transition-all active:scale-95 ${
                                    k === 'BACKSPACE' || k === '='
                                      ? 'bg-navy-tint text-navy hover:border-navy/40'
                                      : 'bg-white text-ink hover:border-navy/40 hover:text-navy'
                                  }`}>
                                  {k === 'BACKSPACE' ? <Delete className="size-4" /> : k}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!!liveWarning}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60 shadow-sm">
                  <CheckCircle2 className="size-4.5" aria-hidden="true" />
                  {copy?.solveButton || 'Solve'}
                </button>
              </form>
            </section>

            <details className={panelClass} open={history.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {copy?.syntaxTitle || 'Clickable Examples'}
              </summary>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-body">
                {['2x + 5 = 15', 'x^2 - 5x + 6 = 0', 'sqrt(x) = 4', 'log(x) = 2', 'sin(x) = 0'].map((ex) => (
                  <li key={ex}>
                    <button
                      onClick={() => applyExample(ex)}
                      className="w-full text-left flex items-center gap-2 rounded-lg p-2.5 hover:bg-paper-deep transition-colors font-mono text-xs text-navy">
                      • {ex}
                    </button>
                  </li>
                ))}
              </ul>
            </details>

            {history.length > 0 && (
              <section className={panelClass}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <History className="size-4 text-muted" />
                    {copy?.history || 'Recent History'}
                  </h2>
                  <button
                    onClick={clearHistory}
                    className="text-xs font-medium text-muted hover:text-brass-strong transition-colors">
                    {copy?.clearHistory || 'Clear'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {history.map((h, i) => (
                    <li key={i}>
                      <button
                        onClick={() => {
                          setEquation(h.equation);
                          setSolveFor(h.variable);
                          setSolutions(h.solutions);
                          setShowGraph(true);
                          setGraphExpr(`(${h.equation.split('=')[0] || '0'}) - (${h.equation.split('=')[1] || '0'})`);
                        }}
                        className="w-full text-left rounded-xl border border-hairline bg-paper px-3 py-2.5 text-xs hover:border-navy/30 transition-all flex justify-between items-center group">
                        <span className="font-mono text-ink line-clamp-1 group-hover:text-navy">{h.equation}</span>
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted ml-2">
                          var: {h.variable}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>

          <div className="space-y-4">
            <section className={panelClass}>
              <h2 className="text-sm font-semibold text-ink">{copy?.resultTitle || 'Solution'}</h2>
              <div className="mt-4 min-h-[14rem] rounded-2xl border border-hairline bg-paper/50 p-6 flex flex-col items-center justify-center text-center transition-all">
                {solutions && solutions.length > 0 ? (
                  <div className="space-y-5 w-full">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Roots Found for {solveFor}:
                    </p>
                    <div className="grid gap-4 w-full max-w-lg mx-auto">
                      {solutions.map((sol, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-white px-6 py-5 shadow-sm border border-hairline overflow-x-auto hide-scrollbar">
                          <KatexPreview tex={`${solveFor}_{${idx + 1}} = ${sol}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-paper-deep text-muted">
                      <Calculator className="size-7" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted max-w-xs mx-auto">
                      {copy?.emptyResult || 'Enter an equation to see the solution here.'}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {showGraph && solveFor === 'x' && graphExpr && (
              <section className={panelClass}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink mb-4">
                  <LineChart className="size-4 text-navy" />
                  {copy?.graphTitle || 'Graphical View'}
                </h2>
                <div className="rounded-2xl border border-hairline bg-white overflow-hidden shadow-inner">
                  <MiniGraph expression={graphExpr} />
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniGraph({ expression }: { expression: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hostRef.current || !expression) return;
    let disposed = false;

    async function draw() {
      try {
        const mod = await import('function-plot');
        const functionPlot = mod.default;
        if (disposed || !hostRef.current) return;

        hostRef.current.replaceChildren();
        functionPlot({
          target: hostRef.current,
          width: hostRef.current.clientWidth || 400,
          height: 280,
          grid: true,
          xAxis: { domain: [-10, 10] },
          yAxis: { domain: [-10, 10] },
          data: [
            {
              fn: expression,
              color: '#2563eb',
              graphType: 'polyline',
            },
          ],
        });
        setError(false);
      } catch (err) {
        setError(true);
      }
    }

    draw();

    return () => {
      disposed = true;
    };
  }, [expression]);

  if (error) {
    return <div className="p-5 text-sm text-brass-strong text-center font-medium">Unable to plot this equation.</div>;
  }

  return <div ref={hostRef} className="w-full flex justify-center [&_svg]:block [&_svg]:max-w-full" />;
}
