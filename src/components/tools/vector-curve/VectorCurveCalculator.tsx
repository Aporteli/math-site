'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  BookOpen, Calculator, Delete, History, Keyboard,
  RotateCcw, Sparkles, X, Eye, EyeOff,
} from 'lucide-react';
import { KatexPreview } from '@/components/math/katex-preview';
import type { Dictionary } from '@/i18n/types';
import {
  VEC_CURVE_EXAMPLES, VEC_CURVE_HISTORY_KEY, VEC_CURVE_VARIABLES,
  type VecCurveHistoryItem, type VecCurveInput, type VecCurveResult,
} from './vector-curve';

type Copy = Dictionary['vectorCurveTool'];

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

type FieldId = 'xExpr' | 'yExpr' | 'tValue' | 'tMin' | 'tMax';

interface PlotToggles {
  curve: boolean;
  position: boolean;
  tangentVector: boolean;
  unitTangent: boolean;
  unitNormal: boolean;
  acceleration: boolean;
  tangentLine: boolean;
  normalLine: boolean;
}

export function VectorCurveCalculator({ copy, embedded = false }: Props) {
  const [xExpr, setXExpr] = useState('sqrt(t)');
  const [yExpr, setYExpr] = useState('2 - t');
  const [variable, setVariable] = useState('t');
  const [tValue, setTValue] = useState('1');
  const [tMin, setTMin] = useState('0');
  const [tMax, setTMax] = useState('5');

  const [activeField, setActiveField] = useState<FieldId>('xExpr');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [result, setResult] = useState<VecCurveResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<VecCurveHistoryItem[]>([]);
  const [syntaxOpen, setSyntaxOpen] = useState(false);

  const [toggles, setToggles] = useState<PlotToggles>({
    curve: true,
    position: true,
    tangentVector: true,
    unitTangent: false,
    unitNormal: false,
    acceleration: false,
    tangentLine: true,
    normalLine: false,
  });

  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(VEC_CURVE_HISTORY_KEY);
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

  function currentItem(): VecCurveInput {
    return { xExpr, yExpr, variable, tValue, tMin, tMax };
  }

  async function solveWith(item: VecCurveInput) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/vector-curve/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : copy.invalidExpression);
      setResult(data);
      setHistory((prev) => {
        const next = [item, ...prev.filter((h) => JSON.stringify(h) !== JSON.stringify(item))].slice(0, 10);
        try { localStorage.setItem(VEC_CURVE_HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.invalidExpression);
    } finally {
      setLoading(false);
    }
  }

  function apply(item: VecCurveInput) {
    setXExpr(item.xExpr);
    setYExpr(item.yExpr);
    setVariable(item.variable);
    setTValue(item.tValue);
    setTMin(item.tMin);
    setTMax(item.tMax);
    setResult(null);
    setError(null);
    setTimeout(() => solveWith(item), 0);
  }

  function insertKey(key: string) {
    const write = (v: string) =>
      key === 'backspace' ? v.slice(0, -1) : key === 'clear' ? '' : v + key;
    if (activeField === 'xExpr') setXExpr(write);
    else if (activeField === 'yExpr') setYExpr(write);
    else if (activeField === 'tValue') setTValue(write);
    else if (activeField === 'tMin') setTMin(write);
    else setTMax(write);
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === 'Escape') setShowKeyboard(false);
  }

  function toggle(key: keyof PlotToggles) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <main
      className={
        embedded
          ? 'text-ink'
          : 'mx-auto my-6 grid w-full min-w-0 max-w-[2000px] gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]'
      }
    >
      {/* ═════ INPUT ═════ */}
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

          <form
            onSubmit={(e) => { e.preventDefault(); solveWith(currentItem()); }}
            className="space-y-3">

            {/* Variable picker */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted">
                {copy.variableLabel}
              </label>
              <div className="flex flex-wrap gap-1">
                {VEC_CURVE_VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariable(v)}
                    className={
                      'rounded-box border px-3 py-1.5 font-mono text-xs font-semibold transition-colors ' +
                      (variable === v
                        ? 'border-navy bg-navy text-white'
                        : 'border-hairline bg-white text-muted hover:bg-navy-tint dark:bg-slate-900 dark:border-slate-700')
                    }>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* x(t), y(t) */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  {variable}(t) — x
                </label>
                <input
                  value={xExpr}
                  onFocus={() => setActiveField('xExpr')}
                  onChange={(e) => setXExpr(e.target.value)}
                  spellCheck={false}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  {variable}(t) — y
                </label>
                <input
                  value={yExpr}
                  onFocus={() => setActiveField('yExpr')}
                  onChange={(e) => setYExpr(e.target.value)}
                  spellCheck={false}
                  className={fieldClass}
                />
              </div>
            </div>

            {/* t value, min, max */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  {variable}₀
                </label>
                <input
                  value={tValue}
                  onFocus={() => setActiveField('tValue')}
                  onChange={(e) => setTValue(e.target.value)}
                  spellCheck={false}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  {variable} min
                </label>
                <input
                  value={tMin}
                  onFocus={() => setActiveField('tMin')}
                  onChange={(e) => setTMin(e.target.value)}
                  spellCheck={false}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted">
                  {variable} max
                </label>
                <input
                  value={tMax}
                  onFocus={() => setActiveField('tMax')}
                  onChange={(e) => setTMax(e.target.value)}
                  spellCheck={false}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-box bg-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-navy-strong disabled:opacity-50">
                <Calculator className="size-4" aria-hidden="true" />
                {loading ? copy.solving : copy.solveButton}
              </button>
              <button
                type="button"
                onClick={() => {
                  setXExpr('sqrt(t)'); setYExpr('2 - t');
                  setVariable('t'); setTValue('1');
                  setTMin('0'); setTMax('5');
                  setResult(null); setError(null);
                }}
                className={chipClass}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {copy.reset}
              </button>
            </div>
          </form>

          {/* Keyboard */}
          {showKeyboard && (
            <div
              id={keyboardTitleId}
              role="region"
              aria-label={copy.keyboard}
              className="mt-4 rounded-box border border-hairline bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-hairline px-4 py-3 dark:border-slate-700">
                <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
                <button
                  type="button"
                  onClick={() => setShowKeyboard(false)}
                  aria-label="close"
                  className="inline-flex size-9 items-center justify-center rounded-box text-muted hover:bg-paper dark:hover:bg-slate-800">
                  <X className="size-4" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1.5 px-4 py-4">
                {['7','8','9','4','5','6','1','2','3','0','.',
                  't','sqrt(','sin(','cos(','tan(','ln(','exp(',
                  '+','-','*','/','^','(',')','pi'].map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={keyClass}
                    onClick={() => insertKey(k)}>
                    {k}
                  </button>
                ))}
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

          {/* Examples */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-3 dark:border-slate-800">
            <span className="text-xs font-semibold text-muted">{copy.examples}</span>
            {VEC_CURVE_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => apply(ex)}
                className="rounded-box border border-hairline px-2 py-1 text-[11px] text-muted hover:border-navy/30 hover:text-ink dark:border-slate-700 transition">
                {ex.label}
              </button>
            ))}
          </div>

          {/* Syntax */}
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
                <li>· sqrt(t) — კვადრატული ფესვი</li>
                <li>· sin(t), cos(t), tan(t)</li>
                <li>· ln(t) — ნატურალური ლოგარითმი</li>
                <li>· exp(t) ან e^t</li>
                <li>· pi — π მუდმივა</li>
                <li>· t^2, t^3 — ხარისხები</li>
              </ul>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-box border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* ═════ RESULTS ═════ */}
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
            {/* Formula block */}
            <div className="grid gap-2">
              <Row label={copy.rLabel} tex={result.rLatex} />
              <Row label={copy.rpLabel} tex={result.rpLatex} />
              <Row
                label={`${copy.rAtTLabel} ${result.variable} = ${result.tValueLatex}`}
                tex={result.r0Latex}
                extra={
                  result.x0Numeric != null && result.y0Numeric != null
                    ? `(${fmt(result.x0Numeric)}, ${fmt(result.y0Numeric)})`
                    : undefined
                }
              />
              <Row
                label={`${copy.rpAtTLabel} ${result.variable} = ${result.tValueLatex}`}
                tex={result.rp0Latex}
                extra={
                  result.dx0Numeric != null && result.dy0Numeric != null
                    ? `(${fmt(result.dx0Numeric)}, ${fmt(result.dy0Numeric)})`
                    : undefined
                }
              />
            </div>

            {/* Derived quantities grid */}
            <div className="grid gap-2 sm:grid-cols-2">
              <Mini
                label={copy.speedLabel}
                tex={`v = |\\mathbf{r}'| = ${result.speedLatex}`}
                extra={result.speedNumeric != null ? `≈ ${fmt(result.speedNumeric)}` : undefined}
              />
              <Mini
                label={copy.arcLengthLabel}
                tex={`L = \\int_{${result.tMinLatex}}^{${result.tMaxLatex}} |\\mathbf{r}'(t)|\\,dt`}
                extra={
                  result.arcLengthNumeric != null
                    ? `≈ ${fmt(result.arcLengthNumeric)}`
                    : undefined
                }
              />
              <Mini
                label={copy.unitTangentLabel}
                tex={result.unitTangentLatex}
              />
              <Mini
                label={copy.unitNormalLabel}
                tex={result.unitNormalLatex}
              />
              <Mini
                label={copy.curvatureLabel}
                tex={`\\kappa = ${result.curvatureLatex}`}
                extra={
                  result.curvatureNumeric != null
                    ? `≈ ${fmt(result.curvatureNumeric)}`
                    : undefined
                }
              />
              <Mini
                label={copy.tangentLineLabel}
                tex={result.tangentLineLatex}
              />
            </div>

            {/* Plot toggles */}
            <div className="rounded-box border border-hairline bg-paper/30 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
                {copy.plotLegendTitle}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['curve', '#2563eb', copy.legendCurve],
                    ['position', '#0ea5e9', copy.legendPosition],
                    ['tangentVector', '#ea580c', copy.legendTangent],
                    ['unitTangent', '#16a34a', copy.legendUnitTangent],
                    ['unitNormal', '#9333ea', copy.legendUnitNormal],
                    ['acceleration', '#dc2626', copy.legendAcceleration],
                    ['tangentLine', '#ea580c', copy.legendTangentLine],
                    ['normalLine', '#9333ea', copy.legendNormalLine],
                  ] as const
                ).map(([key, color, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key as keyof PlotToggles)}
                    className={
                      'inline-flex items-center gap-1.5 rounded-box border px-2.5 py-1 text-[11px] font-semibold transition-colors ' +
                      (toggles[key as keyof PlotToggles]
                        ? 'border-navy/30 bg-white text-ink dark:bg-slate-900 dark:border-slate-700'
                        : 'border-hairline bg-paper text-muted line-through dark:bg-slate-900/40 dark:border-slate-700')
                    }>
                    <span
                      className="size-2.5 rounded-box"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    {label}
                    {toggles[key as keyof PlotToggles] ? (
                      <Eye className="size-3" />
                    ) : (
                      <EyeOff className="size-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* The plot */}
            <CurvePlot result={result} toggles={toggles} />

            {/* History */}
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
                      try { localStorage.removeItem(VEC_CURVE_HISTORY_KEY); } catch { /* ignore */ }
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
                        className="w-full rounded-box border border-hairline-soft bg-white px-2 py-1.5 text-left font-mono text-[11px] text-body hover:border-navy/30 hover:bg-navy-tint dark:border-slate-800 dark:bg-slate-900">
                        x={h.xExpr}, y={h.yExpr}, {h.variable}={h.tValue}
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

/* ═══════════════ helpers ═══════════════ */

function fmt(n: number) {
  if (!Number.isFinite(n)) return String(n);
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-4 || a >= 1e6)) return n.toExponential(3);
  return String(Math.round(n * 1e4) / 1e4);
}

function Row({ label, tex, extra }: { label: string; tex: string; extra?: string }) {
  return (
    <div className="rounded-box border border-hairline bg-paper/30 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {extra && <span className="font-mono text-[11px] text-muted">{extra}</span>}
      </div>
      <div className="mt-1 overflow-x-auto hide-scrollbar">
        <KatexPreview tex={tex} />
      </div>
    </div>
  );
}

function Mini({ label, tex, extra }: { label: string; tex: string; extra?: string }) {
  return (
    <div className="rounded-box border border-hairline bg-paper/30 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
        {extra && <span className="font-mono text-[11px] text-muted">{extra}</span>}
      </div>
      <div className="mt-1 overflow-x-auto hide-scrollbar">
        <KatexPreview tex={tex} />
      </div>
    </div>
  );
}

/* ═══════════════ the SVG plot ═══════════════ */

function CurvePlot({
  result,
  toggles,
}: {
  result: VecCurveResult;
  toggles: PlotToggles;
}) {
  const W = 820;
  const H = 540;
  const pad = 46;

  const x0 = result.x0Numeric;
  const y0 = result.y0Numeric;
  const dx0 = result.dx0Numeric;
  const dy0 = result.dy0Numeric;
  const d2x0 = result.d2x0Numeric;
  const d2y0 = result.d2y0Numeric;
  const uTx = result.unitTangentNumeric[0];
  const uTy = result.unitTangentNumeric[1];
  const uNx = result.unitNormalNumeric[0];
  const uNy = result.unitNormalNumeric[1];

  // ── Compute world bounds with enough room for arrows ──
  const pts = result.curvePoints;
  const b = result.plotBounds;

  // candidate points to include in bounds
  const extra: [number, number][] = [];
  if (x0 != null && y0 != null) {
    extra.push([0, 0], [x0, y0]);
    if (dx0 != null && dy0 != null) extra.push([x0 + dx0, y0 + dy0]);
    if (uTx != null && uTy != null) extra.push([x0 + uTx, y0 + uTy]);
    if (uNx != null && uNy != null) extra.push([x0 + uNx, y0 + uNy]);
    if (d2x0 != null && d2y0 != null) extra.push([x0 + d2x0, y0 + d2y0]);
  }

  let xMin = b.xMin, xMax = b.xMax, yMin = b.yMin, yMax = b.yMax;
  for (const [ex, ey] of extra) {
    xMin = Math.min(xMin, ex); xMax = Math.max(xMax, ex);
    yMin = Math.min(yMin, ey); yMax = Math.max(yMax, ey);
  }

  // pad the box by 15%
  const xPad = (xMax - xMin) * 0.15 || 1;
  const yPad = (yMax - yMin) * 0.15 || 1;
  xMin -= xPad; xMax += xPad;
  yMin -= yPad; yMax += yPad;

  // For "square-ish" aspect, expand shorter side
  const xSpan = xMax - xMin;
  const ySpan = yMax - yMin;
  const targetAR = (W - 2 * pad) / (H - 2 * pad);
  const curAR = xSpan / ySpan;
  if (curAR < targetAR) {
    const newSpan = ySpan * targetAR;
    const cx = (xMin + xMax) / 2;
    xMin = cx - newSpan / 2; xMax = cx + newSpan / 2;
  } else if (curAR > targetAR) {
    const newSpan = xSpan / targetAR;
    const cy = (yMin + yMax) / 2;
    yMin = cy - newSpan / 2; yMax = cy + newSpan / 2;
  }

  const toX = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const toY = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);

  // Nice tick step
  const rangeX = xMax - xMin;
  const tickStep = niceStep(rangeX / 10);

  // Build curve path (breaks on NaN / out-of-range)
  const curvePath = (() => {
    if (!toggles.curve) return '';
    let d = '';
    let started = false;
    for (const [px, py] of pts) {
      if (!Number.isFinite(px) || !Number.isFinite(py)) { started = false; continue; }
      const sx = toX(px), sy = toY(py);
      if (sx < -50 || sx > W + 50 || sy < -50 || sy > H + 50) { started = false; continue; }
      d += (started ? ' L ' : ' M ') + sx.toFixed(2) + ' ' + sy.toFixed(2);
      started = true;
    }
    return d;
  })();

  const tickVals = (min: number, max: number, step: number) => {
    const out: number[] = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + 1e-9; v += step) {
      if (Math.abs(v) < step / 100) out.push(0);
      else out.push(v);
    }
    return out;
  };

  const xs = tickVals(xMin, xMax, tickStep);
  const ys = tickVals(yMin, yMax, tickStep);

  return (
    <div className="rounded-box border border-hairline bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full max-w-full"
          style={{ minWidth: 560 }}
          role="img"
          aria-label="Vector curve plot">
          <defs>
            <marker id="arr-pos" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill="#0ea5e9" />
            </marker>
            <marker id="arr-tan" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill="#ea580c" />
            </marker>
            <marker id="arr-ut" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill="#16a34a" />
            </marker>
            <marker id="arr-un" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill="#9333ea" />
            </marker>
            <marker id="arr-acc" markerWidth="11" markerHeight="11" refX="9" refY="3.5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,7 L10,3.5 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* background */}
          <rect x="0" y="0" width={W} height={H} fill="#fafafa" className="dark:fill-slate-950" />

          {/* grid */}
          <g stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-slate-800">
            {xs.map((v) => (
              <line key={`gx${v}`} x1={toX(v)} y1={pad} x2={toX(v)} y2={H - pad} />
            ))}
            {ys.map((v) => (
              <line key={`gy${v}`} x1={pad} y1={toY(v)} x2={W - pad} y2={toY(v)} />
            ))}
          </g>

          {/* axes */}
          <g stroke="#475569" strokeWidth="1.6" className="dark:stroke-slate-500">
            {/* x-axis at y=0 if inside */}
            {0 >= yMin && 0 <= yMax && (
              <line x1={pad} y1={toY(0)} x2={W - pad} y2={toY(0)} />
            )}
            {0 >= xMin && 0 <= xMax && (
              <line x1={toX(0)} y1={pad} x2={toX(0)} y2={H - pad} />
            )}
          </g>

          {/* ticks + labels */}
          <g fontSize="10" fill="#64748b" className="dark:fill-slate-400" fontFamily="ui-monospace, monospace">
            {xs.map((v) => {
              if (Math.abs(v) < 1e-9) return null;
              return (
                <g key={`tx${v}`}>
                  <line
                    x1={toX(v)} y1={toY(0) - 4}
                    x2={toX(v)} y2={toY(0) + 4}
                    stroke="#94a3b8" strokeWidth="1"
                  />
                  <text x={toX(v)} y={toY(0) + 16} textAnchor="middle">{fmt(v)}</text>
                </g>
              );
            })}
            {ys.map((v) => {
              if (Math.abs(v) < 1e-9) return null;
              return (
                <g key={`ty${v}`}>
                  <line
                    x1={toX(0) - 4} y1={toY(v)}
                    x2={toX(0) + 4} y2={toY(v)}
                    stroke="#94a3b8" strokeWidth="1"
                  />
                  <text x={toX(0) - 8} y={toY(v) + 3} textAnchor="end">{fmt(v)}</text>
                </g>
              );
            })}
          </g>

          {/* ORIGIN dot */}
          {0 >= xMin && 0 <= xMax && 0 >= yMin && 0 <= yMax && (
            <circle cx={toX(0)} cy={toY(0)} r="3" fill="#0f172a" className="dark:fill-slate-200" />
          )}

          {/* ── Tangent / Normal LINES (behind curve) ── */}
          {toggles.tangentLine && dx0 != null && dy0 != null && Number.isFinite(dx0) && Number.isFinite(dy0) &&
            (Math.abs(dx0) + Math.abs(dy0) > 1e-9) && x0 != null && y0 != null && (
              <line
                x1={toX(xMin)}
                y1={toY(y0 + (dy0 / dx0 || 0) * (xMin - x0) || y0)}
                x2={toX(xMax)}
                y2={toY(y0 + (dy0 / dx0 || 0) * (xMax - x0) || y0)}
                stroke="#ea580c"
                strokeWidth="1.4"
                strokeDasharray="6 4"
                opacity="0.65"
              />
            )}
          {toggles.normalLine && dy0 != null && dx0 != null && Math.abs(dy0) > 1e-9 && x0 != null && y0 != null && (
            <line
              x1={toX(xMin)}
              y1={toY(y0 + (-dx0 / dy0) * (xMin - x0))}
              x2={toX(xMax)}
              y2={toY(y0 + (-dx0 / dy0) * (xMax - x0))}
              stroke="#9333ea"
              strokeWidth="1.4"
              strokeDasharray="6 4"
              opacity="0.55"
            />
          )}

          {/* ── CURVE ── */}
          {toggles.curve && curvePath && (
            <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" />
          )}

          {/* ── POSITION vector r(t0) ── */}
          {toggles.position && x0 != null && y0 != null &&
            Number.isFinite(x0) && Number.isFinite(y0) &&
            (Math.abs(x0) + Math.abs(y0) > 1e-9) && (
              <line
                x1={toX(0)} y1={toY(0)}
                x2={toX(x0)} y2={toY(y0)}
                stroke="#0ea5e9"
                strokeWidth="2.4"
                markerEnd="url(#arr-pos)"
              />
            )}

          {/* ── TANGENT / velocity vector r'(t0) ── */}
          {toggles.tangentVector && x0 != null && y0 != null && dx0 != null && dy0 != null &&
            Number.isFinite(dx0) && Number.isFinite(dy0) &&
            (Math.abs(dx0) + Math.abs(dy0) > 1e-9) && (
              <line
                x1={toX(x0)} y1={toY(y0)}
                x2={toX(x0 + dx0)} y2={toY(y0 + dy0)}
                stroke="#ea580c"
                strokeWidth="2.6"
                markerEnd="url(#arr-tan)"
              />
            )}

          {/* ── UNIT TANGENT ── */}
          {toggles.unitTangent && x0 != null && y0 != null &&
            uTx != null && uTy != null &&
            Number.isFinite(uTx) && Number.isFinite(uTy) && (
              <line
                x1={toX(x0)} y1={toY(y0)}
                x2={toX(x0 + uTx)} y2={toY(y0 + uTy)}
                stroke="#16a34a"
                strokeWidth="2"
                markerEnd="url(#arr-ut)"
              />
            )}

          {/* ── UNIT NORMAL ── */}
          {toggles.unitNormal && x0 != null && y0 != null &&
            uNx != null && uNy != null &&
            Number.isFinite(uNx) && Number.isFinite(uNy) && (
              <line
                x1={toX(x0)} y1={toY(y0)}
                x2={toX(x0 + uNx)} y2={toY(y0 + uNy)}
                stroke="#9333ea"
                strokeWidth="2"
                markerEnd="url(#arr-un)"
              />
            )}

          {/* ── ACCELERATION r''(t0) ── */}
          {toggles.acceleration && x0 != null && y0 != null &&
            d2x0 != null && d2y0 != null &&
            Number.isFinite(d2x0) && Number.isFinite(d2y0) &&
            (Math.abs(d2x0) + Math.abs(d2y0) > 1e-9) && (
              <line
                x1={toX(x0)} y1={toY(y0)}
                x2={toX(x0 + d2x0)} y2={toY(y0 + d2y0)}
                stroke="#dc2626"
                strokeWidth="2.4"
                markerEnd="url(#arr-acc)"
              />
            )}

          {/* ── POINT at t0 ── */}
          {x0 != null && y0 != null && Number.isFinite(x0) && Number.isFinite(y0) && (
            <g>
              <circle cx={toX(x0)} cy={toY(y0)} r="6" fill="#fff" stroke="#0f172a" strokeWidth="2" />
              <circle cx={toX(x0)} cy={toY(y0)} r="2.5" fill="#0f172a" />
            </g>
          )}
        </svg>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        {result.variable} ∈ [{result.tMinLatex}, {result.tMaxLatex}],&nbsp;
        {result.variable}₀ = {result.tValueLatex}
        {result.x0Numeric != null && result.y0Numeric != null && (
          <> &nbsp;·&nbsp; r({result.variable}₀) ≈ ({fmt(result.x0Numeric)}, {fmt(result.y0Numeric)})</>
        )}
      </p>
    </div>
  );
}

function niceStep(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const n = raw / base;
  if (n <= 1) return base;
  if (n <= 2) return 2 * base;
  if (n <= 5) return 5 * base;
  return 10 * base;
}