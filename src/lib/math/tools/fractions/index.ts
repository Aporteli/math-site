import type {
    EvalMode,
    Fraction,
    FractionEvalResult,
    FractionOp,
  } from "./types";
  import { evaluateChain } from "./evaluate";
  import { forms, toLatex, OP_TEX } from "./format";
  import { expressionLatex, generateSteps, unsimplifiedProduct, unsimplifiedSum } from "./steps";
  import { parseParts } from "./parse";
  import { applyOp } from "./rational";
  
  export { FractionError } from "./types";
  export type {
    Fraction,
    FractionOp,
    FractionErrorCode,
    FractionEvalResult,
    FractionForms,
    WorkedStep,
    EvalMode,
    MixedNumber,
  } from "./types";
  
  export { parseParts, parseFractionInput, parseDecimal } from "./parse";
  export { frac, add, sub, mul, div, cmp, toMixed, fromMixed } from "./rational";
  export { toLatex, toMixedLatex, toPlain, toRepeatingDecimal, forms } from "./format";
  export { evaluateChain } from "./evaluate";
  
  export type FractionField = { n: string; d: string; whole?: string };
  
  /**
   * UI entry point: field strings + ops → exact result, forms, steps.
   */
  export function evaluateExpression(
    fields: FractionField[],
    ops: FractionOp[],
    mode: EvalMode = "precedence",
  ): FractionEvalResult {
    const values = fields.map((f, i) => parseParts(f.n, f.d, i, f.whole ?? ""));
    const value = evaluateChain(values, ops, mode);
  
    let unsimplified: Fraction = values[0]!;
    if (ops.length === 1 && values.length === 2) {
      const op = ops[0]!;
      unsimplified =
        op === "+" || op === "-"
          ? unsimplifiedSum(values[0]!, values[1]!, op)
          : op === "*"
            ? unsimplifiedProduct(values[0]!, values[1]!)
            : { n: values[0]!.n * values[1]!.d, d: values[0]!.d * values[1]!.n };
    } else {
      unsimplified = value;
    }
  
    const expr = expressionLatex(values, ops);
    const grouped =
      mode === "precedence" && ops.some((o) => o === "+" || o === "-") &&
      ops.some((o) => o === "*" || o === "/")
        ? groupedLatex(values, ops)
        : expr;
  
    return {
      value,
      expressionLatex: expr,
      groupedLatex: grouped,
      forms: forms(unsimplified, value),
      steps: generateSteps(values, ops),
      mode,
    };
  }
  
  function groupedLatex(values: Fraction[], ops: FractionOp[]): string {
    return values
      .map((v, i) => {
        const t = toLatex(v);
        if (i === 0) return t;
        return ` ${OP_TEX[ops[i - 1]!]} ${t}`;
      })
      .join("");
  }
  
  export function compareFractions(a: FractionField, b: FractionField) {
    const left = parseParts(a.n, a.d, 0);
    const right = parseParts(b.n, b.d, 1);
    return { left, right, cmp: applyOp("+", left, { n: -right.n, d: right.d }) };
  }