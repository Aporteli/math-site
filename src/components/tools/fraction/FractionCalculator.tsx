"use client";

import { useId, useState, useEffect, useRef } from "react";
import { Delete, Keyboard, Plus, X } from "lucide-react";
import { KatexPreview } from "@/components/math/katex-preview";
import type { Dictionary } from "@/i18n/types";
import {
  evaluateLeftToRight,
  toLaTeX,
  type Fraction,
} from "@/lib/math/tools/fractions/fractions";

export type FractionCalculatorCopy = Dictionary["fractionTool"];

type Op = "+" | "-" | "*" | "/";
type Term =
  | { type: "fraction"; n: string; d: string }
  | { type: "op"; op: Op };

type Props = {
  copy: FractionCalculatorCopy;
};

type ActiveField = { termIndex: number; part: "n" | "d" };

const OP_TEX: Record<Op, string> = {
  "+": "+",
  "-": "-",
  "*": "\\times",
  "/": "\\div",
};

const fieldClass =
  "w-full min-w-0 rounded-xl border border-hairline bg-white px-3 py-2 text-center font-mono text-sm text-ink shadow-sm transition-colors placeholder:text-muted focus:border-navy/40 focus:outline-none focus:ring-2 focus:ring-navy/15";

const keyClass =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-navy-tint focus:outline-none focus:ring-2 focus:ring-navy/15";

const opButtonClass =
  "min-w-10 rounded-xl border border-hairline px-3 py-2 text-sm font-semibold transition-colors";

function parseCoeff(raw: string): number | null {
  const t = raw.trim();
  if (t === "" || t === "-" || t === "+" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function rawFrac(n: number, d: number): string {
  if (n < 0) return `-\\frac{${Math.abs(n)}}{${d}}`;
  return `\\frac{${n}}{${d}}`;
}

function applyKey(current: string, key: string): string {
  if (key === "backspace") return current.slice(0, -1);
  if (key === "clear") return "";
  if (key === "sign") {
    return current.startsWith("-") ? current.slice(1) : `-${current}`;
  }
  if (key === ".") {
    if (current.includes(".")) return current;
    if (current === "" || current === "-") return `${current}0.`;
    return `${current}.`;
  }
  if (current === "0") return key;
  if (current === "-0") return `-${key}`;
  return current + key;
}

function FractionFields({
  n,
  d,
  onN,
  onD,
  nLabel,
  dLabel,
  legend,
  activePart,
  onFocusN,
  onFocusD,
  keyboardOpen,
}: {
  n: string;
  d: string;
  onN: (v: string) => void;
  onD: (v: string) => void;
  nLabel: string;
  dLabel: string;
  legend: string;
  activePart: "n" | "d" | null;
  onFocusN: () => void;
  onFocusD: () => void;
  keyboardOpen: boolean;
}) {
  const baseId = useId();
  const nId = `${baseId}-n`;
  const dId = `${baseId}-d`;
  const activeClass = " border-navy/40 ring-2 ring-navy/20";

  return (
    <fieldset className="min-w-0 flex-1">
      <legend className="mb-2 text-xs font-semibold text-muted">
        {legend}
      </legend>
      <div className="flex flex-col items-stretch gap-1.5">
        <label htmlFor={nId} className="sr-only">
          {nLabel}
        </label>
        <input
          id={nId}
          className={`${fieldClass}${activePart === "n" ? activeClass : ""}`}
          inputMode={keyboardOpen ? "none" : "numeric"}
          value={n}
          onChange={(e) => onN(e.target.value)}
          onFocus={(e) => {
            onFocusN();
            if (keyboardOpen) e.currentTarget.select();
          }}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="border-t border-hairline" />
        <label htmlFor={dId} className="sr-only">
          {dLabel}
        </label>
        <input
          id={dId}
          className={`${fieldClass}${activePart === "d" ? activeClass : ""}`}
          inputMode={keyboardOpen ? "none" : "numeric"}
          value={d}
          onChange={(e) => onD(e.target.value)}
          onFocus={(e) => {
            onFocusD();
            if (keyboardOpen) e.currentTarget.select();
          }}
          autoComplete="off"
          spellCheck={false}
        />
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
  const digits = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

  return (
    <div
      id={titleId}
      role="region"
      aria-label={copy.keyboard}
      className="mt-4 rounded-2xl border border-hairline bg-white shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">{copy.keyboard}</h2>
          <p className="mt-0.5 text-xs text-muted">{fieldLabel}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.keyboardClose}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-muted transition-colors hover:bg-paper hover:text-navy"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="overflow-x-auto rounded-xl border border-hairline bg-paper px-3 py-2 text-center font-mono text-lg text-ink">
          {value || "\u00a0"}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {digits.map((digit) => (
            <button
              key={digit}
              type="button"
              className={keyClass}
              onClick={() => onKey(digit)}
            >
              {digit}
            </button>
          ))}
          <button type="button" className={keyClass} onClick={() => onKey(".")}>
            .
          </button>
          <button type="button" className={keyClass} onClick={() => onKey("0")}>
            0
          </button>
          <button
            type="button"
            aria-label={copy.backspace}
            className={keyClass}
            onClick={() => onKey("backspace")}
          >
            <Delete className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            className={keyClass}
            onClick={() => onKey("sign")}
          >
            ±
          </button>
          <button
            type="button"
            className={keyClass}
            onClick={() => onKey("clear")}
          >
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
  const [terms, setTerms] = useState<Term[]>([
    { type: "fraction", n: "1", d: "2" },
    { type: "op", op: "+" },
    { type: "fraction", n: "1", d: "3" },
  ]);
  const [activeField, setActiveField] = useState<ActiveField>({
    termIndex: 0,
    part: "n",
  });
  const [showKeyboard, setShowKeyboard] = useState(false);
  const keyboardTitleId = useId();
  const keyboardRootRef = useRef<HTMLDivElement>(null);

  const fractions: Fraction[] = [];
  const ops: Op[] = [];
  let invalid = false;

  for (const term of terms) {
    if (term.type === "fraction") {
      const n = parseCoeff(term.n);
      const d = parseCoeff(term.d);
      if (n === null || d === null) {
        invalid = true;
        break;
      }
      fractions.push({ n, d });
    } else {
      ops.push(term.op);
    }
  }

  if (!invalid && fractions.length !== ops.length + 1) {
    invalid = true;
  }

  let exprTex = "";
  let resultTex = "";

  if (!invalid) {
    exprTex = terms
      .map((term) => {
        if (term.type === "fraction") {
          const n = parseCoeff(term.n)!;
          const d = parseCoeff(term.d)!;
          return rawFrac(n, d);
        }
        return ` ${OP_TEX[term.op]} `;
      })
      .join("");

    try {
      const result = evaluateLeftToRight(fractions, ops);
      resultTex = toLaTeX(result.n, result.d);
    } catch {
      invalid = true;
    }
  }

  useEffect(() => {
    if (!showKeyboard) return;
    function handlePointerDown(event: PointerEvent) {
      if (!keyboardRootRef.current?.contains(event.target as Node)) {
        setShowKeyboard(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showKeyboard]);

  const operations: { id: Op; label: string }[] = [
    { id: "+", label: copy.add },
    { id: "-", label: copy.subtract },
    { id: "*", label: copy.multiply },
    { id: "/", label: copy.divide },
  ];

  const fractionCount = terms.filter((t) => t.type === "fraction").length;

  function updateFraction(index: number, part: "n" | "d", value: string) {
    setTerms((prev) =>
      prev.map((term, i) =>
        i === index && term.type === "fraction"
          ? { ...term, [part]: value }
          : term,
      ),
    );
  }

  function updateOp(index: number, op: Op) {
    setTerms((prev) =>
      prev.map((term, i) =>
        i === index && term.type === "op" ? { ...term, op } : term,
      ),
    );
  }

  function addFraction() {
    setTerms((prev) => [
      ...prev,
      { type: "op", op: "+" },
      { type: "fraction", n: "1", d: "1" },
    ]);
  }

  function removeFraction(index: number) {
    setTerms((prev) => {
      if (prev.filter((t) => t.type === "fraction").length <= 1) return prev;
      const next = [...prev];
      if (index > 0 && next[index - 1]?.type === "op") {
        next.splice(index - 1, 2);
      } else if (next[index + 1]?.type === "op") {
        next.splice(index, 2);
      } else {
        next.splice(index, 1);
      }
      return next;
    });
    setActiveField((prev) => {
      if (prev.termIndex < index) return prev;
      if (prev.termIndex === index) return { termIndex: 0, part: "n" };
      return { ...prev, termIndex: Math.max(0, prev.termIndex - 2) };
    });
  }

  function allFieldOrder(): ActiveField[] {
    const order: ActiveField[] = [];
    terms.forEach((term, i) => {
      if (term.type === "fraction") {
        order.push({ termIndex: i, part: "n" });
        order.push({ termIndex: i, part: "d" });
      }
    });
    return order;
  }

  function activeFieldLabel(): string {
    const term = terms[activeField.termIndex];
    if (term?.type !== "fraction") return "";
    const num =
      terms.slice(0, activeField.termIndex).filter((t) => t.type === "fraction")
        .length + 1;
    const part =
      activeField.part === "n" ? copy.numerator : copy.denominator;
    return `${copy.fractionLabel} ${num} · ${part}`;
  }

  function activeFieldValue(): string {
    const term = terms[activeField.termIndex];
    return term?.type === "fraction" ? term[activeField.part] : "";
  }

  function insertKey(key: string) {
    const term = terms[activeField.termIndex];
    if (term?.type !== "fraction") return;
    updateFraction(
      activeField.termIndex,
      activeField.part,
      applyKey(term[activeField.part], key),
    );
  }

  function goNextField() {
    const order = allFieldOrder();
    const i = order.findIndex(
      (f) =>
        f.termIndex === activeField.termIndex && f.part === activeField.part,
    );
    setActiveField(order[(i + 1) % order.length]!);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
        <div ref={keyboardRootRef}>
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              aria-expanded={showKeyboard}
              aria-controls={keyboardTitleId}
              aria-haspopup="true"
              onClick={() => setShowKeyboard((open) => !open)}
              className={
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors " +
                (showKeyboard
                  ? "border-navy/30 bg-navy text-white hover:bg-navy-strong"
                  : "border-hairline bg-white text-ink hover:bg-navy-tint")
              }
            >
              <Keyboard className="size-4" aria-hidden="true" />
              {copy.keyboard}
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            {terms.map((term, index) => {
              if (term.type === "op") {
                const opGroupId = `${keyboardTitleId}-op-${index}`;
                return (
                  <div key={`op-${index}`} className="sm:mb-1">
                    <p
                      id={opGroupId}
                      className="mb-2 text-xs font-semibold text-muted"
                    >
                      {copy.operation}
                    </p>
                    <div
                      role="group"
                      aria-labelledby={opGroupId}
                      className="grid grid-cols-4 gap-1.5 sm:grid-cols-2"
                    >
                      {operations.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={item.label}
                          aria-pressed={term.op === item.id}
                          onClick={() => updateOp(index, item.id)}
                          className={
                            opButtonClass +
                            (term.op === item.id
                              ? " bg-navy text-white hover:bg-navy-strong"
                              : " bg-white text-ink hover:bg-navy-tint")
                          }
                        >
                          {item.id === "*"
                            ? "×"
                            : item.id === "/"
                              ? "÷"
                              : item.id}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              const fractionIndex =
                terms.slice(0, index).filter((t) => t.type === "fraction")
                  .length + 1;

              return (
                <div key={`frac-${index}`} className="flex items-end gap-2">
                  <FractionFields
                    n={term.n}
                    d={term.d}
                    onN={(v) => updateFraction(index, "n", v)}
                    onD={(v) => updateFraction(index, "d", v)}
                    nLabel={copy.numerator}
                    dLabel={copy.denominator}
                    legend={`${copy.fractionLabel} ${fractionIndex}`}
                    activePart={
                      showKeyboard &&
                      activeField.termIndex === index
                        ? activeField.part
                        : null
                    }
                    onFocusN={() =>
                      setActiveField({ termIndex: index, part: "n" })
                    }
                    onFocusD={() =>
                      setActiveField({ termIndex: index, part: "d" })
                    }
                    keyboardOpen={showKeyboard}
                  />
                  {fractionCount > 1 ? (
                    <button
                      type="button"
                      aria-label={copy.removeFraction}
                      onClick={() => removeFraction(index)}
                      className="mb-1 inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-hairline text-muted transition-colors hover:bg-paper hover:text-navy"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addFraction}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-navy-tint"
          >
            <Plus className="size-4" aria-hidden="true" />
            {copy.addFraction}
          </button>

          {showKeyboard ? (
            <FractionKeyboardPopup
              copy={copy}
              titleId={keyboardTitleId}
              fieldLabel={activeFieldLabel()}
              value={activeFieldValue()}
              onKey={insertKey}
              onNext={goNextField}
              onClose={() => setShowKeyboard(false)}
            />
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-hairline bg-paper p-4 shadow-sm sm:p-5">
        {invalid ? (
          <p className="text-sm text-muted">{copy.invalid}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">
                {copy.expression}
              </p>
              <div className="overflow-x-auto rounded-xl border border-hairline bg-white px-3 py-3 text-ink">
                <KatexPreview tex={exprTex} displayMode />
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">
                {copy.result}
              </p>
              <div className="overflow-x-auto rounded-xl border border-hairline bg-white px-3 py-3 text-ink">
                <KatexPreview tex={`${exprTex} = ${resultTex}`} displayMode />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
