import type { Fraction, FractionOp, WorkedStep } from "./types";
import { add, applyOp, div, lcm, mul } from "./rational";
import { OP_TEX, toLatex } from "./format";

export function expressionLatex(
  values: Fraction[],
  ops: FractionOp[],
): string {
  return values
    .map((v, i) => {
      const t = toLatex(v);
      return i === 0 ? t : ` ${OP_TEX[ops[i - 1]!]} ${t}`;
    })
    .join("");
}

export function generateSteps(
  values: Fraction[],
  ops: FractionOp[],
): WorkedStep[] {
  const steps: WorkedStep[] = [
    {
      id: "given",
      titleKey: "stepGiven",
      tex: expressionLatex(values, ops),
    },
  ];

  if (values.length === 1) return steps;

  if (ops.length === 1) {
    return [...steps, ...binarySteps(values[0]!, ops[0]!, values[1]!)];
  }

  let acc = values[0]!;
  let built = toLatex(acc);
  for (let i = 0; i < ops.length; i++) {
    const next = applyOp(ops[i]!, acc, values[i + 1]!);
    steps.push({
      id: `combine-${i}`,
      titleKey: "stepCombine",
      tex: `${built} ${OP_TEX[ops[i]!]} ${toLatex(values[i + 1]!)} = ${toLatex(next)}`,
    });
    acc = next;
    built = toLatex(acc);
  }
  return steps;
}

function binarySteps(a: Fraction, op: FractionOp, b: Fraction): WorkedStep[] {
  if (op === "+" || op === "-") {
    const den = lcm(a.d, b.d);
    const a2 = { n: a.n * (den / a.d), d: den };
    const b2 = { n: b.n * (den / b.d), d: den };
    const raw =
      op === "+"
        ? { n: a2.n + b2.n, d: den }
        : { n: a2.n - b2.n, d: den };
    const result = applyOp(op, a, b);
    return [
      {
        id: "lcd",
        titleKey: "stepLcd",
        tex: `\\operatorname{lcm}(${a.d}, ${b.d}) = ${den}`,
      },
      {
        id: "rewrite",
        titleKey: "stepCommonDen",
        tex: `${toLatex(a)} = ${toLatex(a2)},\\quad ${toLatex(b)} = ${toLatex(b2)}`,
      },
      {
        id: "combine",
        titleKey: "stepCombine",
        tex: `${toLatex(a2)} ${OP_TEX[op]} ${toLatex(b2)} = \\frac{${raw.n}}{${raw.d}}`,
      },
      {
        id: "simplify",
        titleKey: "stepSimplify",
        tex: `\\frac{${raw.n}}{${raw.d}} = ${toLatex(result)}`,
      },
    ];
  }

  if (op === "*") {
    const raw = { n: a.n * b.n, d: a.d * b.d };
    const result = mul(a, b);
    return [
      {
        id: "multiply",
        titleKey: "stepMultiply",
        tex: `${toLatex(a)} \\times ${toLatex(b)} = \\frac{${raw.n}}{${raw.d}}`,
      },
      {
        id: "simplify",
        titleKey: "stepSimplify",
        tex: `\\frac{${raw.n}}{${raw.d}} = ${toLatex(result)}`,
      },
    ];
  }

  const flipped = div(a, b);
  return [
    {
      id: "reciprocal",
      titleKey: "stepReciprocal",
      tex: `${toLatex(a)} \\div ${toLatex(b)} = ${toLatex(a)} \\times ${toLatex({ n: b.d, d: b.n < 0n ? -b.n : b.n })}`,
      noteKey: "stepInvert",
    },
    {
      id: "result",
      titleKey: "stepSimplify",
      tex: toLatex(flipped),
    },
  ];
}

export function unsimplifiedSum(a: Fraction, b: Fraction, op: "+" | "-"): Fraction {
  const den = a.d * b.d;
  const n = op === "+" ? a.n * b.d + b.n * a.d : a.n * b.d - b.n * a.d;
  return { n, d: den };
}

export function unsimplifiedProduct(a: Fraction, b: Fraction): Fraction {
  return { n: a.n * b.n, d: a.d * b.d };
}