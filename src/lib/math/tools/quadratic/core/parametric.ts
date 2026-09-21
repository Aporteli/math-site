import type { SolutionStep, MethodSolution, ExactRoot } from '../types/quadratic';
import {
  type SymExpr,
  parseParametricEquation,
  exprToLatex,
  isOneSym,
  addE,
  mulE,
  negE,
  powE,
  num,
  collectInVariable,
  exprToLatex as e2l,
} from './symbolic';

function subE(a: SymExpr, b: SymExpr): SymExpr {
  return addE(a, negE(b));
}

export type ParametricSolution = {
  mode: 'parametric';
  original: string;
  variable: string;
  params: string[];
  aLatex: string;
  bLatex: string;
  cLatex: string;
  standardLatex: string;
  discLatex: string;
  root1Latex: string;
  root2Latex: string;
  sumLatex: string;
  prodLatex: string;
  steps: SolutionStep[];
  /** Single-parameter discriminant analysis note (Georgian), if applicable */
  analysisNote?: string;
};

function discExpr(a: SymExpr, b: SymExpr, c: SymExpr): SymExpr {
  // b^2 - 4ac
  return subE(powE(b, 2), mulE(num(4), a, c));
}

export function solveParametric(input: string, variable = 'x'): ParametricSolution {
  const parsed = parseParametricEquation(input, variable);
  const { a, b, c, params, original, standardLatex } = parsed;

  const Draw = discExpr(a, b, c);
  // Expand D as a polynomial in parameters (no solve-variable)
  const expanded = collectInVariable(Draw, variable); // c0 holds full poly if no x
  const D = expanded.c0; // should be entire D since D has no x
  const aL = exprToLatex(a);
  const bL = exprToLatex(b);
  const cL = exprToLatex(c);
  const dL = exprToLatex(D);

  const twoA = isOneSym(a) ? num(2) : mulE(num(2), a);
  const twoAL = exprToLatex(twoA);
  const negB = negE(b);
  const negBL = exprToLatex(negB);

  const root1Latex = `\\dfrac{${negBL} + \\sqrt{${dL}}}{${twoAL}}`;
  const root2Latex = `\\dfrac{${negBL} - \\sqrt{${dL}}}{${twoAL}}`;

  // Vieta: sum = -b/a, prod = c/a
  const sumLatex =
    isOneSym(a) ? exprToLatex(negE(b)) : `\\dfrac{${exprToLatex(negE(b))}}{${aL}}`;
  const prodLatex = isOneSym(a) ? cL : `\\dfrac{${cL}}{${aL}}`;

  const steps: SolutionStep[] = [];

  steps.push({
    title: 'ნაბიჯი 1: პარამეტრული განტოლება',
    explanation: `განტოლება შეიცავს პარამეტრს (${params.map((p) => `$${p}$`).join(', ')}). ამოვხსნათ $${variable}$-ის მიმართ.`,
    latex: original.replace(/\$/g, ''),
  });

  steps.push({
    title: 'ნაბიჯი 2: სტანდარტული სახე',
    explanation: `მოვიყვანოთ სახეზე $A${variable}^{2} + B${variable} + C = 0$, სადაც კოეფიციენტები პარამეტრებზეა დამოკიდებული.`,
    latex: standardLatex,
  });

  steps.push({
    title: 'ნაბიჯი 3: კოეფიციენტები',
    explanation: 'გამოვყოთ კოეფიციენტები:',
    latex: `A = ${aL}, \\quad B = ${bL}, \\quad C = ${cL}`,
  });

  steps.push({
    title: 'ნაბიჯი 4: დისკრიმინანტი',
    explanation: 'დისკრიმინანტი $D = B^{2} - 4AC$ (გამოსახულება პარამეტრებში):',
    latex: `D = ${dL}`,
  });

  steps.push({
    title: 'ნაბიჯი 5: ფესვები',
    explanation: `კვადრატული ფორმულით $${variable}_{1,2} = \\dfrac{-B \\pm \\sqrt{D}}{2A}$:`,
    latex: `${variable}_{1} = ${root1Latex}, \\quad ${variable}_{2} = ${root2Latex}`,
  });

  steps.push({
    title: 'ნაბიჯი 6: ვიეტას ფორმულები',
    explanation: 'ფესვების ჯამი და ნამრავლი:',
    latex: `${variable}_{1} + ${variable}_{2} = ${sumLatex}, \\quad ${variable}_{1}\\cdot ${variable}_{2} = ${prodLatex}`,
  });

  // Nature discussion
  const mainParam = params[0];
  let analysisNote: string | undefined;
  if (params.length === 1) {
    analysisNote = `ფესვების ბუნება დამოკიდებულია $D$-ს ნიშანზე პარამეტრის $${mainParam}$ მიმართ: $D > 0$ — ორი განსხვავებული ნამდვილი ფესვი; $D = 0$ — ერთი ორმაგი ფესვი; $D < 0$ — ორი კომპლექსური ფესვი.`;
    steps.push({
      title: 'ნაბიჯი 7: ფესვების ბუნება',
      explanation: analysisNote,
      latex: `D(${mainParam}) = ${dL}`,
    });
  } else if (params.length > 1) {
    analysisNote = `ფესვების ბუნება დამოკიდებულია დისკრიმინანტზე $D = ${dL}$ პარამეტრების სივრცეში.`;
    steps.push({
      title: 'ნაბიჯი 7: ფესვების ბუნება',
      explanation: analysisNote,
      latex: `D = ${dL}`,
    });
  }

  return {
    mode: 'parametric',
    original,
    variable,
    params,
    aLatex: aL,
    bLatex: bL,
    cLatex: cL,
    standardLatex,
    discLatex: dL,
    root1Latex,
    root2Latex,
    sumLatex,
    prodLatex,
    steps,
    analysisNote,
  };
}

/** Detect if input contains letters other than the solve variable */
export function hasParameters(input: string, variable: string): boolean {
  const cleaned = input.replace(/\$/g, '');
  for (const ch of cleaned) {
    if (/[a-zA-Z]/.test(ch) && ch !== variable) return true;
  }
  return false;
}
