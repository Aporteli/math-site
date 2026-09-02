"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Download,
  LineChart,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { Chart, FunctionPlotDatum, FunctionPlotDatumScope } from "function-plot";
import { KatexPreview } from "@/components/math/katex-preview";
import { PageHero } from "@/components/ui/page-hero";
import { SelectMenu } from "@/components/ui/select-menu";
import { localePath, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";
import {
  compileDerivative,
  compileEvaluator,
  CURVE_COLORS,
  DEFAULT_DOMAIN,
  detectParameters,
  formatGraphNumber,
  functionsFromExprs,
  GRAPH_PRESETS,
  inspectExpression,
  makeGraphFunction,
  mergeParams,
  nextCurveColor,
  type GraphFunction,
  type GraphPresetId,
} from "@/lib/math/graphing";
import {
  collectMarkers,
  definiteIntegral,
  evaluatorFor,
  nearestMarker,
  sampleFill,
  tangentAt,
  valueTable,
  visibleFunctions,
  type GraphMarker,
  type MarkerKind,
} from "@/lib/math/graphing-analysis";

type Copy = Dictionary["graphingTool"];
type IntegralMode = "single" | "between";

interface GraphingToolProps {
  locale: Locale;
  copy: Copy;
  title: string;
  description: string;
}

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

const panelClass =
  "rounded-3xl border border-hairline/40 bg-surface/30 p-4 shadow-sm sm:p-5";

const iconBtnClass =
 "inline-flex items-center rounded-full bg-black/40 border border-hairline/40 px-3.5 py-1.5 text-xs font-semibold text-sky-400 hover:bg-black/60 hover:border-hairline transition-colors";

const SVG_NS = "http://www.w3.org/2000/svg";

export function GraphingTool({
  locale,
  copy,
  title,
  description,
}: GraphingToolProps) {
  const [functions, setFunctions] = useState(() =>
    functionsFromExprs(GRAPH_PRESETS.parabola),
  );
  const [showDerivative, setShowDerivative] = useState(false);
  const [showTangent, setShowTangent] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [domainTick, setDomainTick] = useState(0);
  const [xDomain, setXDomain] = useState<[number, number]>([...DEFAULT_DOMAIN]);
  const [yDomain, setYDomain] = useState<[number, number]>([...DEFAULT_DOMAIN]);
  const [shadeIntegral, setShadeIntegral] = useState(false);
  const [integralA, setIntegralA] = useState("-2");
  const [integralB, setIntegralB] = useState("2");
  const [integralMode, setIntegralMode] = useState<IntegralMode>("single");
  const [upperId, setUpperId] = useState("");
  const [lowerId, setLowerId] = useState("");
  const [tableStart, setTableStart] = useState("-5");
  const [tableEnd, setTableEnd] = useState("5");
  const [tableStep, setTableStep] = useState("1");
  const [copied, setCopied] = useState(false);

  const visible = visibleFunctions(functions);
  const upper = visible.find((row) => row.id === upperId) ?? visible[0];
  const lower =
    visible.find((row) => row.id === lowerId && row.id !== upper?.id) ??
    visible.find((row) => row.id !== upper?.id);

  function updateFunction(id: string, patch: Partial<GraphFunction>) {
    setFunctions((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.expr !== undefined) {
          try {
            const checked = inspectExpression(patch.expr);
            next.error = !checked.ok;
            next.tex = checked.ok ? checked.tex : "";
            next.params = mergeParams(patch.expr, row.params);
          } catch {
            next.error = true;
            next.tex = "";
          }
        }
        if (patch.params) {
          next.params = { ...next.params, ...patch.params };
        }
        return next;
      }),
    );
  }

  function addFunction() {
    setFunctions((rows) => [
      ...rows,
      makeGraphFunction("x", nextCurveColor(rows.length)),
    ]);
  }

  function removeFunction(id: string) {
    setFunctions((rows) => (rows.length <= 1 ? rows : rows.filter((row) => row.id !== id)));
  }

  function applyPreset(id: GraphPresetId) {
    setFunctions(functionsFromExprs(GRAPH_PRESETS[id]));
    setXDomain([...DEFAULT_DOMAIN]);
    setYDomain([...DEFAULT_DOMAIN]);
    setDomainTick((value) => value + 1);
  }

  const bounds = parseDomain(integralA, integralB);
  let integralValue: number | null = null;
  if (bounds && upper) {
    try {
      if (integralMode === "between" && lower) {
        const f = evaluatorFor(upper);
        const g = evaluatorFor(lower);
        integralValue = definiteIntegral(
          (x) => {
            const a = f(x);
            const b = g(x);
            if (a === null || b === null) return null;
            return a - b;
          },
          bounds[0],
          bounds[1],
        );
      } else {
        integralValue = definiteIntegral(evaluatorFor(upper), bounds[0], bounds[1]);
      }
    } catch {
      integralValue = null;
    }
  }

  const tableRows = valueTable(
    functions,
    Number(tableStart),
    Number(tableEnd),
    Number(tableStep),
  );

  return (
    <div className="bg-paper-deep/60">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Link
          href={localePath(locale, "/tools")}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy hover:text-navy-strong"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.back}
        </Link>
        <div className="mt-5">
          <PageHero
            icon={LineChart}
            eyebrow={copy.eyebrow}
            title={title}
            description={description}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className={panelClass}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">{copy.presets}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["parabola", copy.presetParabola],
                    ["trig", copy.presetTrig],
                    ["hyperbola", copy.presetHyperbola],
                    ["cubic", copy.presetCubic],
                    ["params", copy.presetParams],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyPreset(id)}
                    className="inline-flex items-center rounded-full border border-brass/25 bg-brass-tint/40 px-3 py-1 text-xs font-semibold text-ink hover:border-brass/50 hover:bg-brass-tint/70 hover:text-navy transition-colors cursor-pointer shadow-2xs"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">{copy.functions}</h2>
                <button
                  type="button"
                  onClick={addFunction}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {copy.addFunction}
                </button>
              </div>
              <ul className="mt-4 space-y-3">
                {functions.map((row, index) => (
                  <li key={row.id}>
                    <FunctionRow
                      row={row}
                      index={index}
                      copy={copy}
                      canRemove={functions.length > 1}
                      onChange={updateFunction}
                      onRemove={removeFunction}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <IntegralPanel
              copy={copy}
              functions={visible}
              shade={shadeIntegral}
              onShade={setShadeIntegral}
              a={integralA}
              b={integralB}
              onA={setIntegralA}
              onB={setIntegralB}
              mode={integralMode}
              onMode={setIntegralMode}
              upperId={upper?.id ?? ""}
              lowerId={lower?.id ?? ""}
              onUpper={setUpperId}
              onLower={setLowerId}
              value={integralValue}
              bounds={bounds}
            />

            <details className={panelClass}>
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {copy.tableTitle}
              </summary>
              <ValuesTable
                copy={copy}
                functions={visible}
                rows={tableRows}
                start={tableStart}
                end={tableEnd}
                step={tableStep}
                copied={copied}
                onStart={setTableStart}
                onEnd={setTableEnd}
                onStep={setTableStep}
                onCopied={setCopied}
              />
            </details>

            <details className={panelClass} open>
              <summary className="cursor-pointer text-sm font-semibold text-ink">
                {copy.syntaxTitle}
              </summary>
              <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-body">
                <li>{copy.syntaxPowers}</li>
                <li>{copy.syntaxMult}</li>
                <li>{copy.syntaxTrig}</li>
                <li>{copy.syntaxConst}</li>
                <li>{copy.syntaxParams}</li>
              </ul>
            </details>
          </aside>

          <div className="space-y-4">
            <GraphCanvas
              copy={copy}
              functions={functions}
              showDerivative={showDerivative}
              showTangent={showTangent}
              showMarkers={showMarkers}
              xDomain={xDomain}
              yDomain={yDomain}
              domainTick={domainTick}
              shadeIntegral={shadeIntegral}
              integralBounds={bounds}
              integralMode={integralMode}
              upper={upper}
              lower={lower}
              onDomainChange={(x, y) => {
                setXDomain(x);
                setYDomain(y);
                setDomainTick((value) => value + 1);
              }}
            />
            <div className="flex flex-col gap-2 text-sm text-ink">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showTangent}
                  onChange={(event) => setShowTangent(event.target.checked)}
                  className="size-4 rounded border-hairline accent-navy"
                />
                {copy.showTangent}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDerivative}
                  onChange={(event) => setShowDerivative(event.target.checked)}
                  className="size-4 rounded border-hairline accent-navy"
                />
                {copy.showDerivative}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showMarkers}
                  onChange={(event) => setShowMarkers(event.target.checked)}
                  className="size-4 rounded border-hairline accent-navy"
                />
                {copy.showMarkers}
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FunctionRow({
  row,
  index,
  copy,
  canRemove,
  onChange,
  onRemove,
}: {
  row: GraphFunction;
  index: number;
  copy: Copy;
  canRemove: boolean;
  onChange: (id: string, patch: Partial<GraphFunction>) => void;
  onRemove: (id: string) => void;
}) {
  const colorId = useId();
  const params = detectParameters(row.expr);

  return (
    <div className="rounded-xl border border-hairline bg-paper/60 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted">f{index + 1}(x)</span>
        <label className="relative size-6 shrink-0 overflow-hidden rounded-full border border-hairline">
          <span className="sr-only">{copy.color}</span>
          <span
            className="absolute inset-0"
            style={{ backgroundColor: row.color }}
            aria-hidden="true"
          />
          <input
            id={colorId}
            type="color"
            value={normalizeHex(row.color)}
            onChange={(event) => onChange(row.id, { color: event.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
        <div className="flex gap-1">
          {CURVE_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={color}
              onClick={() => onChange(row.id, { color })}
              className="size-3.5 rounded-full ring-offset-1 ring-offset-paper"
              style={{
                backgroundColor: color,
                outline:
                  row.color === color ? "2px solid var(--color-navy)" : undefined,
              }}
            />
          ))}
        </div>
        <label className="ml-auto flex size-8 items-center justify-center">
          <span className="sr-only">{copy.toggleVisible}</span>
          <input
            type="checkbox"
            checked={row.visible}
            title={copy.toggleVisible}
            onChange={(event) => onChange(row.id, { visible: event.target.checked })}
            className="size-4 rounded border-hairline accent-navy"
          />
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={iconBtnClass}
            aria-label={copy.removeFunction}
            disabled={!canRemove}
            onClick={() => onRemove(row.id)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <label className="mt-2 block">
        <span className="sr-only">{copy.expression}</span>
        <input
          value={row.expr}
          onChange={(event) => onChange(row.id, { expr: event.target.value })}
          placeholder={copy.expressionPlaceholder}
          spellCheck={false}
          className={
            row.error
              ? `${fieldClass} border-brass focus:border-brass focus:ring-brass/20`
              : fieldClass
          }
        />
      </label>
      {row.error ? (
        <p className="mt-1.5 text-xs text-brass-strong">{copy.invalid}</p>
      ) : row.tex ? (
        <p className="mt-2 text-sm text-ink">
          <KatexPreview tex={`y = ${row.tex}`} />
        </p>
      ) : null}
      {params.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {params.map((name) => {
            const value = row.params[name] ?? 0;
            return (
              <li key={name}>
                <label className="block">
                  <span className="flex justify-between font-mono text-xs text-body">
                    <span>{name}</span>
                    <span>{formatGraphNumber(value, 1)}</span>
                  </span>
                  <input
                    type="range"
                    min={-10}
                    max={10}
                    step={0.1}
                    value={value}
                    onChange={(event) =>
                      onChange(row.id, {
                        params: { ...row.params, [name]: Number(event.target.value) },
                      })
                    }
                    className="mt-1 w-full accent-navy"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function IntegralPanel({
  copy,
  functions,
  shade,
  onShade,
  a,
  b,
  onA,
  onB,
  mode,
  onMode,
  upperId,
  lowerId,
  onUpper,
  onLower,
  value,
  bounds,
}: {
  copy: Copy;
  functions: GraphFunction[];
  shade: boolean;
  onShade: (value: boolean) => void;
  a: string;
  b: string;
  onA: (value: string) => void;
  onB: (value: string) => void;
  mode: IntegralMode;
  onMode: (value: IntegralMode) => void;
  upperId: string;
  lowerId: string;
  onUpper: (value: string) => void;
  onLower: (value: string) => void;
  value: number | null;
  bounds: [number, number] | null;
}) {
  const body =
    mode === "between"
      ? "\\bigl(f_{1}(x)-f_{2}(x)\\bigr)"
      : "f(x)";
  const tex =
    bounds && value !== null
      ? `\\int_{${formatGraphNumber(bounds[0], 2)}}^{${formatGraphNumber(bounds[1], 2)}} ${body}\\,dx = ${formatGraphNumber(value, 4)}`
      : null;
  const upperSelectId = useId();
  const lowerSelectId = useId();

  return (
    <section className={panelClass}>
      <h2 className="text-sm font-semibold text-ink">{copy.integralTitle}</h2>
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={shade}
          onChange={(event) => onShade(event.target.checked)}
          className="size-4 rounded border-hairline accent-navy"
        />
        {copy.integralEnable}
      </label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="text-xs font-semibold text-muted">
          {copy.integralFrom}
          <input value={a} onChange={(event) => onA(event.target.value)} className={`mt-1 ${fieldClass}`} />
        </label>
        <label className="text-xs font-semibold text-muted">
          {copy.integralTo}
          <input value={b} onChange={(event) => onB(event.target.value)} className={`mt-1 ${fieldClass}`} />
        </label>
      </div>
      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-muted">{copy.integralMode}</legend>
        <div className="mt-2 flex flex-col gap-1.5 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="integral-mode"
              checked={mode === "single"}
              onChange={() => onMode("single")}
              className="accent-navy"
            />
            {copy.integralSingle}
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="integral-mode"
              checked={mode === "between"}
              onChange={() => onMode("between")}
              disabled={functions.length < 2}
              className="accent-navy"
            />
            {copy.integralBetween}
          </label>
        </div>
      </fieldset>
      {functions.length > 0 ? (
        <div className="mt-3">
          <label
            htmlFor={upperSelectId}
            className="block text-xs font-semibold text-muted"
          >
            {mode === "between" ? copy.integralUpper : copy.integralFn}
          </label>
          <SelectMenu
            id={upperSelectId}
            className="mt-1"
            triggerClassName="font-mono"
            value={upperId}
            onChange={onUpper}
            options={functions.map((row, index) => ({
              value: row.id,
              label: `f${index + 1}(x) = ${row.expr}`,
            }))}
          />
        </div>
      ) : null}
      {mode === "between" && functions.length > 1 ? (
        <div className="mt-3">
          <label
            htmlFor={lowerSelectId}
            className="block text-xs font-semibold text-muted"
          >
            {copy.integralLower}
          </label>
          <SelectMenu
            id={lowerSelectId}
            className="mt-1"
            triggerClassName="font-mono"
            value={lowerId}
            onChange={onLower}
            options={functions
              .filter((row) => row.id !== upperId)
              .map((row, index) => ({
                value: row.id,
                label: `f${index + 1}(x) = ${row.expr}`,
              }))}
          />
        </div>
      ) : null}
      <div className="mt-4 rounded-xl bg-paper-deep px-3 py-3 text-sm text-ink">
        <p className="text-xs font-semibold tracking-wide text-muted">
          {copy.integralResult}
        </p>
        {tex ? (
          <div className="mt-2 overflow-x-auto">
            <KatexPreview tex={tex} />
          </div>
        ) : (
          <p className="mt-1 text-brass-strong">{copy.integralError}</p>
        )}
      </div>
    </section>
  );
}

function ValuesTable({
  copy,
  functions,
  rows,
  start,
  end,
  step,
  copied,
  onStart,
  onEnd,
  onStep,
  onCopied,
}: {
  copy: Copy;
  functions: GraphFunction[];
  rows: { x: number; ys: (number | null)[] }[];
  start: string;
  end: string;
  step: string;
  copied: boolean;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onStep: (value: string) => void;
  onCopied: (value: boolean) => void;
}) {
  function csv() {
    const header = [copy.tableX, ...functions.map((_, index) => `f${index + 1}`)];
    const body = rows.map((row) =>
      [formatGraphNumber(row.x, 4), ...row.ys.map((y) => (y === null ? "" : formatGraphNumber(y, 4)))].join(","),
    );
    return [header.join(","), ...body].join("\n");
  }

  async function copyTable() {
    try {
      await navigator.clipboard.writeText(csv());
      onCopied(true);
      window.setTimeout(() => onCopied(false), 1600);
    } catch {
      onCopied(false);
    }
  }

  function exportCsv() {
    const blob = new Blob([csv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "values.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-3 space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs font-semibold text-muted">
          {copy.tableStart}
          <input value={start} onChange={(event) => onStart(event.target.value)} className={`mt-1 ${fieldClass}`} />
        </label>
        <label className="text-xs font-semibold text-muted">
          {copy.tableEnd}
          <input value={end} onChange={(event) => onEnd(event.target.value)} className={`mt-1 ${fieldClass}`} />
        </label>
        <label className="text-xs font-semibold text-muted">
          {copy.tableStep}
          <input value={step} onChange={(event) => onStep(event.target.value)} className={`mt-1 ${fieldClass}`} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyTable()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-navy/30"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {copied ? copy.tableCopied : copy.tableCopy}
        </button>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-strong"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {copy.tableExport}
        </button>
      </div>
      {rows.length === 0 || functions.length === 0 ? (
        <p className="text-sm text-muted">{copy.tableEmpty}</p>
      ) : (
        <div className="max-h-64 overflow-auto rounded-xl border border-hairline">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-paper-deep font-semibold text-ink">
              <tr>
                <th className="px-2 py-2">{copy.tableX}</th>
                {functions.map((row, index) => (
                  <th key={row.id} className="px-2 py-2">
                    f{index + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-body">
              {rows.map((row) => (
                <tr key={row.x} className="border-t border-hairline-soft">
                  <td className="px-2 py-1.5">{formatGraphNumber(row.x, 4)}</td>
                  {row.ys.map((y, index) => (
                    <td key={`${row.x}-${index}`} className="px-2 py-1.5">
                      {y === null ? "—" : formatGraphNumber(y, 4)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GraphCanvas({
  copy,
  functions,
  showDerivative,
  showTangent,
  showMarkers,
  xDomain,
  yDomain,
  domainTick,
  shadeIntegral,
  integralBounds,
  integralMode,
  upper,
  lower,
  onDomainChange,
}: {
  copy: Copy;
  functions: GraphFunction[];
  showDerivative: boolean;
  showTangent: boolean;
  showMarkers: boolean;
  xDomain: [number, number];
  yDomain: [number, number];
  domainTick: number;
  shadeIntegral: boolean;
  integralBounds: [number, number] | null;
  integralMode: IntegralMode;
  upper?: GraphFunction;
  lower?: GraphFunction;
  onDomainChange: (x: [number, number], y: [number, number]) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const markersRef = useRef<GraphMarker[]>([]);
  const configRef = useRef({
    functions,
    showDerivative,
    showTangent,
    showMarkers,
    xDomain,
    yDomain,
    shadeIntegral,
    integralBounds,
    integralMode,
    upper,
    lower,
  });
  configRef.current = {
    functions,
    showDerivative,
    showTangent,
    showMarkers,
    xDomain,
    yDomain,
    shadeIntegral,
    integralBounds,
    integralMode,
    upper,
    lower,
  };
  const redrawRef = useRef<(forceDomain: boolean) => void>(() => {});
  const [plotReady, setPlotReady] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [activeMarker, setActiveMarker] = useState<GraphMarker | null>(null);
  const [tangent, setTangent] = useState<{ y0: number; m: number; x0: number } | null>(
    null,
  );
  const [plotError, setPlotError] = useState(false);
  const [xMin, setXMin] = useState(String(xDomain[0]));
  const [xMax, setXMax] = useState(String(xDomain[1]));
  const [yMin, setYMin] = useState(String(yDomain[0]));
  const [yMax, setYMax] = useState(String(yDomain[1]));

  useEffect(() => {
    setXMin(String(xDomain[0]));
    setXMax(String(xDomain[1]));
    setYMin(String(yDomain[0]));
    setYMax(String(yDomain[1]));
  }, [xDomain, yDomain, domainTick]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host;

    let disposed = false;
    let ChartCache: { cache: Record<string, Chart> } | null = null;

    function overlays(chart: Chart) {
      const config = configRef.current;
      const domainX = (chart.meta.xScale?.domain() as [number, number] | undefined) ??
        config.xDomain;
      const markers = config.showMarkers ? collectMarkers(config.functions, domainX) : [];
      markersRef.current = markers;
      syncIntegralOverlay(root, chart, config);
      syncMarkerOverlay(root, chart, markers, copy, setActiveMarker);
      if (!config.showTangent) hideTangent(root);
    }

    async function render(forceDomain: boolean) {
      if (!host || disposed) return;
      const config = configRef.current;

      try {
        const mod = await import("function-plot");
        const functionPlot = mod.default;
        ChartCache = mod.Chart;
        if (disposed) return;

        const width = Math.max(320, host.clientWidth);
        const height = Math.max(360, Math.round(width * 0.58));
        const data = buildPlotData(config.functions, config.showDerivative);
        const xAxis = { domain: [...config.xDomain], position: "sticky" as const };
        const yAxis = { domain: [...config.yDomain], position: "sticky" as const };

        if (!chartRef.current) {
          host.replaceChildren();
          const chart = functionPlot({
            target: host,
            width,
            height,
            grid: true,
            xAxis,
            yAxis,
            tip: { xLine: true, yLine: true },
            data,
          });
          chart.on("mousemove", (point: { x: number; y: number }) => {
            setCursor(point);
            const live = configRef.current;
            const primary = visibleFunctions(live.functions)[0];
            if (live.showTangent && primary) {
              const next = tangentAt(primary, point.x);
              setTangent(next ? { ...next, x0: point.x } : null);
              drawTangent(root, chart, primary, point.x);
            } else {
              setTangent(null);
              hideTangent(root);
            }
            const xSpan = Math.abs((chart.meta.xScale?.domain()[1] ?? 10) - (chart.meta.xScale?.domain()[0] ?? -10));
            const ySpan = Math.abs((chart.meta.yScale?.domain()[1] ?? 10) - (chart.meta.yScale?.domain()[0] ?? -10));
            setActiveMarker(
              nearestMarker(markersRef.current, point.x, point.y, xSpan, ySpan),
            );
          });
          chart.on("mouseout", () => {
            setCursor(null);
            setTangent(null);
            setActiveMarker(null);
            hideTangent(root);
          });
          chart.on("all:zoom", () => overlays(chart));
          chart.on("after:draw", () => overlays(chart));
          chartRef.current = chart;
        } else {
          const chart = chartRef.current;
          chart.options.width = width;
          chart.options.height = height;
          chart.options.data = data;
          if (forceDomain) {
            chart.options.xAxis = xAxis;
            chart.options.yAxis = yAxis;
          }
          chart.build();
        }
        if (chartRef.current) overlays(chartRef.current);
        setPlotError(false);
        setPlotReady(true);
      } catch {
        setPlotError(true);
      }
    }

    redrawRef.current = (forceDomain) => {
      void render(forceDomain);
    };

    void render(true);

    const observer = new ResizeObserver(() => {
      void render(false);
    });
    function onWindowResize() {
      void render(false);
    }

    observer.observe(host);
    window.addEventListener("resize", onWindowResize);

    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      const chart = chartRef.current;
      chart?.removeAllListeners();
      if (chart && ChartCache && chart.options.id) {
        delete ChartCache.cache[chart.options.id];
      }
      chartRef.current = null;
      host.replaceChildren();
    };
  }, [copy]);

  useEffect(() => {
    if (!plotReady) return;
    redrawRef.current(false);
  }, [
    plotReady,
    functions,
    showDerivative,
    showTangent,
    showMarkers,
    shadeIntegral,
    integralMode,
    integralBounds?.[0],
    integralBounds?.[1],
  ]);

  useEffect(() => {
    if (!plotReady) return;
    redrawRef.current(true);
  }, [plotReady, xDomain, yDomain, domainTick]);

  function currentDomain(): { x: [number, number]; y: [number, number] } {
    const chart = chartRef.current;
    if (!chart?.meta.xScale || !chart.meta.yScale) {
      return { x: xDomain, y: yDomain };
    }
    const x = chart.meta.xScale.domain() as [number, number];
    const y = chart.meta.yScale.domain() as [number, number];
    return { x, y };
  }

  function zoomBy(factor: number) {
    const { x, y } = currentDomain();
    onDomainChange(scaleDomain(x, factor), scaleDomain(y, factor));
  }

  function resetView() {
    onDomainChange([...DEFAULT_DOMAIN], [...DEFAULT_DOMAIN]);
  }

  function applyManualDomain(event: FormEvent) {
    event.preventDefault();
    const nextX = parseDomain(xMin, xMax);
    const nextY = parseDomain(yMin, yMax);
    if (!nextX || !nextY) return;
    onDomainChange(nextX, nextY);
  }

  function exportPng() {
    const svg = hostRef.current?.querySelector("svg");
    if (!svg) return;
    downloadSvgAsPng(svg, "graph.png");
  }

  const markerLabel = activeMarker ? markerKindLabel(copy, activeMarker.kind) : null;

  return (
    <section className={panelClass}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          title={copy.resetView}
          onClick={resetView}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-navy/30 hover:text-navy"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {copy.resetView}
        </button>
        <button
          type="button"
          title={copy.zoomIn}
          onClick={() => zoomBy(0.8)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-navy/30 hover:text-navy"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {copy.zoomIn}
        </button>
        <button
          type="button"
          title={copy.zoomOut}
          onClick={() => zoomBy(1.25)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-semibold text-ink hover:border-navy/30 hover:text-navy"
        >
          <Minus className="size-3.5" aria-hidden="true" />
          {copy.zoomOut}
        </button>
        <button
          type="button"
          title={copy.exportPng}
          onClick={exportPng}
          className="inline-flex items-center gap-1.5 rounded-xl bg-navy px-3 py-2 text-xs font-semibold text-white hover:bg-navy-strong"
        >
          <Download className="size-3.5" aria-hidden="true" />
          {copy.exportPng}
        </button>
      </div>

      <div
        ref={hostRef}
        className="relative mt-4 min-h-[22rem] overflow-hidden rounded-xl border border-hairline bg-white [&_svg]:block [&_svg]:max-w-full"
      />
      {plotError ? (
        <p className="mt-2 text-sm text-brass-strong">{copy.plotError}</p>
      ) : null}

      <div className="mt-3 space-y-2 text-sm">
        <p className="font-mono text-body">
          {copy.cursor}:{" "}
          {cursor
            ? `(${formatGraphNumber(cursor.x)}, ${formatGraphNumber(cursor.y)})`
            : copy.cursorEmpty}
        </p>
        {activeMarker && markerLabel ? (
          <p className="rounded-xl bg-navy-tint px-3 py-2 text-navy">
            <span className="font-semibold">{markerLabel}</span>
            {": "}
            ({formatGraphNumber(activeMarker.x)}, {formatGraphNumber(activeMarker.y)})
          </p>
        ) : null}
        {showTangent ? (
          <div className="rounded-xl border border-hairline bg-paper px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-brass">
              {copy.tangentTitle}
            </p>
            {tangent ? (
              <div className="mt-1 space-y-1 text-ink">
                <KatexPreview
                  tex={`y - ${formatGraphNumber(tangent.y0)} = ${formatGraphNumber(tangent.m)}(x - ${formatGraphNumber(tangent.x0)})`}
                />
                <p className="font-mono text-xs text-body">
                  {copy.tangentSlope} = {formatGraphNumber(tangent.m)}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted">{copy.tangentUnavailable}</p>
            )}
          </div>
        ) : null}
      </div>

      <MarkerLegend copy={copy} />

      <form
        onSubmit={applyManualDomain}
        className="mt-4 grid gap-3 sm:grid-cols-2"
      >
        <fieldset className="min-w-0">
          <legend className="text-xs font-semibold text-muted">{copy.domainX}</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <input
              value={xMin}
              onChange={(event) => setXMin(event.target.value)}
              className={fieldClass}
              inputMode="decimal"
            />
            <input
              value={xMax}
              onChange={(event) => setXMax(event.target.value)}
              className={fieldClass}
              inputMode="decimal"
            />
          </div>
        </fieldset>
        <fieldset className="min-w-0">
          <legend className="text-xs font-semibold text-muted">{copy.domainY}</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            <input
              value={yMin}
              onChange={(event) => setYMin(event.target.value)}
              className={fieldClass}
              inputMode="decimal"
            />
            <input
              value={yMax}
              onChange={(event) => setYMax(event.target.value)}
              className={fieldClass}
              inputMode="decimal"
            />
          </div>
        </fieldset>
        <button
          type="submit"
          className="rounded-xl bg-navy px-3 py-2 text-sm font-semibold text-white hover:bg-navy-strong sm:col-span-2"
        >
          {copy.applyDomain}
        </button>
      </form>
    </section>
  );
}

function MarkerLegend({ copy }: { copy: Copy }) {
  const items: [MarkerKind, string, string][] = [
    ["root", copy.markerRoot, "#17365d"],
    ["yIntercept", copy.markerYIntercept, "#8a621b"],
    ["intersection", copy.markerIntersection, "#9333ea"],
    ["max", copy.markerMax, "#dc2626"],
    ["min", copy.markerMin, "#16a34a"],
  ];
  return (
    <ul className="mt-3 flex flex-wrap gap-2 text-xs text-body">
      {items.map(([kind, label, color]) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

function markerKindLabel(copy: Copy, kind: MarkerKind) {
  switch (kind) {
    case "root":
      return copy.markerRoot;
    case "yIntercept":
      return copy.markerYIntercept;
    case "intersection":
      return copy.markerIntersection;
    case "max":
      return copy.markerMax;
    case "min":
      return copy.markerMin;
  }
}

function markerColor(kind: MarkerKind, fallback: string) {
  switch (kind) {
    case "yIntercept":
      return "#8a621b";
    case "intersection":
      return "#9333ea";
    case "max":
      return "#dc2626";
    case "min":
      return "#16a34a";
    default:
      return fallback;
  }
}

function buildPlotData(
  functions: GraphFunction[],
  showDerivative: boolean,
): FunctionPlotDatum[] {
  const visible = visibleFunctions(functions);

  return visible.flatMap((row) => {
    try {
      const fn = compileEvaluator(row.expr, row.params);
      const datum: FunctionPlotDatum = {
        fn: (scope: FunctionPlotDatumScope) => fn(Number(scope.x)) ?? Number.NaN,
        color: row.color,
        graphType: "polyline",
        sampler: "builtIn",
        nSamples: 400,
      };
      const extra: FunctionPlotDatum[] = [datum];
      if (showDerivative) {
        const derived = compileDerivative(row.expr, row.params);
        extra.push({
          fn: (scope: FunctionPlotDatumScope) => derived(Number(scope.x)) ?? Number.NaN,
          color: row.color,
          graphType: "polyline",
          sampler: "builtIn",
          nSamples: 300,
          skipTip: true,
          attr: { "stroke-dasharray": "5 4", "stroke-opacity": 0.7 },
        });
      }
      return extra;
    } catch {
      return [];
    }
  });
}

function canvasGroup(host: HTMLElement, chart: Chart): SVGGElement | null {
  const fromChart = chart.content?.node?.();
  if (fromChart instanceof SVGGElement) return fromChart;
  const fallback = host.querySelector("g.content, g.canvas");
  return fallback instanceof SVGGElement ? fallback : null;
}

function syncIntegralOverlay(
  host: HTMLElement,
  chart: Chart,
  config: {
    shadeIntegral: boolean;
    integralBounds: [number, number] | null;
    integralMode: IntegralMode;
    upper?: GraphFunction;
    lower?: GraphFunction;
  },
) {
  host.querySelector("#integral-fill")?.remove();
  if (!config.shadeIntegral || !config.integralBounds || !config.upper) return;
  const xScale = chart.meta.xScale;
  const yScale = chart.meta.yScale;
  const group = canvasGroup(host, chart);
  if (!xScale || !yScale || !group) return;

  try {
    const upperFn = evaluatorFor(config.upper);
    const lowerFn =
      config.integralMode === "between" && config.lower
        ? evaluatorFor(config.lower)
        : null;
    const samples = sampleFill(
      upperFn,
      lowerFn,
      config.integralBounds[0],
      config.integralBounds[1],
    );
    if (!samples) return;

    const top = samples.upper.map(([x, y]) => `${xScale(x)},${yScale(y)}`);
    const bottom = [...samples.lower]
      .reverse()
      .map(([x, y]) => `${xScale(x)},${yScale(y)}`);
    const path = document.createElementNS(SVG_NS, "path");
    path.id = "integral-fill";
    path.setAttribute("d", `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`);
    path.setAttribute("fill", "#17365d");
    path.setAttribute("fill-opacity", "0.16");
    path.setAttribute("pointer-events", "none");
    group.insertBefore(path, group.firstChild);
  } catch {
    /* keep the plot even if shading fails */
  }
}

function syncMarkerOverlay(
  host: HTMLElement,
  chart: Chart,
  markers: GraphMarker[],
  copy: Copy,
  onSelect: (marker: GraphMarker) => void,
) {
  host.querySelectorAll(".graph-marker, .graph-marker-label").forEach((node) => node.remove());
  const xScale = chart.meta.xScale;
  const yScale = chart.meta.yScale;
  const group = canvasGroup(host, chart);
  if (!xScale || !yScale || !group) return;

  for (const marker of markers) {
    try {
      const circle = document.createElementNS(SVG_NS, "circle");
      circle.setAttribute("class", "graph-marker");
      circle.setAttribute("cx", String(xScale(marker.x)));
      circle.setAttribute("cy", String(yScale(marker.y)));
      circle.setAttribute("r", "5");
      circle.setAttribute("fill", markerColor(marker.kind, marker.color));
      circle.setAttribute("stroke", "#ffffff");
      circle.setAttribute("stroke-width", "1.5");
      circle.style.cursor = "pointer";
      const title = document.createElementNS(SVG_NS, "title");
      const label = markerKindLabel(copy, marker.kind);
      title.textContent = `${label} (${formatGraphNumber(marker.x)}, ${formatGraphNumber(marker.y)})`;
      circle.appendChild(title);
      circle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        onSelect(marker);
      });
      group.appendChild(circle);

      if (marker.kind === "max" || marker.kind === "min") {
        const text = document.createElementNS(SVG_NS, "text");
        text.setAttribute("class", "graph-marker-label");
        text.setAttribute("x", String(xScale(marker.x) + 7));
        text.setAttribute("y", String(yScale(marker.y) - 8));
        text.setAttribute("fill", markerColor(marker.kind, marker.color));
        text.setAttribute("font-size", "11");
        text.setAttribute("font-weight", "700");
        text.setAttribute("pointer-events", "none");
        text.textContent = marker.kind === "max" ? "Max" : "Min";
        group.appendChild(text);
      }
    } catch {
      /* skip a bad marker */
    }
  }
}

function drawTangent(
  host: HTMLElement,
  chart: Chart,
  row: GraphFunction,
  x0: number,
) {
  const xScale = chart.meta.xScale;
  const yScale = chart.meta.yScale;
  const group = canvasGroup(host, chart);
  if (!xScale || !yScale || !group) return;
  const next = tangentAt(row, x0);
  let line = host.querySelector("#tangent-line") as SVGLineElement | null;
  if (!next) {
    line?.remove();
    return;
  }
  const domain = xScale.domain() as [number, number];
  const y1 = next.y0 + next.m * (domain[0] - x0);
  const y2 = next.y0 + next.m * (domain[1] - x0);
  if (!line) {
    line = document.createElementNS(SVG_NS, "line");
    line.id = "tangent-line";
    line.setAttribute("stroke", "#8a621b");
    line.setAttribute("stroke-width", "1.75");
    line.setAttribute("stroke-dasharray", "6 4");
    line.setAttribute("pointer-events", "none");
    group.appendChild(line);
  }
  line.setAttribute("x1", String(xScale(domain[0])));
  line.setAttribute("y1", String(yScale(y1)));
  line.setAttribute("x2", String(xScale(domain[1])));
  line.setAttribute("y2", String(yScale(y2)));
}

function hideTangent(host: HTMLElement) {
  host.querySelector("#tangent-line")?.remove();
}

function scaleDomain(domain: [number, number], factor: number): [number, number] {
  const center = (domain[0] + domain[1]) / 2;
  const half = ((domain[1] - domain[0]) / 2) * factor;
  return [center - half, center + half];
}

function parseDomain(minRaw: string, maxRaw: string): [number, number] | null {
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return null;
  return [min, max];
}

function normalizeHex(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#2563eb";
}

function downloadSvgAsPng(svg: SVGSVGElement, filename: string) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const width = svg.clientWidth || Number(svg.getAttribute("width")) || 800;
  const height = svg.clientHeight || Number(svg.getAttribute("height")) || 480;
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", svg.getAttribute("viewBox") ?? `0 0 ${width} ${height}`);

  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(clone);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(url);
      return;
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((png) => {
      URL.revokeObjectURL(url);
      if (!png) return;
      const href = URL.createObjectURL(png);
      const link = document.createElement("a");
      link.href = href;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(href);
    }, "image/png");
  };

  image.onerror = () => URL.revokeObjectURL(url);
  image.src = url;
}
