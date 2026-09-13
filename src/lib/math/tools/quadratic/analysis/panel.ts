import type { QuadraticSolution, ExactRoot } from "../types/quadratic";
import {
  toFraction,
  isPositive,
  isNegative,
  cmp,
  ZERO,
} from "../core/rational";

export type AnalysisRow = {
  label: string;
  valueLatex: string;
  note?: string;
};

/** აკადემიური ანალიზის ცხრილი — პარაბოლის თვისებები */
export function buildAnalysisTable(sol: QuadraticSolution): AnalysisRow[] {
  const {
    equation,
    discriminant,
    discriminantExact,
    classification,
    analysis,
    roots,
  } = sol;
  const { a, b, c, variable } = equation;
  const rows: AnalysisRow[] = [];

  rows.push({
    label: "სტანდარტული სახე",
    valueLatex: equation.standardForm.replace(/\*/g, ""),
  });

  rows.push({
    label: "კოეფიციენტები",
    valueLatex: `a=${toFraction(a)},\\; b=${toFraction(b)},\\; c=${toFraction(c)}`,
  });

  rows.push({
    label: "დისკრიმინანტი",
    valueLatex: discriminantExact,
    note:
      cmp(discriminant, ZERO) > 0
        ? "D > 0 — ორი განსხვავებული ნამდვილი ფესვი"
        : cmp(discriminant, ZERO) === 0
          ? "D = 0 — ერთი ორმაგი ნამდვილი ფესვი"
          : "D < 0 — ორი კომპლექსური ფესვი",
  });

  rows.push({
    label: "ფესვების ბუნება",
    valueLatex: classificationLabel(classification),
  });

  rows.push({
    label: "ფესვები",
    valueLatex: roots.map((r) => r.exact).join(",\\; ") || "\\emptyset",
  });

  if (sol.factorization) {
    rows.push({
      label: "ფაქტორიზაცია",
      valueLatex: sol.factorization,
    });
  }

  rows.push({
    label: "წვერო (vertex)",
    valueLatex: `\\left(${analysis.vertex.x.exact},\\; ${analysis.vertex.y.exact}\\right)`,
    note: analysis.extremaType,
  });

  rows.push({
    label: "სიმეტრიის ღერძი",
    valueLatex: `${variable} = ${analysis.axisOfSymmetry.exact}`,
  });

  rows.push({
    label: "y-თან გადაკვეთა",
    valueLatex: `(0,\\; ${analysis.yIntercept.exact})`,
  });

  if (analysis.xIntercepts.length) {
    rows.push({
      label: "x-თან გადაკვეთა",
      valueLatex: analysis.xIntercepts
        .map((r) => `(${r.exact},\\; 0)`)
        .join(",\\; "),
    });
  } else if (classification === "two-complex") {
    rows.push({
      label: "x-თან გადაკვეთა",
      valueLatex: "არ არის (კომპლექსური ფესვები)",
    });
  }

  rows.push({
    label: "მიმართულება",
    valueLatex:
      analysis.direction === "up" ? "ზემოთ ($a > 0$)" : "ქვემოთ ($a < 0$)",
  });

  rows.push({
    label: "განსაზღვრის არე",
    valueLatex: analysis.domain,
  });

  rows.push({
    label: "მნიშვნელობათა არე",
    valueLatex: analysis.range,
  });

  rows.push({
    label: "მონოტონურობა",
    valueLatex: analysis.monotonicity,
  });

  rows.push({
    label: "შემოწმება",
    valueLatex: sol.verified ? "გავლილია (რაციონალური ფესვები)" : "ანალიტიკური",
  });

  return rows;
}

function classificationLabel(c: string): string {
  switch (c) {
    case 'two-real-distinct':
      return 'ორი განსხვავებული ნამდვილი ფესვი';
    case 'one-real-double':
      return 'ერთი ორმაგი ნამდვილი ფესვი';
    case 'two-complex':
      return 'ორი კომპლექსური შეუღლებული ფესვი';
    case 'linear':
      return 'წრფივი განტოლება';
    case 'identity':
      return 'იდენტობა (ყველა x ამონახსნია)';
    case 'inconsistent':
      return 'წინააღმდეგობრივი (ამონახსნი არ აქვს)';
    default:
      return c;
  }
}

/** მონაცემები გრაფიკისთვის (რიცხვითი) */
export function graphData(sol: QuadraticSolution): {
  a: number;
  b: number;
  c: number;
  vertex: { x: number; y: number };
  roots: number[];
  yIntercept: number;
  direction: "up" | "down";
} {
  const { a, b, c } = sol.equation;
  const toN = (r: { n: number; d: number }) => Number(r.n) / Number(r.d);
  const rootsNum = sol.roots
    .filter((r) => r.kind === "rational" && r.value)
    .map((r) => toN(r.value!));
  // For radical roots we could approximate, but keep simple for now
  return {
    a: toN(a),
    b: toN(b),
    c: toN(c),
    vertex: {
      x: toN(sol.analysis.vertex.x.value ?? { n: 0, d: 1 }),
      y: toN(sol.analysis.vertex.y.value ?? { n: 0, d: 1 }),
    },
    roots: rootsNum,
    yIntercept: toN(c),
    direction: sol.analysis.direction,
  };
}
