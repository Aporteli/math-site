export type FractionOp = "+" | "-" | "*" | "/";

/** Exact rational. Sign lives on `n`. `d` is always > 0. */
export type Fraction = {
  n: bigint;
  d: bigint;
};

export type MixedNumber = {
  sign: 1 | -1;
  whole: bigint;
  n: bigint;
  d: bigint;
};

export type FractionErrorCode =
  | "EMPTY"
  | "INVALID_NUMBER"
  | "ZERO_DENOMINATOR"
  | "DIVISION_BY_ZERO"
  | "MISMATCHED_OPS"
  | "EMPTY_EXPRESSION";

export class FractionError extends Error {
  constructor(
    readonly code: FractionErrorCode,
    readonly field?: "n" | "d" | "whole",
    readonly index?: number,
  ) {
    super(code);
    this.name = "FractionError";
  }
}

export type ParsedTerm =
  | { type: "fraction"; value: Fraction; raw: string }
  | { type: "op"; op: FractionOp };

export type EvalMode = "precedence" | "leftToRight";

export type WorkedStep = {
  id: string;
  titleKey: string;
  tex: string;
  noteKey?: string;
};

export type FractionForms = {
  simplified: Fraction;
  unsimplified: Fraction;
  mixed: MixedNumber;
  decimal: string;
  repeating: { nonRepeating: string; repeating: string } | null;
  percent: string;
  latex: string;
  mixedLatex: string;
  plain: string;
};

export type FractionEvalResult = {
  value: Fraction;
  expressionLatex: string;
  groupedLatex: string;
  forms: FractionForms;
  steps: WorkedStep[];
  mode: EvalMode;
};