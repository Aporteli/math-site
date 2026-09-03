import type { ExactRoot, Rational } from '../types/quadratic';
import { toDecimal, toFraction } from '../core/rational';

export function formatRationalMath(x: Rational): string {
  return toFraction(x);
}

export function formatDecimal(x: Rational, digits = 10): string {
  return toDecimal(x, digits);
}

export function formatRoot(root: ExactRoot): { exact: string; decimal?: string } {
  return { exact: root.exact, decimal: root.decimal };
}

export function rootsToLatex(roots: ExactRoot[], variable = 'x'): string {
  if (!roots.length) return `${variable} \\in \\emptyset`;
  return roots.map((r, i) => `${variable}_{${i + 1}} = ${r.exact}`).join(',\\quad ');
}
