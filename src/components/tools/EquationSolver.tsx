"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calculator,
  RotateCcw,
  CheckCircle2,
  Keyboard,
  History,
  LineChart,
  Trash2,
} from "lucide-react";
// @ts-ignore
import nerdamer from "nerdamer/all.min";
import { KatexPreview } from "@/components/math/katex-preview";
import { PageHero } from "@/components/ui/page-hero";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

// სტილები აღებულია პროექტის დიზაინ სისტემიდან
const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

const panelClass =
  "rounded-2xl border border-hairline bg-white p-4 shadow-sm sm:p-5";

type Copy = Dictionary["equations"];

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

export function EquationSolver({
  locale,
  copy,
  title,
  description,
}: EquationSolverProps) {
  const [equation, setEquation] = useState("");
  const [solveFor, setSolveFor] = useState("x");
  const [solutions, setSolutions] = useState<string[] | null>(null);
  
  const [error, setError] = useState(false);
  const [liveWarning, setLiveWarning] = useState<string | null>(null);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphExpr, setGraphExpr] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);

  // 1. ლოკალური ისტორიის ჩატვირთვა
  useEffect(() => {
    const saved = localStorage.getItem("equation-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // 2. Live Feedback (რეალურ დროში შემოწმება)
  useEffect(() => {
    if (!equation.trim()) {
      setLiveWarning(null);
      return;
    }
    try {
      // ვამოწმებთ სინტაქსს ამოხსნის გარეშე
      nerdamer(equation.replace("=", "-")); 
      setLiveWarning(null);
    } catch {
      setLiveWarning(copy?.liveError || "Incomplete syntax...");
    }
  }, [equation, copy]);

  // მთავარი ამოხსნის ფუნქცია
  const handleSolve = (e?: React.FormEvent, eqToSolve = equation, varToSolve = solveFor) => {
    if (e) e.preventDefault();
    if (!eqToSolve.trim()) {
      setError(true);
      setSolutions(null);
      return;
    }

    try {
      const result = nerdamer.solveEquations(eqToSolve, varToSolve);
      let parsedSolutions: string[] = [];
      
      if (Array.isArray(result) || result.length !== undefined) {
        parsedSolutions = (result as any[]).map((res) => 
          nerdamer(res.toString()).toTeX()
        );
      } else {
        parsedSolutions = [nerdamer(result.toString()).toTeX()];
      }

      setSolutions(parsedSolutions);
      setError(false);

      // გრაფიკისთვის ექსპრესიის მომზადება (მარცხენა მხარეს ვაკლებთ მარჯვენას)
      const parts = eqToSolve.split("=");
      const lhs = parts[0] || "0";
      const rhs = parts[1] || "0";
      setGraphExpr(`(${lhs}) - (${rhs})`);
      setShowGraph(true);

      // ისტორიაში დამატება
      const newItem = { equation: eqToSolve, variable: varToSolve, solutions: parsedSolutions };
      const newHistory = [newItem, ...history.filter(h => h.equation !== eqToSolve)].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem("equation-history", JSON.stringify(newHistory));

    } catch (err) {
      setError(true);
      setSolutions(null);
      setShowGraph(false);
    }
  };

  // კლავიატურის დახმარებით ტექსტის ჩასმა კურსორის ადგილას
  const insertText = (text: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart ?? equation.length;
      const end = input.selectionEnd ?? equation.length;
      const newEq = equation.substring(0, start) + text + equation.substring(end);
      setEquation(newEq);
      
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    } else {
      setEquation(equation + text);
    }
  };

  const applyExample = (ex: string) => {
    setEquation(ex);
    setSolveFor("x");
    handleSolve(undefined, ex, "x");
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("equation-history");
  };

  const resetForm = () => {
    setEquation("");
    setSolutions(null);
    setError(false);
    setShowGraph(false);
  };

  const keyboardKeys = ["x", "y", "a", "^2", "^", "sqrt()", "/", "(", ")", "pi", "="];

  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={localePath(locale, "/tools")}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy?.back || "Back to Tools"}
        </Link>
        <div className="mt-5">
          <PageHero
            icon={Calculator}
            eyebrow={copy?.eyebrow || "Math Tool"}
            title={title}
            description={description}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          {/* მარცხენა პანელი: ინფუთი და ისტორია */}
          <aside className="space-y-4">
            <section className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">
                  {copy?.inputTitle || "Equation Input"}
                </h2>
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-navy/30 hover:text-navy"
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  {copy?.reset || "Reset"}
                </button>
              </div>
              
              <form onSubmit={handleSolve} className="mt-4">
                <div className="flex gap-2">
                  <label className="shrink-0 w-24">
                    <span className="block text-xs font-medium text-muted mb-1.5 ml-1">
                      {copy?.solveFor || "Solve for"}
                    </span>
                    <input
                      value={solveFor}
                      onChange={(e) => setSolveFor(e.target.value)}
                      maxLength={3}
                      className={`${fieldClass} text-center`}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="block text-xs font-medium text-muted mb-1.5 ml-1">
                      Equation
                    </span>
                    <input
                      ref={inputRef}
                      value={equation}
                      onChange={(e) => setEquation(e.target.value)}
                      placeholder="e.g., x^2 - 4 = 0"
                      spellCheck={false}
                      className={
                        error
                          ? `${fieldClass} border-brass focus:border-brass focus:ring-brass/20`
                          : fieldClass
                      }
                    />
                  </label>
                </div>
                
                {liveWarning && !error && (
                  <p className="mt-2 text-xs text-brass-strong animate-pulse">
                    {liveWarning}
                  </p>
                )}
                {error && (
                  <p className="mt-2 text-xs text-brass-strong">
                    {copy?.invalidEquation || "Invalid equation. Check the syntax."}
                  </p>
                )}
                
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-navy hover:text-navy-strong"
                  >
                    <Keyboard className="size-3.5" />
                    {copy?.keyboard || "Virtual Keyboard"}
                  </button>
                  
                  {showKeyboard && (
                    <div className="flex flex-wrap gap-1.5 bg-paper rounded-xl p-2 border border-hairline mb-3">
                      {keyboardKeys.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => insertText(k)}
                          className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg bg-white border border-hairline-soft px-2 text-sm font-mono text-ink shadow-sm hover:border-navy/30 hover:text-navy"
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!!liveWarning}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-strong disabled:opacity-60"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {copy?.solveButton || "Solve"}
                </button>
              </form>
            </section>

            <details className={panelClass} open>
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {copy?.syntaxTitle || "Clickable Examples"}
              </summary>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-body">
                {["2x + 5 = 15", "x^2 - 5x + 6 = 0", "x^3 = 27", "(x+1)/2 = 4", "sin(x) = 0"].map((ex) => (
                  <li key={ex}>
                    <button 
                      onClick={() => applyExample(ex)}
                      className="w-full text-left flex items-center gap-2 rounded-lg p-2 hover:bg-paper-deep transition-colors font-mono text-xs text-navy"
                    >
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
                    {copy?.history || "Recent History"}
                  </h2>
                  <button onClick={clearHistory} className="text-xs text-muted hover:text-brass-strong">
                    {copy?.clearHistory || "Clear"}
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
                        className="w-full text-left rounded-xl border border-hairline bg-paper px-3 py-2 text-xs hover:border-navy/30 transition-all flex justify-between items-center"
                      >
                        <span className="font-mono text-ink line-clamp-1">{h.equation}</span>
                        <span className="shrink-0 text-muted ml-2">var: {h.variable}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>

          {/* მარჯვენა პანელი: პასუხები და გრაფიკი */}
          <div className="space-y-4">
            <section className={panelClass}>
              <h2 className="text-sm font-semibold text-ink">
                {copy?.resultTitle || "Solution"}
              </h2>
              <div className="mt-4 min-h-[12rem] rounded-xl border border-hairline bg-paper/60 p-6 flex flex-col items-center justify-center text-center transition-all">
                {solutions && solutions.length > 0 ? (
                  <div className="space-y-4 w-full">
                    <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                      Roots Found for {solveFor}:
                    </p>
                    <div className="grid gap-3 w-full max-w-lg mx-auto">
                      {solutions.map((sol, idx) => (
                        <div key={idx} className="rounded-xl bg-white px-6 py-4 shadow-sm border border-hairline overflow-x-auto hide-scrollbar">
                          <KatexPreview tex={`${solveFor}_{${idx + 1}} = ${sol}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-2xl bg-paper-deep text-muted">
                      <Calculator className="size-6" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted">
                      {copy?.emptyResult || "Enter an equation to see the solution here."}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* მინი-გრაფიკი (მხოლოდ მაშინ როცა X-ის მიმართ ვხსნით) */}
            {showGraph && solveFor === 'x' && graphExpr && (
              <section className={panelClass}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink mb-4">
                  <LineChart className="size-4 text-navy" />
                  {copy?.graphTitle || "Graphical View"}
                </h2>
                <div className="rounded-xl border border-hairline bg-white overflow-hidden">
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

// ----------------------------------------------------
// მინი გრაფიკის კომპონენტი (იყენებს function-plot-ს)
// ----------------------------------------------------
function MiniGraph({ expression }: { expression: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hostRef.current || !expression) return;
    let disposed = false;

    async function draw() {
      try {
        const mod = await import("function-plot");
        const functionPlot = mod.default;
        if (disposed || !hostRef.current) return;

        hostRef.current.replaceChildren();
        functionPlot({
          target: hostRef.current,
          width: hostRef.current.clientWidth || 400,
          height: 250,
          grid: true,
          xAxis: { domain: [-10, 10] },
          yAxis: { domain: [-10, 10] },
          data: [
            {
              fn: expression,
              color: "#2563eb", // navy
              graphType: "polyline",
            }
          ]
        });
        setError(false);
      } catch (err) {
        setError(true);
      }
    }

    draw();

    return () => { disposed = true; };
  }, [expression]);

  if (error) {
    return <div className="p-4 text-xs text-brass-strong text-center">Unable to plot this equation.</div>;
  }

  return <div ref={hostRef} className="w-full flex justify-center [&_svg]:block [&_svg]:max-w-full" />;
}