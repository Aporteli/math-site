'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calculator,
  RotateCcw,
  Keyboard,
  History,
  LineChart,
  Delete,
  X,
  ListOrdered,
  Copy,
  Check,
  Download,
  FileText,
  BookOpen,
  Table2,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import { localePath, type Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/types';
import {
  solve,
  type MethodId,
  type MethodSolution,
  type SolutionStep,
  type QuadraticSolution,
} from '../../../lib/math/tools/quadratic';
import type { AnalysisRow } from '../../../lib/math/tools/quadratic/types/quadratic';

const fieldClass =
  'w-full min-w-0 rounded-box border border-hairline bg-searchInput px-3 py-2 font-mono text-sm text-searchInputText shadow-sm transition-colors placeholder:text-muted focus:border-navy focus:outline-none';

const panelClass =
  'relative overflow-hidden rounded-box border border-hairline bg-main p-4 shadow-sm before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-brass sm:p-5';

type CopyDict = Dictionary['equations'];

type HistoryItem = {
  equation: string;
  variable: string;
  solutions: string[];
};

interface QuadraticCalculatorProps {
  locale: Locale;
  copy: CopyDict;
  title: string;
  description: string;
}

const KEYBOARD_GROUPS = [
  {
    label: 'ციფრები',
    keys: ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'],
  },
  { label: 'ცვლადები', keys: ['x', 'y', 'a', 'b', 'c'] },
  {
    label: 'ოპერატორები',
    keys: ['+', '-', '*', '/', '=', '(', ')', 'BACKSPACE'],
  },
  { label: 'ხარისხი', keys: ['^2', '^'] },
];

const PRESETS = [
  { label: 'სტანდარტული', eq: 'x^2 - 5x + 6 = 0' },
  { label: 'ორმაგი ფესვი', eq: 'x^2 - 6x + 9 = 0' },
  { label: 'კომპლექსური', eq: 'x^2 + 4x + 8 = 0' },
  { label: 'არასრული (b=0)', eq: '2x^2 - 18 = 0' },
  { label: 'არასრული (c=0)', eq: '3x^2 + 12x = 0' },
  { label: 'რადიკალი', eq: '2x^2 - 7x + 2 = 0' },
  { label: 'პარამეტრი a', eq: 'x^2 - 2(a-1)x + a + 5 = 0' },
];

const METHOD_TABS: { id: MethodId; label: string }[] = [
  { id: 'discriminant', label: 'დისკრიმინანტი' },
  { id: 'complete_square', label: 'კვადრატის შევსება' },
  { id: 'vieta', label: 'ვიეტა' },
  { id: 'factoring', label: 'ფაქტორიზაცია' },
];

function cleanLaTeXInput(input: string): string {
  if (!input) return '';
  let cleaned = input;
  cleaned = cleaned.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
  cleaned = cleaned.replace(/\\frac\s*\{([^}]*)\}\s*\{([^}]*)\}/g, '($1)/($2)');
  cleaned = cleaned.replace(/\\sqrt\s*\{([^}]*)\}/g, 'sqrt($1)');
  cleaned = cleaned.replace(/[\$\\]/g, '').replace(/\s+/g, '');
  cleaned = cleaned.replace(/\)\(/g, ')*(');
  cleaned = cleaned.replace(/([0-9])([a-zA-Z(])/g, '$1*$2');
  if (!cleaned.includes('=')) cleaned = cleaned + '=0';
  return cleaned;
}

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function QuadraticCalculator({ locale, copy, title, description }: QuadraticCalculatorProps) {
  const [equation, setEquation] = useState('x^2 - 5x + 6 = 0');
  const [solveFor, setSolveFor] = useState('x');
  const [solutions, setSolutions] = useState<string[] | null>(null);
  const [method, setMethod] = useState<MethodId>('discriminant');
  const [methods, setMethods] = useState<MethodSolution[]>([]);
  const [analysisRows, setAnalysisRows] = useState<AnalysisRow[]>([]);
  const [fullSolution, setFullSolution] = useState<QuadraticSolution | null>(null);
  const [graphMeta, setGraphMeta] = useState<{
    a: number;
    b: number;
    c: number;
    vertex: { x: number; y: number };
    roots: number[];
    yIntercept: number;
    direction: 'up' | 'down';
  } | null>(null);
  const [exportPack, setExportPack] = useState<{
    markdown: string;
    latex: string;
    summary: string;
  } | null>(null);

  const [academicMode, setAcademicMode] = useState(true);
  const [error, setError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('quadratic-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
    handleSolve(undefined, 'x^2 - 5x + 6 = 0', 'x');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSteps: SolutionStep[] = useMemo(() => {
    const m = methods.find((x) => x.method === method);
    if (!m) return methods[0]?.steps ?? [];
    if (!academicMode) {
      // compact: only last step + title of first
      const steps = m.steps;
      if (steps.length <= 2) return steps;
      return [steps[0], steps[steps.length - 1]];
    }
    return m.steps;
  }, [methods, method, academicMode]);

  const availableMethodTabs = useMemo(() => {
    const ids = new Set(methods.map((m) => m.method));
    return METHOD_TABS.filter((t) => ids.has(t.id));
  }, [methods]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSolve = (e?: React.FormEvent, eqToSolve = equation, varToSolve = solveFor) => {
    if (e) e.preventDefault();
    const cleanedEq = cleanLaTeXInput(eqToSolve);

    if (!cleanedEq.trim() || !cleanedEq.includes('=')) {
      setError(true);
      setErrorMsg('განტოლება ცარიელია ან ტოლობის ნიშანი აკლია');
      setSolutions(null);
      setMethods([]);
      setAnalysisRows([]);
      setFullSolution(null);
      setGraphMeta(null);
      setExportPack(null);
      return;
    }

    try {
      const result = solve(cleanedEq, varToSolve);

      if (result.mode === 'parametric') {
        setSolutions([result.parametric.root1Latex, result.parametric.root2Latex]);
        setMethods(result.methods as MethodSolution[]);
        setAnalysisRows(result.analysisRows);
        setFullSolution(null);
        setGraphMeta(null);
        setExportPack({
          markdown: result.markdown,
          latex: result.latex,
          summary: result.summary,
        });
        setMethod('discriminant');
        setError(false);
        setErrorMsg('');
        setHistory((prev) => {
          const item: HistoryItem = {
            equation: cleanedEq,
            variable: varToSolve,
            solutions: [result.parametric.root1Latex, result.parametric.root2Latex],
          };
          const next = [item, ...prev.filter((h) => h.equation !== cleanedEq)].slice(0, 20);
          localStorage.setItem('quadratic-history', JSON.stringify(next));
          return next;
        });
        return;
      }

      setSolutions(result.solution.roots.map((r) => r.exact));
      setMethods(result.methods);
      setAnalysisRows(result.analysisRows);
      setFullSolution(result.solution);
      setGraphMeta(result.graph);
      setExportPack({
        markdown: result.markdown,
        latex: result.latex,
        summary: result.summary,
      });
      setError(false);
      setErrorMsg('');

      const ids = result.methods.map((m) => m.method);
      if (!ids.includes(method)) {
        setMethod(ids[0] ?? 'discriminant');
      }

      setHistory((prev) => {
        const item: HistoryItem = {
          equation: cleanedEq,
          variable: varToSolve,
          solutions: result.solution.roots.map((r) => r.exact),
        };
        const next = [item, ...prev.filter((h) => h.equation !== cleanedEq)].slice(0, 20);
        localStorage.setItem('quadratic-history', JSON.stringify(next));
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ამოხსნის შეცდომა';
      setError(true);
      setErrorMsg(msg);
      setSolutions(null);
      setMethods([]);
      setAnalysisRows([]);
      setFullSolution(null);
      setGraphMeta(null);
      setExportPack(null);
    }
  };

  const insertKey = (key: string) => {
    if (key === 'BACKSPACE') {
      setEquation((s) => s.slice(0, -1));
      return;
    }
    setEquation((s) => s + key);
    inputRef.current?.focus();
  };

  const graphExpr = graphMeta && solveFor === 'x' ? `${graphMeta.a}*x^2 + (${graphMeta.b})*x + (${graphMeta.c})` : '';

  return (
<div className="mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">        {/* ─── Left: input ─── */}
        <div className="space-y-4">
          <section className={panelClass}>
            <form onSubmit={handleSolve} className="space-y-2" autoComplete="off" spellCheck={false}>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted mb-0.5" htmlFor="quadratic-eq">
                  განტოლება
                </label>
                <input
                  ref={inputRef}
                  id="quadratic-eq"
                  className={fieldClass}
                  value={equation}
                  onChange={(e) => setEquation(e.target.value)}
                  placeholder="x^2 - 5x + 6 = 0"
                  spellCheck={false}
                  autoComplete="off"
                />
                <KatexPreview
                  tex={equation}
                  className="mt-1 border border-hairline rounded-box p-2 text-ink text-base bg-sectionHeader /40"
                />
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <label className="text-xs text-muted mr-2" htmlFor="quadratic-var">
                  ცვლადი
                </label>
                <select
                  id="quadratic-var"
                  className="rounded-box border border-hairline bg-main px-2 py-1.5 text-sm"
                  value={solveFor}
                  onChange={(e) => setSolveFor(e.target.value)}>
                  {['x', 'y', 'a', 'b', 'c', 't'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
                <div className="flex-1" />
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 cursor-pointer rounded-box bg-[#465D73] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 active:scale-[0.98] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#526C85] transition">
                  <Calculator className="size-4" /> ამოხსნა
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEquation('');
                    setSolutions(null);
                    setMethods([]);
                    setAnalysisRows([]);
                    setFullSolution(null);
                    setGraphMeta(null);
                    setExportPack(null);
                    setError(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-box border border-hairline px-3 py-2 text-sm text-muted hover:text-ink transition">
                  <RotateCcw className="size-3.5" /> გასუფთავება
                </button>
              </div>
            </form>

            {/* Presets */}
            <div className="mt-3 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.eq}
                  type="button"
                  onClick={() => {
                    setEquation(p.eq);
                    handleSolve(undefined, p.eq, solveFor);
                  }}
                  className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted transition hover:bg-sectionHeader hover:text-ink">
                  {p.label}
                </button>
              ))}
            </div>

            {/* Keyboard toggle */}
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowKeyboard((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition">
                <Keyboard className="size-3.5" />
                {showKeyboard ? 'კლავიატურის დამალვა' : 'კლავიატურა'}
              </button>
            </div>

            {showKeyboard && (
              <div className="mt-2 space-y-2">
                {KEYBOARD_GROUPS.map((g) => (
                  <div key={g.label}>
                    <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted">{g.label}</div>
                    <div className="flex flex-wrap gap-1">
                      {g.keys.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => insertKey(k)}
                          className="min-w-[2rem] rounded-box border border-hairline bg-sectionHeader px-2 py-1.5 font-mono text-xs hover:bg-sectionHeader transition">
                          {k === 'BACKSPACE' ? <Delete className="size-3.5" /> : k}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && (
              <p className="mt-3 rounded-box border border-rose-500/30 bg-rose-500/15 px-3 py-2 text-xs text-rose-500">
                {errorMsg || 'შეცდომა'}
              </p>
            )}
          </section>

          {/* History */}
          {history.length > 0 && (
            <section className={panelClass}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <History className="size-4 text-brass-strong" /> ისტორია
              </h2>
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                {history.map((h, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="w-full rounded-box px-2 py-1.5 text-left font-mono hover:bg-sectionHeader"
                      onClick={() => {
                        setEquation(h.equation);
                        setSolveFor(h.variable);
                        handleSolve(undefined, h.equation, h.variable);
                      }}>
                      {h.equation}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* ─── Right: results ─── */}
        <div className="space-y-4">
          {/* Answers */}
          {solutions && (
            <section className={panelClass}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ListOrdered className="size-4 text-brass-strong" /> ამონახსნი
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {/* Academic mode toggle */}
                  <button
                    type="button"
                    onClick={() => setAcademicMode((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-box border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      academicMode
                        ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                        : 'border-hairline text-muted '
                    }`}>
                    <BookOpen className="size-3" />
                    {academicMode ? 'აკადემიური რეჟიმი' : 'მოკლე პასუხი'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGraph((v) => !v)}
                    className="inline-flex items-center gap-1 rounded-box border border-hairline px-2.5 py-1 text-[11px] text-muted hover:text-ink">
                    <LineChart className="size-3" /> გრაფიკი
                  </button>
                </div>
              </div>

              {solutions.length === 0 ? (
                <p className="text-sm text-muted">ამონახსნი არ არის (ან იდენტობა / წინააღმდეგობა).</p>
              ) : (
                <div className="space-y-2">
                  {solutions.map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-2 rounded-box border border-hairline bg-sectionHeader px-3 py-2">
                      <div className="min-w-0 overflow-x-auto">
                        <KatexPreview tex={`${solveFor}_{${i + 1}} = ${s}`} />
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(s, `root-${i}`)}
                        className="shrink-0 text-muted hover:text-ink">
                        {copiedKey === `root-${i}` ? (
                          <Check className="size-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Export */}
              {exportPack && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-hairline pt-3">
                  <button
                    type="button"
                    onClick={() => downloadText(exportPack.markdown, 'quadratic-solution.md', 'text/markdown')}
                    className="inline-flex items-center gap-1 rounded-box border border-hairline px-2.5 py-1.5 text-[11px] hover:bg-sectionHeader">
                    <FileText className="size-3" /> Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadText(exportPack.latex, 'quadratic-solution.tex', 'text/plain')}
                    className="inline-flex items-center gap-1 rounded-box border border-hairline px-2.5 py-1.5 text-[11px] hover:bg-sectionHeader">
                    <Download className="size-3" /> LaTeX
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText(exportPack.summary, 'summary')}
                    className="inline-flex items-center gap-1 rounded-box border border-hairline px-2.5 py-1.5 text-[11px] hover:bg-sectionHeader">
                    {copiedKey === 'summary' ? (
                      <Check className="size-3 text-emerald-500" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                    კოპირება
                  </button>
                </div>
              )}
            </section>
          )}

          {/* Method tabs + steps */}
          {methods.length > 0 && academicMode && (
            <section className={panelClass}>
              <h2 className="mb-3 text-sm font-semibold">ნაბიჯ-ნაბიჯ ამოხსნა</h2>
              {availableMethodTabs.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {availableMethodTabs.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setMethod(t.id)}
                      className={`rounded-box px-3 py-1.5 text-xs font-medium transition-colors ${
                        method === t.id
                          ? 'border-transparent bg-mainButton font-bold text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.12)]'
                          : 'border border-hairline text-muted hover:text-ink '
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {activeSteps.map((st, idx) => (
                  <div
                    key={idx}
                    className="rounded-box border border-hairline bg-sectionHeader p-3.5">
                    <h3 className="text-xs font-bold text-[#465D73]">{st.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-ink/80">
                      <KatexPreview tex={st.explanation} />
                    </p>
                    {st.latex && (
                      <div className="mt-2 overflow-x-auto rounded-box border border-hairline bg-main px-3 py-2">
                        <KatexPreview tex={st.latex} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Compact answer when not academic */}
          {methods.length > 0 && !academicMode && activeSteps.length > 0 && (
            <section className={panelClass}>
              <h2 className="mb-2 text-sm font-semibold">მოკლე ამოხსნა</h2>
              <div className="space-y-2">
                {activeSteps.map((st, idx) => (
                  <div key={idx} className="text-xs">
                    <span className="font-bold text-[#465D73]">{st.title}: </span>
                    {st.latex ? <KatexPreview tex={st.latex} /> : <KatexPreview tex={st.explanation} />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Analysis card */}
          {analysisRows.length > 0 && (
            <section className={panelClass}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Table2 className="size-4 text-brass-strong" /> ანალიზი
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <tbody>
                    {analysisRows.map((row, i) => (
                      <tr key={i} className="border-b border-hairline last:border-0">
                        <th className="whitespace-nowrap py-2 pr-3 font-medium text-muted align-top">{row.label}</th>
                        <td className="py-2">
                          <div className="overflow-x-auto">
                            <KatexPreview tex={row.valueLatex} />
                          </div>
                          {row.note && (
                            <p className="mt-0.5 text-[10px] text-muted">
                              <KatexPreview tex={row.note} />
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Graph with annotations */}
          {showGraph && graphMeta && solveFor === 'x' && graphExpr && (
            <section className={panelClass}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <LineChart className="size-4 text-brass-strong" /> გრაფიკული ხედი
              </h2>
              <div className="overflow-hidden rounded-box border border-hairline bg-main p-2 shadow-inner">
                <AnnotatedGraph meta={graphMeta} expression={graphExpr} />
              </div>
              <ul className="mt-3 grid gap-1 text-[11px] text-muted sm:grid-cols-2">
                <li>
                  წვერო:{' '}
                  <span className="font-mono text-ink">
                    ({graphMeta.vertex.x.toFixed(3)}, {graphMeta.vertex.y.toFixed(3)})
                  </span>
                </li>
                <li>
                  სიმეტრიის ღერძი:{' '}
                  <span className="font-mono text-ink">x = {graphMeta.vertex.x.toFixed(3)}</span>
                </li>
                <li>
                  y-გადაკვეთა:{' '}
                  <span className="font-mono text-ink">(0, {graphMeta.yIntercept.toFixed(3)})</span>
                </li>
                <li>
                  მიმართულება:{' '}
                  <span className="text-ink">
                    {graphMeta.direction === 'up' ? 'ზემოთ (მინიმუმი)' : 'ქვემოთ (მაქსიმუმი)'}
                  </span>
                </li>
                {graphMeta.roots.length > 0 && (
                  <li className="sm:col-span-2">
                    x-გადაკვეთები:{' '}
                    <span className="font-mono text-ink">
                      {graphMeta.roots.map((r) => r.toFixed(3)).join(', ')}
                    </span>
                  </li>
                )}
              </ul>
            </section>
          )}
        </div>
      </div>
  );
}

/** Graph with vertex + root markers via function-plot */
function AnnotatedGraph({
  expression,
  meta,
}: {
  expression: string;
  meta: {
    a: number;
    b: number;
    c: number;
    vertex: { x: number; y: number };
    roots: number[];
    yIntercept: number;
    direction: 'up' | 'down';
  };
}) {
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
        const isDark = document.documentElement.classList.contains('dark');
        hostRef.current.replaceChildren();

        const vx = meta.vertex.x;
        const vy = meta.vertex.y;
        const span = Math.max(6, Math.abs(vx) + 3, ...meta.roots.map((r) => Math.abs(r) + 2));
        const ySpan = Math.max(6, Math.abs(vy) + 3, Math.abs(meta.yIntercept) + 2);

        const annotations: { x?: number; y?: number; text?: string }[] = [{ x: vx, text: 'წვერო' }];
        for (const r of meta.roots) {
          annotations.push({ x: r, text: 'ფესვი' });
        }

        functionPlot({
          target: hostRef.current,
          width: hostRef.current.clientWidth || 400,
          height: 300,
          grid: true,
          xAxis: { domain: [-span, span] },
          yAxis: { domain: [-ySpan, ySpan] },
          data: [
            {
              fn: expression,
              color: isDark ? '#38bdf8' : '#2563eb',
              graphType: 'polyline',
            },
            // vertex point
            {
              points: [[vx, vy]],
              fnType: 'points',
              graphType: 'scatter',
              color: isDark ? '#fbbf24' : '#d97706',
              attr: { r: 5 },
            },
            // roots on x-axis
            ...(meta.roots.length
              ? [
                  {
                    points: meta.roots.map((r) => [r, 0] as [number, number]),
                    fnType: 'points' as const,
                    graphType: 'scatter' as const,
                    color: isDark ? '#34d399' : '#059669',
                    attr: { r: 4 },
                  },
                ]
              : []),
            // y-intercept
            {
              points: [[0, meta.yIntercept]],
              fnType: 'points',
              graphType: 'scatter',
              color: isDark ? '#f472b6' : '#db2777',
              attr: { r: 4 },
            },
          ],
          annotations,
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
  }, [expression, meta]);

  if (error)
    return <div className="p-4 text-center text-xs font-medium text-rose-500">გრაფიკის აგება ვერ მოხერხდა.</div>;

  return (
    <div
      ref={hostRef}
      className="flex w-full justify-center [&_svg]:block [&_svg]:max-w-full dark:[&_.domain]:stroke-slate-600 dark:[&_.grid]:stroke-slate-800 dark:[&_.origin]:stroke-slate-400 dark:[&_.tick_line]:stroke-slate-700 dark:[&_.tick_text]:fill-slate-400"
    />
  );
}
